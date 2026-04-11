'use client';

import { useState } from 'react';
import type { FiscalAnalysisResult } from '@/types/fiscal-advisor';

export type FiscalAdvisorStatus = 'idle' | 'loading' | 'streaming' | 'complete' | 'error';

export function useFiscalAdvisor() {
  const [status, setStatus] = useState<FiscalAdvisorStatus>('idle');
  const [streamedContent, setStreamedContent] = useState('');
  const [parsedResult, setParsedResult] = useState<FiscalAnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const analyze = async (organizationId: string, locale: string = 'fr') => {
    setStatus('loading');
    setStreamedContent('');
    setParsedResult(null);
    setError(null);

    try {
      const response = await fetch('/api/ai/fiscal-advisor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ organization_id: organizationId, locale }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error || `Request failed: ${response.status}`);
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      setStatus('streaming');

      let fullContent = '';
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
          if (data === '[DONE]') continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) {
              throw new Error(parsed.error);
            }
            if (parsed.text) {
              fullContent += parsed.text;
              setStreamedContent(fullContent);
            }
          } catch (parseErr) {
            if (parseErr instanceof Error && parseErr.message !== 'Unexpected token') {
              throw parseErr;
            }
          }
        }
      }

      // Extract and parse JSON from streamed content
      try {
        const result = JSON.parse(fullContent) as FiscalAnalysisResult;
        setParsedResult(result);
        setStatus('complete');
      } catch {
        // Try to extract JSON block from surrounding text
        const jsonMatch = fullContent.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const result = JSON.parse(jsonMatch[0]) as FiscalAnalysisResult;
            setParsedResult(result);
            setStatus('complete');
          } catch {
            setError('Impossible d\'analyser les résultats. Veuillez réessayer.');
            setStatus('error');
          }
        } else {
          setError('Impossible d\'analyser les résultats. Veuillez réessayer.');
          setStatus('error');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Une erreur inattendue est survenue.');
      setStatus('error');
    }
  };

  const reset = () => {
    setStatus('idle');
    setStreamedContent('');
    setParsedResult(null);
    setError(null);
  };

  return { status, streamedContent, parsedResult, error, analyze, reset };
}
