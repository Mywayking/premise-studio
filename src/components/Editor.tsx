'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useCardTreeStore } from '@/store/cardTreeStore';
import { useStreamingStore } from '@/store/streamingStore';
import type { PerformanceResult, LineAnnotationType } from '@/types';

const LINE_LABELS: Record<LineAnnotationType, string> = {
  opener: '开场', setup: '铺垫', punchline: '炸点', tag: 'Tag', topper: 'Topper', 'act-out': '表演', transition: '过渡', closer: '收尾',
};

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
}

export function Editor() {
  const currentNode = useCardTreeStore((s) => s.getCurrentNode());
  const updateCard = useCardTreeStore((s) => s.updateCard);
  const addPerformance = useCardTreeStore((s) => s.addPerformance);
  const setLineAnnotation = useCardTreeStore((s) => s.setLineAnnotation);
  const streamingState = useStreamingStore((s) => s.state);
  const streamingBuffer = useStreamingStore((s) => s.buffer);
  const streamingError = useStreamingStore((s) => s.errorMessage);
  const reset = useStreamingStore((s) => s.reset);

  const [editContent, setEditContent] = useState('');
  const [annotationMode, setAnnotationMode] = useState(false);
  const [showPerfForm, setShowPerfForm] = useState(false);
  const [perfDate, setPerfDate] = useState(new Date().toISOString().slice(0, 10));
  const [perfVenue, setPerfVenue] = useState('');
  const [perfResult, setPerfResult] = useState<PerformanceResult>('killed');
  const [perfNotes, setPerfNotes] = useState('');
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [dirty, setDirty] = useState(false);
  const cardIdRef = useRef(currentNode?.id);

  const displayContent = currentNode
    ? (streamingState === 'streaming' ? (currentNode.content || '') + streamingBuffer : currentNode.content || '')
    : '';

  const doSave = useCallback(() => {
    const id = cardIdRef.current;
    if (!id) return;
    const card = useCardTreeStore.getState().cards[id];
    if (!card || streamingState === 'streaming') return;
    if (editContent !== card.content) {
      updateCard(id, { content: editContent });
      const now = Date.now();
      setLastSaved(now);
      setDirty(false);
    }
  }, [editContent, updateCard, streamingState]);

  // Initialize content when switching cards
  useEffect(() => {
    cardIdRef.current = currentNode?.id;
    if (currentNode) {
      setEditContent(displayContent);
      setDirty(false);
      setLastSaved(null);
    }
  }, [currentNode?.id]);

  // Auto-save after 2s idle
  useEffect(() => {
    if (!dirty || streamingState === 'streaming') return;
    const timer = setTimeout(doSave, 2000);
    return () => clearTimeout(timer);
  }, [editContent, dirty, doSave, streamingState]);

  // Cmd+S / Ctrl+S handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        doSave();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [doSave]);

  if (!currentNode) {
    return <div className="flex items-center justify-center h-full text-ink-muted text-sm">选择一个 card 开始创作</div>;
  }

  const isDraftOrRewrite = currentNode.type === 'draft' || currentNode.type === 'rewrite';
  const lines = editContent.split('\n');
  const annotations = currentNode.lineAnnotations || {};

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-medium text-ink">{currentNode.type === 'material' ? '素材' : currentNode.type === 'premise' ? '前提' : currentNode.type === 'angle' ? '角度' : currentNode.type === 'draft' ? '草稿' : '改稿'}</h2>
          {streamingState === 'streaming' && <span className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent animate-pulse">生成中</span>}
          {streamingState === 'error' && <span className="text-xs px-2 py-0.5 rounded-full bg-error-bg text-error-text">生成失败</span>}
          {streamingState === 'timeout' && <span className="text-xs px-2 py-0.5 rounded-full bg-error-bg text-error-text">超时</span>}
        </div>
        <div className="flex items-center gap-2">
          {isDraftOrRewrite && (
            <button onClick={() => setAnnotationMode(!annotationMode)} className={`text-xs px-2 py-1 rounded transition-colors ${annotationMode ? 'bg-accent text-white' : 'text-ink-muted hover:text-ink'}`}>行标注</button>
          )}
          {dirty ? (
            <span className="text-xs text-ink-muted animate-pulse">编辑中...</span>
          ) : lastSaved ? (
            <span className="text-xs text-ink-muted">已自动保存 {formatTime(lastSaved)}</span>
          ) : (
            <span className="text-xs text-disabled">未修改</span>
          )}
        </div>
      </div>

      {(streamingState === 'error' || streamingState === 'timeout') && (
        <div className="bg-error-bg border border-error-text/20 rounded-lg p-3 flex items-center justify-between">
          <span className="text-sm text-error-text">{streamingError}</span>
          <button onClick={reset} className="text-sm text-accent hover:underline flex-shrink-0 ml-3">重试</button>
        </div>
      )}

      {annotationMode ? (
        <div className="space-y-0.5 font-mono text-sm">
          {lines.map((line, i) => (
            <div key={i} className={`flex items-start gap-2 p-1 rounded group hover:bg-hover-bg ${annotations[i] === 'punchline' ? 'border-l-2 border-accent pl-2' : 'border-l-2 border-transparent pl-2'}`}>
              <span className="text-xs text-ink-muted w-6 text-right flex-shrink-0 select-none pt-0.5">{i + 1}</span>
              <span className="flex-1 min-w-0 whitespace-pre-wrap">{line || ' '}</span>
              <select value={annotations[i] || ''} onChange={(e) => setLineAnnotation(currentNode.id, i, e.target.value ? e.target.value as LineAnnotationType : null)}
                className="text-[10px] bg-transparent border border-paper-dark rounded px-1 py-0.5 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity flex-shrink-0">
                <option value="">-</option>
                {Object.entries(LINE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          ))}
        </div>
      ) : (
        <textarea className="w-full min-h-[300px] resize-y bg-transparent text-ink leading-relaxed text-base outline-none rounded-lg p-3 border border-transparent hover:border-paper-dark focus:border-accent/30 transition-colors"
          value={editContent} onChange={(e) => { setEditContent(e.target.value); setDirty(true); }}
          placeholder="开始写..." />
      )}

      {isDraftOrRewrite && (
        <div className="border-t border-paper-dark pt-4">
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => setShowPerfForm(!showPerfForm)} className="flex items-center gap-1.5 text-sm text-ink-muted hover:text-ink transition-colors">
              <span>{showPerfForm ? '收起' : '演出记录'}</span>
              {currentNode.performances.length > 0 && <span className="text-xs bg-paper-dark px-1.5 py-0.5 rounded-full">{currentNode.performances.length}</span>}
            </button>
            <span className="text-xs text-ink-muted">
              {currentNode.performances.length > 0 ? `演出 ${currentNode.performances.length} 次 · 最近: ${currentNode.performances[currentNode.performances.length - 1].result === 'killed' ? '🔥' : currentNode.performances[currentNode.performances.length - 1].result === 'ok' ? '😕' : '💀'}` : '还没有演出记录'}
            </span>
          </div>
          {showPerfForm && (
            <div className="bg-white rounded-lg border border-paper-dark p-4 space-y-3">
              <div className="flex gap-3">
                <div className="flex-1"><label className="text-xs text-ink-muted block mb-1">日期</label><input type="date" value={perfDate} onChange={(e) => setPerfDate(e.target.value)} className="w-full text-sm bg-transparent border border-paper-dark rounded-lg px-3 py-1.5" /></div>
                <div className="flex-1"><label className="text-xs text-ink-muted block mb-1">场地</label><input type="text" value={perfVenue} onChange={(e) => setPerfVenue(e.target.value)} placeholder="可选" className="w-full text-sm bg-transparent border border-paper-dark rounded-lg px-3 py-1.5 placeholder:text-disabled" /></div>
              </div>
              <div>
                <label className="text-xs text-ink-muted block mb-1">结果</label>
                <div className="flex gap-2">
                  {(['killed', 'ok', 'bombed'] as const).map((v) => (
                    <button key={v} onClick={() => setPerfResult(v)} className={`flex-1 py-1.5 text-sm rounded-lg border transition-colors ${perfResult === v ? 'border-accent bg-accent/5 text-accent' : 'border-paper-dark text-ink-muted hover:bg-hover-bg'}`}>
                      {v === 'killed' ? '🔥 炸了' : v === 'ok' ? '😕 还行' : '💀 死了'}
                    </button>
                  ))}
                </div>
              </div>
              <div><label className="text-xs text-ink-muted block mb-1">备注</label><textarea value={perfNotes} onChange={(e) => setPerfNotes(e.target.value)} placeholder="记一下哪句炸了/没炸..." className="w-full text-sm bg-transparent border border-paper-dark rounded-lg px-3 py-1.5 resize-none min-h-[60px] placeholder:text-disabled" /></div>
              <button onClick={() => { addPerformance(currentNode.id, { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7), date: perfDate, venue: perfVenue || undefined, result: perfResult, notes: perfNotes || undefined, createdAt: Date.now() }); setPerfNotes(''); setPerfVenue(''); setShowPerfForm(false); }}
                className="w-full py-2 text-sm bg-accent text-white rounded-lg hover:opacity-90 transition-opacity">保存演出记录</button>
            </div>
          )}
          {!showPerfForm && currentNode.performances.length > 0 && (
            <div className="space-y-2">
              {[...currentNode.performances].reverse().slice(0, 3).map((perf) => (
                <div key={perf.id} className="flex items-start gap-2 text-sm px-3 py-1.5">
                  <span>{perf.result === 'killed' ? '🔥' : perf.result === 'ok' ? '😕' : '💀'}</span>
                  <span className="text-ink-muted">{perf.date}</span>
                  {perf.venue && <span className="text-ink-muted">· {perf.venue}</span>}
                  {perf.notes && <span className="text-ink-secondary truncate">· {perf.notes}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
