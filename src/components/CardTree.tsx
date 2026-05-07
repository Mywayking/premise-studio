'use client';
import { useState, useRef, useEffect } from 'react';
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

function CardMenu({ card, onClose }: { card: Card; onClose: () => void }) {
  const [mode, setMode] = useState<'menu' | 'rename' | 'confirm-delete'>('menu');
  const [nameInput, setNameInput] = useState(card.content.slice(0, 40));
  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const updateCard = useCardTreeStore((s) => s.updateCard);
  const deleteCard = useCardTreeStore((s) => s.deleteCard);
  const getChildren = useCardTreeStore((s) => s.getChildren);
  const childCount = getChildren(card.id).length;

  useEffect(() => {
    if (mode === 'rename') {
      setNameInput(card.content.slice(0, 60));
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [mode]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose();
    };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const commitRename = () => {
    if (nameInput.trim()) {
      const restContent = card.content.slice(60);
      updateCard(card.id, { content: nameInput.trim() + (restContent ? restContent : '') });
    }
    onClose();
  };

  const handleDelete = () => {
    deleteCard(card.id);
    onClose();
  };

  if (mode === 'confirm-delete') {
    return (
      <div ref={menuRef} className="absolute right-0 top-full mt-1 z-50 bg-white border border-paper-dark rounded-lg shadow-lg p-3 w-56" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs text-ink-muted mb-2">确定删除这张卡片？</p>
        {childCount > 0 && <p className="text-xs text-error-text mb-2">将同时删除 {childCount} 张子卡片</p>}
        <div className="flex gap-2 justify-end">
          <button onClick={() => setMode('menu')} className="px-3 py-1 text-xs text-ink-muted hover:text-ink rounded transition-colors">取消</button>
          <button onClick={handleDelete} className="px-3 py-1 text-xs bg-error-text text-white rounded hover:opacity-90 transition-opacity">删除</button>
        </div>
      </div>
    );
  }

  if (mode === 'rename') {
    return (
      <div ref={menuRef} className="absolute right-0 top-full mt-1 z-50 bg-white border border-paper-dark rounded-lg shadow-lg p-2 w-56" onClick={(e) => e.stopPropagation()}>
        <input ref={inputRef} className="w-full text-xs bg-transparent border border-accent rounded px-2 py-1 outline-none"
          value={nameInput} onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') onClose(); }}
          onBlur={commitRename} />
      </div>
    );
  }

  return (
    <div ref={menuRef} className="absolute right-0 top-full mt-1 z-50 bg-white border border-paper-dark rounded-lg shadow-lg py-1 min-w-[100px]" onClick={(e) => e.stopPropagation()}>
      <button onClick={() => setMode('rename')} className="w-full text-left px-3 py-1.5 text-xs text-ink-secondary hover:bg-hover-bg transition-colors">重命名</button>
      <button onClick={() => setMode('confirm-delete')} className="w-full text-left px-3 py-1.5 text-xs text-error-text hover:bg-hover-bg transition-colors">删除</button>
    </div>
  );
}

function TreeNode({ card, depth = 0 }: { card: Card; depth?: number }) {
  const currentNodeId = useCardTreeStore((s) => s.currentNodeId);
  const setCurrentNode = useCardTreeStore((s) => s.setCurrentNode);
  const getChildren = useCardTreeStore((s) => s.getChildren);
  const children = getChildren(card.id);
  const isSelected = card.id === currentNodeId;
  const isDraftOrRewrite = card.type === 'draft' || card.type === 'rewrite';
  const perfCount = card.performances.length;
  const lastResult = card.performances[card.performances.length - 1]?.result;
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div>
      <div className="relative group">
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
            <button onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
              className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-paper-dark transition-all flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-ink-muted"><circle cx="3" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="9" cy="6" r="1.2"/></svg>
            </button>
          </div>
        </button>
        {menuOpen && <CardMenu card={card} onClose={() => setMenuOpen(false)} />}
      </div>
      {children.map((child) => <TreeNode key={child.id} card={child} depth={depth + 1} />)}
    </div>
  );
}

export function CardTree() {
  const cards = useCardTreeStore((s) => s.cards);
  return <div className="space-y-0.5">{Object.values(cards).filter((c) => c.parentId === null).map((c) => <TreeNode key={c.id} card={c} />)}</div>;
}
