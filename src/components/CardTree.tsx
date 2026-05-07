'use client';
import { useCardTreeStore } from '@/store/cardTreeStore';
import type { Card, CardTier } from '@/types';

const TYPE_LABELS: Record<string, string> = {
  material: '素材', premise: '前提', angle: '角度', draft: '草稿', rewrite: '改稿',
};
const TIER_COLORS: Record<CardTier, string> = {
  A: 'bg-tier-a', B: 'bg-tier-b', experimental: 'bg-tier-experimental', abandoned: 'bg-tier-abandoned', saver: 'bg-tier-saver',
};
const TIER_LABELS: Record<CardTier, string> = {
  A: 'A', B: 'B', experimental: '试验', abandoned: '废弃', saver: '救场',
};

function TreeNode({ card, depth = 0 }: { card: Card; depth?: number }) {
  const currentNodeId = useCardTreeStore((s) => s.currentNodeId);
  const setCurrentNode = useCardTreeStore((s) => s.setCurrentNode);
  const getChildren = useCardTreeStore((s) => s.getChildren);
  const children = getChildren(card.id);
  const isSelected = card.id === currentNodeId;
  const isDraftOrRewrite = card.type === 'draft' || card.type === 'rewrite';
  const perfCount = card.performances.length;
  const lastResult = card.performances[card.performances.length - 1]?.result;

  return (
    <div>
      <button onClick={() => setCurrentNode(card.id)}
        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${isSelected ? 'bg-active-bg border-l-2 border-accent' : 'hover:bg-hover-bg border-l-2 border-transparent'}`}
        style={{ marginLeft: depth * 16 }}>
        <div className="flex items-center gap-2">
          <span className="text-xs opacity-60">{TYPE_LABELS[card.type]}</span>
          {isDraftOrRewrite && card.tier && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full text-white font-medium ${TIER_COLORS[card.tier]}`}>{TIER_LABELS[card.tier]}</span>
          )}
          <span className="text-ink-secondary truncate flex-1">{card.content.slice(0, 40) || '空'}</span>
          {isDraftOrRewrite && (
            <span className="text-[10px] text-ink-muted flex items-center gap-0.5 flex-shrink-0">
              {perfCount > 0 ? (
                Array.from({ length: Math.min(perfCount, 3) }).map((_, i) => (
                  <span key={i} className={i === perfCount - 1 && lastResult === 'killed' ? 'text-green-600' : i === perfCount - 1 && lastResult === 'bombed' ? 'text-red-500' : 'text-ink-muted'}>●</span>
                ))
              ) : <span className="text-disabled">○</span>}
            </span>
          )}
          {card.status === 'streaming' && <span className="w-2 h-2 rounded-full bg-accent animate-pulse flex-shrink-0" />}
        </div>
      </button>
      {children.map((child) => <TreeNode key={child.id} card={child} depth={depth + 1} />)}
    </div>
  );
}

export function CardTree() {
  const cards = useCardTreeStore((s) => s.cards);
  return <div className="space-y-0.5">{Object.values(cards).filter((c) => c.parentId === null).map((c) => <TreeNode key={c.id} card={c} />)}</div>;
}
