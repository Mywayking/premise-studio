import { DEEPSEEK_API_KEY, DEEPSEEK_MODEL, AI_TIMEOUT_MS } from './env';

export function createDeepSeekStream(prompt: string, systemPrompt?: string): ReadableStream {
  const encoder = new TextEncoder();
  return new ReadableStream({
    async start(ctrl) {
      try {
        const messages: { role: string; content: string }[] = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });

        const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${DEEPSEEK_API_KEY}` },
          body: JSON.stringify({ model: DEEPSEEK_MODEL, messages, stream: true, temperature: 0.85, max_tokens: 2048 }),
          signal: AbortSignal.timeout(AI_TIMEOUT_MS),
        });
        if (!res.ok) {
          const code = res.status >= 500 ? 'UNAVAILABLE' : 'INVALID';
          ctrl.enqueue(encoder.encode(`data: {"type":"error","code":"${code}","message":"AI API: ${res.status}"}\n\n`));
          ctrl.close(); return;
        }
        const reader = res.body?.getReader();
        if (!reader) { ctrl.close(); return; }
        const decoder = new TextDecoder(); let buf = '';
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n'); buf = lines.pop() || '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const d = line.slice(6); if (d === '[DONE]') continue;
            try {
              const p = JSON.parse(d);
              const c = p.choices?.[0]?.delta?.content;
              if (c) ctrl.enqueue(encoder.encode(`data: {"type":"token","content":${JSON.stringify(c)}}\n\n`));
            } catch {}
          }
        }
        ctrl.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
        ctrl.close();
      } catch (err: unknown) {
        const message = err instanceof Error
          ? err.message.replace(/[\r\n]+/g, ' ').slice(0, 200)
          : 'Unknown error';
        const safe = JSON.stringify({ type: 'error', code: 'UNAVAILABLE', message });
        ctrl.enqueue(encoder.encode(`data: ${safe}\n\n`));
        ctrl.close();
      }
    },
  });
}

export function sseResponse(stream: ReadableStream): Response {
  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' },
  });
}
