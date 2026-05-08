'use client';
import { useState, useEffect } from 'react';
import { useCardTreeStore } from '@/store/cardTreeStore';
import { useSessionStore } from '@/store/sessionStore';
import { useStreamingStore } from '@/store/streamingStore';
import { useStreaming } from '@/hooks/useStreaming';

const ACTIONS: Record<string, { key: string; label: string; primary?: boolean }[]> = {
  material: [
    { key: 'extract-premises', label: '提炼前提', primary: true },
    { key: 'extract-emotions', label: '提取情绪' },
    { key: 'extract-conflicts', label: '提取冲突' },
    { key: 'extract-characters', label: '提取人物' },
  ],
  premise: [
    { key: 'find-angles', label: '找角度', primary: true },
    { key: 'sharpen', label: '加强攻击性' }, { key: 'absurdify', label: '更荒诞' },
    { key: 'ground', label: '更真实' }, { key: 'deconstruct', label: '拆解前提' },
  ],
  angle: [
    { key: 'generate-draft', label: '生成草稿', primary: true },
    { key: 'add-detail', label: '增加细节' }, { key: 'amplify-emotion', label: '增强情绪' },
    { key: 'restructure', label: '换结构' }, { key: 'reverse', label: '反向角度' },
  ],
  draft: [
    { key: 'rewrite', label: '改稿', primary: true },
    { key: 'shorten', label: '缩短' }, { key: 'callback', label: 'Callback' },
    { key: 'colloquial', label: '更口语化' }, { key: 'enhance-punch', label: '增强 Punch' },
    { key: 'generate-tag', label: '生成 Tag' }, { key: 'topper', label: '翻 Topper' },
  ],
  rewrite: [
    { key: 're-rewrite', label: '再改稿', primary: true },
    { key: 'branch', label: '分支创作' }, { key: 'performance-script', label: '演出稿' },
    { key: 'compare', label: '比较版本' },
  ],
};

export function ActionPanel() {
  const currentNode = useCardTreeStore((s) => s.getCurrentNode());
  const streamingState = useStreamingStore((s) => s.state);
  const { triggerAction, cancel } = useStreaming();

  const [activeAction, setActiveAction] = useState<string | null>(null);

  // Clear active action when streaming ends
  useEffect(() => {
    if (streamingState !== 'streaming') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveAction(null);
    }
  }, [streamingState]);

  if (!currentNode) return <p className="text-sm text-ink-muted py-4">在左侧点击一个 card 查看可用的 AI Action</p>;

  const actions = ACTIONS[currentNode.type] || [];
  const isStreaming = streamingState === 'streaming';
  const hasLineAnnotations = (currentNode.type === 'draft' || currentNode.type === 'rewrite') && currentNode.lineAnnotations && Object.keys(currentNode.lineAnnotations).length > 0;

  return (
    <div className="space-y-2">
      <div className="text-xs text-ink-muted mb-3">当前: {currentNode.type === 'material' ? '素材' : currentNode.type === 'premise' ? '前提' : currentNode.type === 'angle' ? '角度' : currentNode.type === 'draft' ? '草稿' : '改稿'}</div>
      {actions.map((action) => {
        const needsLine = action.key === 'generate-tag' || action.key === 'topper';
        const disabled = isStreaming || (needsLine && !hasLineAnnotations);
        const isActive = isStreaming && action.key === activeAction;
        return (
          <button key={action.key} onClick={() => { const s = useSessionStore.getState().getCurrentSession(); if (s && !disabled) { setActiveAction(action.key); triggerAction(action.key, s.id); } }}
            disabled={disabled}
            className={`w-full text-left px-4 py-2.5 rounded-lg text-sm transition-colors flex items-center gap-2 ${action.primary ? 'bg-accent text-white hover:opacity-90 font-medium' : 'bg-white border border-paper-dark text-ink-secondary hover:bg-hover-bg'} disabled:opacity-40 disabled:cursor-not-allowed`}
            title={needsLine && !hasLineAnnotations ? '需要先在编辑器中标记行类型' : undefined}>
            {isActive && <span className="w-3.5 h-3.5 rounded-full border-2 border-white border-t-transparent animate-spin flex-shrink-0" />}
            <span>{isActive ? '生成中...' : action.label}</span>
            {needsLine && !hasLineAnnotations && <div className="text-[10px] opacity-60 mt-0.5">需要行标注</div>}
          </button>
        );
      })}
      {isStreaming && (
        <div className="mt-4 space-y-2">
          <div className="p-3 bg-paper-dark rounded-lg text-xs text-ink-muted text-center">AI 正在生成中...</div>
          <button onClick={cancel} className="w-full py-2 text-sm text-error-text border border-error-text/30 rounded-lg hover:bg-error-bg transition-colors">取消</button>
        </div>
      )}
    </div>
  );
}
