import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Session, Card } from '@/types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function createEmptySession(): Session {
  const rootId = generateId();
  return {
    id: generateId(),
    name: '新会话',
    rootCard: {
      id: rootId,
      type: 'material',
      title: '素材',
      content: '',
      children: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    },
    activeCardId: rootId,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
}

interface SessionState {
  sessions: Session[];
  currentSessionId: string | null;
  
  // Actions
  createSession: () => Session;
  updateSession: (id: string, updates: Partial<Session>) => void;
  deleteSession: (id: string) => void;
  restoreSession: (id: string) => void;
  getCurrentSession: () => Session | null;
  setCurrentSession: (id: string) => void;
}

export const useSessionStore = create<SessionState>()(
  persist(
    (set, get) => ({
      sessions: [],
      currentSessionId: null,

      createSession: () => {
        const newSession = createEmptySession();
        set((state) => ({
          sessions: [...state.sessions, newSession],
          currentSessionId: newSession.id,
        }));
        return newSession;
      },

      updateSession: (id, updates) => {
        set((state) => ({
          sessions: state.sessions.map((s) =>
            s.id === id ? { ...s, ...updates, updatedAt: Date.now() } : s
          ),
        }));
      },

      deleteSession: (id) => {
        set((state) => {
          const sessions = state.sessions.filter((s) => s.id !== id);
          const currentSessionId =
            state.currentSessionId === id
              ? sessions[0]?.id ?? null
              : state.currentSessionId;
          return { sessions, currentSessionId };
        });
      },

      restoreSession: (id) => {
        set({ currentSessionId: id });
      },

      getCurrentSession: () => {
        const { sessions, currentSessionId } = get();
        return sessions.find((s) => s.id === currentSessionId) ?? null;
      },

      setCurrentSession: (id) => {
        set({ currentSessionId: id });
      },
    }),
    {
      name: 'premise-studio-sessions',
    }
  )
);
