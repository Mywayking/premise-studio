'use client';

import { useCallback, useRef, useState } from 'react';

interface UseStreamingOptions {
  onChunk?: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: string) => void;
}

interface UseStreamingReturn {
  isStreaming: boolean;
  error: string | null;
  startStream: (url: string, body: Record<string, unknown>) => void;
  abort: () => void;
}

export function useStreaming(options: UseStreamingOptions = {}): UseStreamingReturn {
  const { onChunk, onComplete, onError } = options;
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const startStream = useCallback(
    (url: string, body: Record<string, unknown>) => {
      // Abort any existing stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setIsStreaming(true);
      setError(null);

      const controller = new AbortController();
      abortControllerRef.current = controller;

      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const err = await response.text();
            throw new Error(err || '请求失败');
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('无法读取响应流');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  setIsStreaming(false);
                  onComplete?.();
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.error) {
                    setError(parsed.error);
                    setIsStreaming(false);
                    onError?.(parsed.error);
                    return;
                  }
                  if (parsed.content) {
                    onChunk?.(parsed.content);
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }

          setIsStreaming(false);
          onComplete?.();
        })
        .catch((err) => {
          if (err.name === 'AbortError') {
            setIsStreaming(false);
            return;
          }
          setError(err.message || '未知错误');
          setIsStreaming(false);
          onError?.(err.message || '未知错误');
        });
    },
    [onChunk, onComplete, onError]
  );

  const abort = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  return { isStreaming, error, startStream, abort };
}
