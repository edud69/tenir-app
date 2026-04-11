import { createServerSupabaseClient } from '@/lib/supabase/server';

const FISCAL_SYSTEM_PROMPT = `Tu es un conseiller fiscal spécialisé pour les sociétés de portefeuille privées sous contrôle canadien (SPCC) au Québec.

Tu dois analyser le dossier fiscal complet de l'entreprise fourni et produire des recommandations concrètes, priorisées et actionnables.

## Données du dossier
{COMPANY_DATA_JSON}

## Format de réponse requis

Réponds TOUJOURS en JSON structuré ainsi :
{
  "analysis_summary": "Résumé en 2-3 phrases de la situation fiscale actuelle",
  "immediate_recommendations": [
    {
      "priority": "critical|high|medium",
      "title": "Titre court (max 60 chars)",
      "description": "Explication claire de l'action à prendre",
      "rationale": "Pourquoi c'est important maintenant",
      "estimated_impact": "Impact fiscal estimé (ex: économie de ~8,500$ en impôt)",
      "deadline": "Échéance si applicable (ex: avant le 31 mars 2025)",
      "references": ["Réf légale/fiscale si pertinent, ex: Art. 125 LIR"]
    }
  ],
  "longterm_strategy": [
    {
      "horizon": "12 months|24 months|36+ months",
      "title": "Titre de la stratégie",
      "description": "Description de la stratégie à long terme",
      "rationale": "Pourquoi cette stratégie sur cet horizon",
      "estimated_impact": "Impact estimé",
      "prerequisites": ["Conditions préalables si applicable"]
    }
  ],
  "risks_identified": [
    {
      "severity": "high|medium|low",
      "risk": "Description du risque fiscal identifié",
      "mitigation": "Comment le mitiguer"
    }
  ],
  "language": "fr|en"
}

## Règles importantes
- Détecte la langue préférée de l'utilisateur et réponds dans cette langue (français ou anglais)
- Sois spécifique aux règles fiscales québécoises et fédérales canadiennes en vigueur en 2024-2025
- Taux d'inclusion des gains en capital : 2/3 (66,67%) pour les montants dépassant 250 000$ depuis le 25 juin 2024
- Taux SBD fédéral : 9% sur les premiers 500 000$ de revenus d'entreprise active
- Taux général fédéral : 15%, Québec : 11,5% (déduction PME jusqu'à 500 000$)
- Toujours mentionner l'impact en dollars estimés quand possible
- Si les données sont insuffisantes pour une recommandation, indique-le clairement
- Ne donne pas de conseils sans base légale/fiscale solide`;

// Simple in-memory rate limit (resets on cold start — use Redis/KV in production)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_MAX = 3;
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour

function checkRateLimit(orgId: string): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(orgId);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(orgId, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT_MAX) return false;
  entry.count++;
  return true;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (!user || authError) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { organization_id, locale = 'fr' } = body as { organization_id: string; locale?: string };

    if (!organization_id) {
      return new Response(JSON.stringify({ error: 'organization_id is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify user membership in organization (RLS enforcement)
    const { data: membership, error: membershipError } = await supabase
      .from('organization_members')
      .select('id')
      .eq('organization_id', organization_id)
      .eq('user_id', user.id)
      .single();

    if (membershipError || !membership) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Rate limiting
    if (!checkRateLimit(organization_id)) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded. Maximum 3 analyses per hour.' }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Collect complete company dossier
    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    const [orgResult, taxProfilesResult, transactionsResult, investmentsResult, formsResult, paymentsResult] =
      await Promise.all([
        supabase.from('organizations').select('*').eq('id', organization_id).single(),
        supabase.from('tax_profiles').select('*').eq('organization_id', organization_id).order('tax_year', { ascending: false }).limit(3),
        supabase.from('transactions').select('id, type, amount, currency, date, description, category, gst_amount, qst_amount').eq('organization_id', organization_id).gte('date', oneYearAgo),
        supabase.from('investments').select('*').eq('organization_id', organization_id),
        supabase.from('government_forms').select('id, form_type, tax_year, status, submitted_at, notes').eq('organization_id', organization_id).order('created_at', { ascending: false }).limit(5),
        (supabase as any).from('tax_payments').select('*').eq('organization_id', organization_id).order('due_date', { ascending: false }).limit(10),
      ]);

    const companyData = {
      organization: orgResult.data,
      tax_profiles: taxProfilesResult.data ?? [],
      transactions_last_12_months: transactionsResult.data ?? [],
      investments: investmentsResult.data ?? [],
      government_forms: formsResult.data ?? [],
      tax_payments: paymentsResult.data ?? [],
      analysis_date: new Date().toISOString(),
      requested_language: locale,
    };

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const systemPrompt = FISCAL_SYSTEM_PROMPT.replace(
      '{COMPANY_DATA_JSON}',
      JSON.stringify(companyData, null, 2)
    );

    const agentId = process.env.ANTHROPIC_AGENT_ID;
    const environmentId = process.env.ANTHROPIC_ENVIRONMENT_ID;

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          let anthropicRes: Response;

          if (agentId && environmentId) {
            // Sessions API (Managed Agents beta)
            anthropicRes = await fetch('https://api.anthropic.com/v1/sessions', {
              method: 'POST',
              headers: {
                'X-Api-Key': apiKey,
                'anthropic-version': '2023-06-01',
                'anthropic-beta': 'managed-agents-2026-04-01',
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                agent_id: agentId,
                environment_id: environmentId,
                system: systemPrompt,
                messages: [
                  {
                    role: 'user',
                    content: locale === 'en'
                      ? 'Analyze this company\'s complete tax dossier and provide structured JSON recommendations.'
                      : 'Analyse le dossier fiscal complet de cette société et fournis tes recommandations en JSON structuré.',
                  },
                ],
                stream: true,
              }),
            });
          } else {
            // Fallback: standard Messages API with streaming
            anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
              },
              body: JSON.stringify({
                model: 'claude-sonnet-4-20250514',
                system: systemPrompt,
                messages: [
                  {
                    role: 'user',
                    content: locale === 'en'
                      ? 'Analyze this company\'s complete tax dossier and provide structured JSON recommendations.'
                      : 'Analyse le dossier fiscal complet de cette société et fournis tes recommandations en JSON structuré.',
                  },
                ],
                max_tokens: 4096,
                stream: true,
              }),
            });
          }

          if (!anthropicRes.ok) {
            const errText = await anthropicRes.text();
            console.error('Anthropic API error:', errText);
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'AI service error' })}\n\n`)
            );
            controller.close();
            return;
          }

          const reader = anthropicRes.body!.getReader();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue;
              const data = line.slice(6).trim();
              if (!data || data === '[DONE]') continue;
              try {
                const event = JSON.parse(data);
                if (event.type === 'content_block_delta' && event.delta?.text) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
                  );
                }
              } catch {
                // skip malformed events
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
          console.error('Streaming error:', err);
          controller.error(err);
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Error in fiscal-advisor API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
