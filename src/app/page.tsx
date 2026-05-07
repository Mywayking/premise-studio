'use client';
import { useState, useEffect, useRef } from 'react';
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
    const defaultName = content.slice(0, 20) + (content.length > 20 ? '…' : '');
    const session = createSession(defaultName);
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

function SessionMenu({ session, onClose }: { session: { id: string; name: string; rootCardId: string }; onClose: () => void }) {
  const [mode, setMode] = useState<'menu' | 'rename' | 'confirm-delete'>('menu');
  const [nameInput, setNameInput] = useState(session.name);
  const updateSession = useSessionStore((s) => s.updateSession);
  const deleteSession = useSessionStore((s) => s.deleteSession);
  const deleteCard = useCardTreeStore((s) => s.deleteCard);
  const cards = useCardTreeStore((s) => s.cards);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (menuRef.current && !menuRef.current.contains(e.target as Node)) onClose(); };
    setTimeout(() => document.addEventListener('mousedown', handler), 0);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  const commitRename = () => {
    if (nameInput.trim()) updateSession(session.id, { name: nameInput.trim() });
    onClose();
  };

  const handleDelete = () => {
    if (cards[session.rootCardId]) deleteCard(session.rootCardId);
    deleteSession(session.id);
    onClose();
  };

  if (mode === 'confirm-delete') {
    return (
      <div ref={menuRef} className="absolute right-0 top-full mt-1 z-50 bg-white border border-paper-dark rounded-lg shadow-lg p-3 w-56" onClick={(e) => e.stopPropagation()}>
        <p className="text-xs text-ink-muted mb-2">确定删除此 Session？</p>
        <p className="text-xs text-error-text mb-2">所有关联的卡片将被一并删除</p>
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
        <input className="w-full text-xs bg-transparent border border-accent rounded px-2 py-1 outline-none"
          value={nameInput} onChange={(e) => setNameInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') onClose(); }}
          onBlur={commitRename} autoFocus />
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

function EmptyGuide({ onDemo }: { onDemo: () => void }) {
  return (
    <div className="py-6 space-y-5">
      <div className="space-y-3">
        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-paper-dark">
          <span className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-medium flex-shrink-0">1</span>
          <div><div className="text-sm font-medium text-ink">捕获灵感</div><div className="text-xs text-ink-muted">输入吐槽、观察、故事 — 任何让你有感觉的东西</div></div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-paper-dark">
          <span className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-medium flex-shrink-0">2</span>
          <div><div className="text-sm font-medium text-ink">AI 提炼</div><div className="text-xs text-ink-muted">AI 帮你提炼前提、找角度、生成草稿、反复改稿</div></div>
        </div>
        <div className="flex items-center gap-3 px-4 py-3 bg-white rounded-lg border border-paper-dark">
          <span className="w-7 h-7 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-medium flex-shrink-0">3</span>
          <div><div className="text-sm font-medium text-ink">打磨演出</div><div className="text-xs text-ink-muted">行标注、演出记录、持续迭代，直到段子炸场</div></div>
        </div>
      </div>
      <button onClick={onDemo}
        className="w-full py-3 text-sm font-medium text-accent border-2 border-accent/30 rounded-xl hover:bg-accent hover:text-white transition-all">
        试试示例
      </button>
    </div>
  );
}

function SessionList() {
  const sessions = useSessionStore((s) => s.sessions);
  const createSession = useSessionStore((s) => s.createSession);
  const cards = useCardTreeStore((s) => s.cards);
  const router = useRouter();
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  const handleDemo = () => {
    const session = createSession('示例：吐槽上班');
    const createCard = useCardTreeStore.getState().createCard;
    const appendChild = useCardTreeStore.getState().appendChild;

    const material = createCard('material', null,
      '人们总说要在工作中找到热爱，但更多人找到的只是对周末的热爱。周一早上地铁里每个人的表情都像去参加葬礼。我试过在工位上冥想，但旁边的同事在激情辩论 git merge 和 git rebase，我的禅意瞬间变成了选择困难。上次团建，HR 说我们要把公司当作家——我心想，我在家可以躺沙发上，这里连午休枕都不让放。');

    const premise = createCard('premise', material.id,
      '前提：人们对"工作热情"叙事的厌倦，与实际生存需求之间的矛盾。\n态度：对职场鸡汤的讽刺\n冲突：理想主义的职业建议 vs 现实中摸鱼求生的本能\n潜力：可展开"上班像参加葬礼"、"冥想被同事吵醒"、"公司不是家"等场景');
    appendChild(material.id, premise);

    const angle = createCard('angle', premise.id,
      '角度类型：字面化\n描述：把"工作要有热情"这个抽象建议，字面化地应用到各种荒谬场景\n开场："我决定把热情带到工位上，结果第一天就被 HR 约谈了。"\n方向：尝试在办公室展示"热情"但每次都被现实打脸的系列场景');
    appendChild(premise.id, angle);

    const draft = createCard('draft', angle.id,
      '我有一个新发现：热爱工作这件事，最难的不是找不到热情，是找不到热情还不被开除的尺度。\n\n上周我决定——我要充满热情地打工！周一我就提前到公司了，在门口等着老板来。他一来我就冲上去和他击掌，说"老板早上好！今天我们要改变世界！"他看了我五秒钟，说"你还是先改变一下你的报销单格式吧。"');
    appendChild(angle.id, draft);

    router.push(`/session/${session.id}`);
  };

  return (
    <div className="space-y-2">
      <h2 className="text-sm font-medium text-ink-muted">最近的 Sessions</h2>
      {sessions.length === 0 ? (
        <EmptyGuide onDemo={handleDemo} />
      ) : (
        <ul className="space-y-1">
          {sessions.map((session) => (
            <li key={session.id} className="relative">
              <a href={`/session/${session.id}`} onClick={(e) => { e.preventDefault(); router.push(`/session/${session.id}`); }}
                className="flex items-center justify-between px-4 py-3 rounded-lg hover:bg-hover-bg transition-colors cursor-pointer group">
                <div>
                  <div className="text-sm font-medium text-ink">{session.name}</div>
                  <div className="text-xs text-ink-muted">{new Date(session.createdAt).toLocaleDateString('zh-CN')}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-ink-muted">{Object.keys(cards).length} cards</span>
                  <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === session.id ? null : session.id); }}
                    className="w-5 h-5 flex items-center justify-center rounded opacity-0 group-hover:opacity-100 hover:bg-paper-dark transition-all flex-shrink-0">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor" className="text-ink-muted"><circle cx="3" cy="6" r="1.2"/><circle cx="6" cy="6" r="1.2"/><circle cx="9" cy="6" r="1.2"/></svg>
                  </button>
                </div>
              </a>
              {menuOpenId === session.id && <SessionMenu session={session} onClose={() => setMenuOpenId(null)} />}
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
