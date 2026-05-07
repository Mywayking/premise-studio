import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Session } from '@/types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

interface SessionState {
  sessions: Session[];
  currentSessionId: string | null;
  createSession: (name?: string) => Session;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  setCurrentSession: (id: string) => void;
  getCurrentSession: () => Session | undefined;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,

      createSession: (name?: string) => {
        const id = generateId();
        const rootCardId = generateId();
        const session: Session = {
          id,
          name: name || `新创作 ${new Date().toLocaleDateString('zh-CN')}`,
          rootCardId,
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          sessions: [...state.sessions, session],
          currentSessionId: id,
        }));
        return session;
      },

      updateSession: (id, updates) =>
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
          ),
        })),

      deleteSession: (id) =>
        set((state) => {
          const sessions = state.sessions.filter((s) => s.id !== id);
          const currentSessionId =
            state.currentSessionId === id ? sessions[0]?.id ?? null : state.currentSessionId;
          return { sessions, currentSessionId };
        }),

      setCurrentSession: (id) => set({ currentSessionId: id }),

      getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        return sessions.find((s) => s.id === currentSessionId);
      },
    }),
    { name: 'premise-studio-sessions' }
  )
);
