'use client';
import { useCallback } from 'react';
import { useStreamingStore } from '@/store/streamingStore';
import { useCardTreeStore } from '@/store/cardTreeStore';
import type { CardType } from '@/types';

const ENDPOINT_MAP: Record<string, string> = {
  'extract-premises': '/api/workflow/premise', 'find-angles': '/api/workflow/angle',
  'generate-draft': '/api/workflow/draft', 'rewrite': '/api/workflow/rewrite',
  'extract-emotions': '/api/workflow/input-understanding', 'extract-conflicts': '/api/workflow/input-understanding',
  'extract-characters': '/api/workflow/input-understanding',
  'sharpen': '/api/workflow/premise', 'absurdify': '/api/workflow/premise', 'ground': '/api/workflow/premise',
  'deconstruct': '/api/workflow/premise',
  'add-detail': '/api/workflow/angle', 'amplify-emotion': '/api/workflow/angle',
  'restructure': '/api/workflow/angle', 'reverse': '/api/workflow/angle',
  'shorten': '/api/workflow/draft', 'callback': '/api/workflow/draft',
  'colloquial': '/api/workflow/draft', 'enhance-punch': '/api/workflow/draft',
  'generate-tag': '/api/workflow/draft', 'topper': '/api/workflow/draft',
  're-rewrite': '/api/workflow/rewrite', 'branch': '/api/workflow/rewrite',
  'performance-script': '/api/workflow/rewrite', 'compare': '/api/workflow/rewrite',
};

function getChildType(parentType: string, action: string): CardType {
  if (parentType === 'material') return 'premise';
  if (parentType === 'premise') return 'angle';
  if (parentType === 'angle') return 'draft';
  if (parentType === 'draft') return 'rewrite';
  return 'rewrite';
}

function resolveEndpoint(cardType: string, actionKey: string): string {
  if (cardType === 'material' && actionKey === 'extract-premises') return '/api/workflow/premise';
  if (cardType === 'material') return '/api/workflow/input-understanding';
  if (cardType === 'premise' && actionKey === 'find-angles') return '/api/workflow/angle';
  if (cardType === 'angle' && actionKey === 'generate-draft') return '/api/workflow/draft';
  if ((cardType === 'draft' || cardType === 'rewrite') && actionKey === 'rewrite') return '/api/workflow/rewrite';
  return ENDPOINT_MAP[actionKey] || `/api/workflow/${cardType}`;
}

export function useStreaming() {
  const start = useStreamingStore((s) => s.startStreaming);
  const append = useStreamingStore((s) => s.appendToken);
  const done = useStreamingStore((s) => s.complete);
  const to = useStreamingStore((s) => s.timeout);
  const err = useStreamingStore((s) => s.setError);
  const abort = useStreamingStore((s) => s.abort);
  const st = useStreamingStore((s) => s.state);

  const updateCard = useCardTreeStore((s) => s.updateCard);
  const createCard = useCardTreeStore((s) => s.createCard);
  const appendChild = useCardTreeStore((s) => s.appendChild);
  const currentId = useCardTreeStore((s) => s.currentNodeId);
  const cards = useCardTreeStore((s) => s.cards);

  const triggerAction = useCallback(async (actionKey: string, sessionId: string) => {
    if (st === 'streaming' || !currentId) return;
    const currentCard = cards[currentId];
    if (!currentCard) return;

    const endpoint = resolveEndpoint(currentCard.type, actionKey);
    const original = currentCard.content;
    const ctrl = start();
    updateCard(currentId, { status: 'streaming' });

    const tid = setTimeout(() => { to(); updateCard(currentId, { content: original + useStreamingStore.getState().buffer, status: 'error' }); }, 60000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: currentId, sessionId, action: actionKey, content: original }),
        signal: ctrl.signal,
      });
      if (!res.ok) { err(res.status >= 500 ? 'UNAVAILABLE' : 'INVALID', 'AI 服务异常'); clearTimeout(tid); updateCard(currentId, { status: 'error' }); return; }
      const reader = res.body?.getReader();
      if (!reader) { err('INVALID', '无法读取响应'); clearTimeout(tid); updateCard(currentId, { status: 'error' }); return; }
      const decoder = new TextDecoder(); let full = '';
      while (true) {
        const { done: d, value } = await reader.read();
        if (d) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split('\n')) {
          if (!line.startsWith('data: ')) continue;
          try {
            const p = JSON.parse(line.slice(6));
            if (p.type === 'token' && p.content) { full += p.content; append(p.content); }
            else if (p.type === 'done') {
              clearTimeout(tid); done();
              const child = createCard(getChildType(currentCard.type, actionKey), currentId, full);
              appendChild(currentId, child);
              return;
            } else if (p.type === 'error') { clearTimeout(tid); err(p.code || 'INVALID', p.message || '未知错误'); updateCard(currentId, { content: original, status: 'error' }); return; }
          } catch {}
        }
      }
      clearTimeout(tid); done();
      const child = createCard(getChildType(currentCard.type, actionKey), currentId, full);
      appendChild(currentId, child);
    } catch (e: any) {
      clearTimeout(tid);
      if (e.name === 'AbortError') { abort(); updateCard(currentId, { content: original + useStreamingStore.getState().buffer, status: 'idle' }); return; }
      err('UNAVAILABLE', '网络连接中断');
      updateCard(currentId, { content: original + useStreamingStore.getState().buffer, status: 'error' });
    }
  }, [st, currentId, cards, start, append, done, to, err, abort, updateCard, createCard, appendChild]);

  return { triggerAction, cancel: abort, streamingState: st };
}
