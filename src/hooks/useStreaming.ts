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

interface PremiseItem { statement: string; attitude: string; conflict: string; potential: string; }
interface AngleItem { type: string; description: string; opening: string; direction: string; }

function getChildType(parentType: string, actionKey: string): CardType {
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

function formatPremiseContent(p: PremiseItem): string {
  return `前提：${p.statement || ''}\n态度：${p.attitude || ''}\n冲突：${p.conflict || ''}\n潜力：${p.potential || ''}`;
}

function formatAngleContent(a: AngleItem): string {
  return `角度类型：${a.type || ''}\n描述：${a.description || ''}\n开场：${a.opening || ''}\n方向：${a.direction || ''}`;
}

interface ParsedPremiseResponse { premises?: PremiseItem[]; }
interface ParsedAngleResponse { angles?: AngleItem[]; }

function handleStreamResult(
  childType: CardType, parentId: string, full: string,
  createCard: ReturnType<typeof useCardTreeStore.getState>['createCard'],
  appendChildFn: ReturnType<typeof useCardTreeStore.getState>['appendChild'],
  branchNode: ReturnType<typeof useCardTreeStore.getState>['branchNode'],
) {
  if (childType === 'premise' || childType === 'angle') {
    try {
      const parsed = JSON.parse(full);
      if (childType === 'premise' && Array.isArray(parsed.premises) && parsed.premises.length > 0) {
        (parsed as ParsedPremiseResponse).premises!.forEach((p, i) => {
          const card = createCard(childType, parentId, formatPremiseContent(p));
          if (i === 0) appendChildFn(parentId, card); else branchNode(parentId, card);
        });
        return;
      }
      if (childType === 'angle' && Array.isArray(parsed.angles) && parsed.angles.length > 0) {
        (parsed as ParsedAngleResponse).angles!.forEach((a, i) => {
          const card = createCard(childType, parentId, formatAngleContent(a));
          if (i === 0) appendChildFn(parentId, card); else branchNode(parentId, card);
        });
        return;
      }
    } catch { /* JSON parse failed, fall through to raw text */ }
  }
  const child = createCard(childType, parentId, full);
  appendChildFn(parentId, child);
}

export function useStreaming() {
  const start = useStreamingStore((s) => s.startStreaming);
  const append = useStreamingStore((s) => s.appendToken);
  const done = useStreamingStore((s) => s.complete);
  const to = useStreamingStore((s) => s.timeout);
  const err = useStreamingStore((s) => s.setError);
  const abort = useStreamingStore((s) => s.abort);

  const updateCard = useCardTreeStore((s) => s.updateCard);
  const createCard = useCardTreeStore((s) => s.createCard);
  const appendChild = useCardTreeStore((s) => s.appendChild);
  const currentId = useCardTreeStore((s) => s.currentNodeId);
  const cards = useCardTreeStore((s) => s.cards);

  const triggerAction = useCallback(async (actionKey: string, sessionId: string) => {
    if (useStreamingStore.getState().state === 'streaming' || !currentId) return;
    const currentCard = cards[currentId];
    if (!currentCard) return;

    const endpoint = resolveEndpoint(currentCard.type, actionKey);
    const original = currentCard.content;
    const ctrl = start();
    updateCard(currentId, { status: 'streaming' });

    const tid = setTimeout(() => {
      to();
      const buffer = useStreamingStore.getState().buffer;
      if (buffer) {
        const childType = getChildType(currentCard.type, actionKey);
        const st = useCardTreeStore.getState();
        const child = st.createCard(childType, currentId, buffer);
        st.appendChild(currentId, child);
      }
      updateCard(currentId, { status: 'error' });
    }, 60000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardId: currentId, sessionId, action: actionKey, content: original }),
        signal: ctrl.signal,
      });
      if (!res.ok) {
        err(res.status >= 500 ? 'UNAVAILABLE' : 'INVALID', 'AI 服务异常');
        clearTimeout(tid);
        updateCard(currentId, { status: 'error' });
        return;
      }
      const reader = res.body?.getReader();
      if (!reader) {
        err('INVALID', '无法读取响应');
        clearTimeout(tid);
        updateCard(currentId, { status: 'error' });
        return;
      }
      const decoder = new TextDecoder();
      let full = '';
      let lineBuf = '';
      while (true) {
        const { done: d, value } = await reader.read();
        if (d) break;
        lineBuf += decoder.decode(value, { stream: true });
        const lines = lineBuf.split('\n');
        lineBuf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const p = JSON.parse(line.slice(6));
            if (p.type === 'token' && p.content) {
              full += p.content;
              append(p.content);
            } else if (p.type === 'done') {
              clearTimeout(tid);
              done();
              const st = useCardTreeStore.getState();
              handleStreamResult(
                getChildType(currentCard.type, actionKey), currentId, full,
                st.createCard, st.appendChild, st.branchNode,
              );
              return;
            } else if (p.type === 'error') {
              clearTimeout(tid);
              err(p.code || 'INVALID', p.message || '未知错误');
              updateCard(currentId, { content: original, status: 'error' });
              return;
            }
          } catch { /* skip malformed SSE lines */ }
        }
      }
      clearTimeout(tid);
      done();
      const st = useCardTreeStore.getState();
      handleStreamResult(
        getChildType(currentCard.type, actionKey), currentId, full,
        st.createCard, st.appendChild, st.branchNode,
      );
    } catch (e: unknown) {
      clearTimeout(tid);
      if (e instanceof DOMException && e.name === 'AbortError') {
        abort();
        const buffer = useStreamingStore.getState().buffer;
        updateCard(currentId, { content: original + buffer, status: 'idle' });
        return;
      }
      err('UNAVAILABLE', '网络连接中断');
      const buffer = useStreamingStore.getState().buffer;
      updateCard(currentId, { content: original + buffer, status: 'error' });
    }
  }, [currentId, cards, start, append, done, to, err, abort, updateCard, createCard, appendChild]);

  const cancel = useStreamingStore((s) => s.abort);
  const streamingState = useStreamingStore((s) => s.state);
  return { triggerAction, cancel, streamingState };
}
