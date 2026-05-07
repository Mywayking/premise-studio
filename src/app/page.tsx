'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSessionStore } from '@/store/sessionStore';
import { useCardTreeStore } from '@/store/cardTreeStore';

function QuickCapture() {
  const [text, setText] = useState('');
  const createSession = useSessionStore((s) => s.createSession);
  const createCard = useCardTreeStore((s) => s.createCard);
  const router = useRouter();

  const handleCapture = () => {
    const content = text.trim();
    if (!content) return;
    const session = createSession();
    createCard('material', null, content);
    setText('');
    router.push(`/session/${session.id}`);
  };

  return (
    <div className="rounded-xl bg-white shadow-sm border border-paper-dark p-4">
      <textarea className="w-full resize-none bg-transparent text-ink placeholder:text-ink-muted text-base outline-none min-h-[80px]" placeholder="有什么想吐槽的？"
        value={text} onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleCapture(); } }} />
      <div className="flex items-center justify-between mt-2">
        <span className="text-xs text-ink-muted">回车发送 · Shift+回车换行</span>
        <button onClick={handleCapture} disabled={!text.trim()} className="px-4 py-1.5 rounded-full bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-40 disabled:cursor-not-allowed">捕获</button>
      </div>
    </div>
  );
}

function SessionList() {
  const sessions = useSessionStore((s) => s.sessions);
  const createSession = useSessionStore((s) => s.createSession);
  const cards = useCardTreeStore((s) => s.cards);
  const router = useRouter();

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-ink-muted">最近的 Sessions</h2>
      {sessions.length === 0 ? (
        <p className="text-sm text-ink-muted py-6 text-center">还没有创作记录，在上方输入灵感开始第一个 session</p>
      ) : (
        <ul className="space-y-1">
          {sessions.map((session) => (
            <li key={session.id}>
              <a href={`/session/${session.id}`} onClick={(e) => { e.preventDefault(); router.push(`/session/${session.id}`); }}
                className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-hover-bg transition-colors cursor-pointer">
                <div><div className="text-sm font-medium text-ink">{session.name}</div>
                  <div className="text-xs text-ink-muted">{new Date(session.createdAt).toLocaleDateString('zh-CN')}</div></div>
                <span className="text-xs text-ink-muted">{Object.keys(cards).length} cards</span>
              </a>
            </li>
          ))}
        </ul>
      )}
      <button onClick={() => { const s = createSession(); router.push(`/session/${s.id}`); }}
        className="w-full py-2 text-sm text-ink-muted hover:text-ink rounded-lg hover:bg-hover-bg transition-colors">+ 新建 Session</button>
    </div>
  );
}

export default function Home() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => { setMounted(true); }, []);
  if (!mounted) return <div className="flex items-center justify-center h-full bg-paper"><div className="w-6 h-6 rounded-full border-2 border-accent border-t-transparent animate-spin" /></div>;

  return (
    <div className="flex flex-col items-center h-full bg-paper overflow-y-auto">
      <div className="w-full max-w-lg mx-auto px-4 py-12 space-y-8">
        <header className="text-center space-y-1">
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Premise Studio</h1>
          <p className="text-sm text-ink-muted">单口喜剧创作操作系统</p>
        </header>
        <QuickCapture />
        <SessionList />
      </div>
    </div>
  );
}
