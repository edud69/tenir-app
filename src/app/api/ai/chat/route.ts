const SYSTEM_PROMPT = `You are the tenir.app AI assistant, helping small holding company owners in Quebec/Canada with accounting, tax planning, and bookkeeping.

You are knowledgeable about:
- Canadian and Quebec corporate tax law
- CCPC (Canadian-Controlled Private Corporation) rules
- Small business deduction and rates
- RDTOH (Refundable Dividend Tax On Hand / IMRTD in French)
- GRIP (General Rate Income Pool / CDC des gains en capital)
- CDA (Capital Dividend Account / CDC)
- Capital gains inclusion rates (2/3 as of June 2024 for amounts over $250k)
- Dividend taxation and strategies
- Tax installments and planning

Always be helpful and provide accurate information about tax and accounting matters. However, remind users to consult a CPA or professional accountant for specific tax advice tailored to their situation.

Respond in the same language the user writes in (French or English). If the user writes in French, respond in French. If in English, respond in English.

Keep responses concise and practical. Use examples when helpful. Format lists and calculations clearly.`;

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface RequestBody {
  messages: Message[];
  organizationId?: string;
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const { messages } = body;

    if (!messages || messages.length === 0) {
      return new Response('Messages are required', { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        system: SYSTEM_PROMPT,
        messages: messages.map((msg) => ({ role: msg.role, content: msg.content })),
        max_tokens: 1024,
        stream: true,
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      console.error('Anthropic API error:', errText);
      return new Response(JSON.stringify({ error: 'AI service error' }), {
        status: 502,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Pipe the SSE stream, extracting text deltas
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const reader = anthropicRes.body!.getReader();

    const readableStream = new ReadableStream({
      async start(controller) {
        let buffer = '';
        try {
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
                // skip
              }
            }
          }
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (err) {
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
    console.error('Error in chat API:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
