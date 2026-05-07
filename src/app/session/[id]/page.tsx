'use client';
import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { useSessionStore } from '@/store/sessionStore';
import { useCardTreeStore } from '@/store/cardTreeStore';
import { useUIStore } from '@/store/uiStore';
import { CardTree } from '@/components/CardTree';
import { Editor } from '@/components/Editor';
import { ActionPanel } from '@/components/ActionPanel';

function QuickCaptureBar() {
  const [text, setText] = useState(''); const [toast, setToast] = useState(false);
  const createCard = useCardTreeStore((s) => s.createCard);
  const handle = () => { const c = text.trim(); if (!c) return; createCard('material', null, c); setText(''); setToast(true); setTimeout(() => setToast(false), 1500); };
  return (
    <div className="relative">
      <div className="flex items-end gap-2 bg-white border border-paper-dark rounded-xl px-3 py-2 shadow-sm">
        <textarea className="flex-1 resize-none bg-transparent text-sm text-ink placeholder:text-ink-muted outline-none min-h-[32px] max-h-[80px] py-1" placeholder="快速捕获灵感..." value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handle(); } }} rows={1} />
        <button onClick={handle} disabled={!text.trim()} className="px-3 py-1 rounded-full bg-accent text-white text-xs font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0">捕获</button>
      </div>
      {toast && <div className="absolute -top-8 left-1/2 -translate-x-1/2 text-xs text-ink-muted bg-paper-dark px-3 py-1 rounded-full whitespace-nowrap">已保存</div>}
    </div>
  );
}

export default function SessionPage() {
  const params = useParams(); const id = params?.id as string;
  const [mounted, setMounted] = useState(false);
  const sessions = useSessionStore((s) => s.sessions);
  const setCurrentSession = useSessionStore((s) => s.setCurrentSession);
  const updateSession = useSessionStore((s) => s.updateSession);
  const session = sessions.find((s) => s.id === id);
  const cards = useCardTreeStore((s) => s.cards);
  const currentNode = useCardTreeStore((s) => s.getCurrentNode());
  const setCurrentNode = useCardTreeStore((s) => s.setCurrentNode);
  const createCard = useCardTreeStore((s) => s.createCard);
  const leftOpen = useUIStore((s) => s.leftPanelOpen);
  const rightOpen = useUIStore((s) => s.rightPanelOpen);
  const isMobile = useUIStore((s) => s.isMobile);
  const leftDrawer = useUIStore((s) => s.leftDrawerOpen);
  const rightDrawer = useUIStore((s) => s.rightDrawerOpen);
  const toggleLeft = useUIStore((s) => s.toggleLeftDrawer);
  const toggleRight = useUIStore((s) => s.toggleRightDrawer);
  const setBp = useUIStore((s) => s.setBreakpoint);

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  const startRename = () => { if (session) { setNameInput(session.name); setEditingName(true); } };
  const commitRename = () => {
    if (id && nameInput.trim()) updateSession(id, { name: nameInput.trim() });
    setEditingName(false);
  };

  useEffect(() => { setMounted(true); const r = () => { const w = window.innerWidth; setBp(w < 768, w >= 768 && w < 1024); }; r(); window.addEventListener('resize', r); return () => window.removeEventListener('resize', r); }, [setBp]);
  useEffect(() => { if (id) setCurrentSession(id); }, [id, setCurrentSession]);
  useEffect(() => { if (!mounted || !id) return; const has = Object.values(cards).some((c) => c.type === 'material' && c.parentId === null); if (!has) { const c = createCard('material', null, ''); setCurrentNode(c.id); } }, [mounted]);
  useEffect(() => { if (!mounted) return; const cn = useCardTreeStore.getState().getCurrentNode(); if (!cn) { const r = Object.values(useCardTreeStore.getState().cards).find((c) => c.parentId === null); if (r) setCurrentNode(r.id); } }, [mounted, currentNode]);

  if (!mounted) return <div className="flex items-center justify-center h-full bg-paper"><div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>;
  if (!session) return <div className="flex items-center justify-center h-full bg-paper"><div className="text-center space-y-3"><p className="text-ink-muted">Session 不存在</p><a href="/" className="text-sm text-accent hover:underline">返回首页</a></div></div>;

  return (
    <div className="flex h-full bg-paper">
      {isMobile && <button onClick={toggleLeft} className="fixed top-3 left-3 z-50 w-9 h-9 flex items-center justify-center rounded-lg bg-white shadow-sm border border-paper-dark"><svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 4h14M2 9h14M2 14h14" /></svg></button>}
      {(leftDrawer || rightDrawer) && <div className="fixed inset-0 bg-black/20 z-30 lg:hidden" onClick={() => useUIStore.getState().closeAllDrawers()} />}

      <aside className={`${isMobile ? `fixed left-0 top-0 bottom-0 z-40 w-72 bg-paper-light shadow-lg transition-transform duration-200 ${leftDrawer ? 'translate-x-0' : '-translate-x-full'}` : `w-72 flex-shrink-0 border-r border-paper-dark bg-paper-light transition-all duration-200 ${leftOpen ? '' : 'hidden'}`} overflow-y-auto`}>
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <a href="/" className="text-sm font-medium text-ink hover:text-accent transition-colors">Premise Studio</a>
            {isMobile && <button onClick={toggleLeft} className="text-ink-muted hover:text-ink p-1"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 4l8 8M12 4l-8 8" /></svg></button>}
          </div>
          <h2 className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-3">创作树</h2>
          {Object.keys(cards).length > 0 ? <CardTree /> : <p className="text-sm text-ink-muted py-4">用底部输入框添加第一个素材</p>}
        </div>
      </aside>

      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between px-6 py-3 border-b border-paper-dark bg-paper-light/50 flex-shrink-0">
          {editingName ? (
            <input className="text-sm font-medium text-ink bg-white border border-accent rounded px-2 py-0.5 outline-none flex-shrink-0 min-w-0"
              value={nameInput} onChange={(e) => setNameInput(e.target.value)}
              onBlur={commitRename}
              onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingName(false); }}
              autoFocus />
          ) : (
            <h1 className="text-sm font-medium text-ink truncate cursor-default" onDoubleClick={startRename}>{session.name}</h1>
          )}
          {!isMobile && <div className="flex items-center gap-1">
            <button onClick={useUIStore.getState().toggleLeftPanel} className="px-2 py-1 text-xs text-ink-muted hover:text-ink rounded transition-colors">{leftOpen ? '隐藏树' : '显示树'}</button>
            <button onClick={useUIStore.getState().toggleRightPanel} className="px-2 py-1 text-xs text-ink-muted hover:text-ink rounded transition-colors">{rightOpen ? '隐藏面板' : '显示面板'}</button>
          </div>}
        </header>
        <div className="flex-1 p-6 overflow-y-auto"><Editor /></div>
        <div className="px-4 py-3 border-t border-paper-dark bg-paper-light/50 flex-shrink-0"><QuickCaptureBar /></div>
      </main>

      <aside className={`${isMobile ? `fixed right-0 bottom-0 left-0 z-40 max-h-[60vh] bg-paper-light shadow-lg rounded-t-2xl transition-transform duration-200 overflow-y-auto ${rightDrawer ? 'translate-y-0' : 'translate-y-full'}` : `w-80 flex-shrink-0 border-l border-paper-dark bg-paper-light transition-all duration-200 overflow-y-auto ${rightOpen ? '' : 'hidden'}`}`}>
        <div className="p-4">
          {isMobile && <div className="flex justify-center mb-2"><div className="w-8 h-1 rounded-full bg-paper-dark" /></div>}
          <h2 className="text-xs font-medium text-ink-muted uppercase tracking-wide mb-3">AI 陪练</h2>
          <ActionPanel />
        </div>
      </aside>
    </div>
  );
}
