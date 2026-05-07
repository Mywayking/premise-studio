import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Card, CardType, CardTier, PerformanceRecord, LineAnnotationType } from '@/types';

function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 9);
}

interface CardTreeState {
  cards: Record<string, Card>;
  currentNodeId: string | null;
  createCard: (type: CardType, parentId: string | null, content?: string) => Card;
  appendChild: (parentId: string, card: Card) => void;
  branchNode: (parentId: string, card: Card) => void;
  updateCard: (cardId: string, updates: Partial<Card>) => void;
  deleteCard: (cardId: string) => void;
  setCurrentNode: (cardId: string) => void;
  getCurrentNode: () => Card | null;
  setTier: (cardId: string, tier: CardTier) => void;
  addPerformance: (cardId: string, record: PerformanceRecord) => void;
  setLineAnnotation: (cardId: string, lineIndex: number, type: LineAnnotationType | null) => void;
  reorderSiblings: (cardId: string, newIndex: number) => void;
  treeToJSON: () => Record<string, Card>;
  restoreFromJSON: (cards: Record<string, Card>) => void;
  getChildren: (cardId: string) => Card[];
}

export const useCardTreeStore = create<CardTreeState>()(
  persist(
    (set, get) => ({
      cards: {},
      currentNodeId: null,

      createCard: (type, parentId, content) => {
        const id = generateId();
        const now = Date.now();
        const card: Card = {
          id, type, parentId, childrenIds: [],
          content: content || '', performances: [],
          createdAt: now, updatedAt: now, status: 'idle',
        };
        set((state) => ({ cards: { ...state.cards, [id]: card }, currentNodeId: id }));
        return card;
      },

      appendChild: (parentId, card) =>
        set((state) => {
          const parent = state.cards[parentId];
          if (!parent) return state;
          const cards = {
            ...state.cards,
            [parentId]: { ...parent, childrenIds: [...parent.childrenIds, card.id], updatedAt: Date.now() },
            [card.id]: card,
          };
          return { cards, currentNodeId: card.id };
        }),

      branchNode: (parentId, card) =>
        set((state) => {
          const parent = state.cards[parentId];
          if (!parent) return state;
          const cards = {
            ...state.cards,
            [parentId]: { ...parent, childrenIds: [...parent.childrenIds, card.id], updatedAt: Date.now() },
            [card.id]: card,
          };
          return { cards, currentNodeId: card.id };
        }),

      updateCard: (cardId, updates) =>
        set((state) => {
          const card = state.cards[cardId];
          if (!card) return state;
          return { cards: { ...state.cards, [cardId]: { ...card, ...updates, updatedAt: Date.now() } } };
        }),

      deleteCard: (cardId) =>
        set((state) => {
          const card = state.cards[cardId];
          if (!card || card.status === 'streaming') return state;
          const cards = { ...state.cards };
          const toDelete = new Set<string>();
          (function collect(id: string) { toDelete.add(id); cards[id]?.childrenIds.forEach(collect); })(cardId);
          if (card.parentId && cards[card.parentId]) {
            cards[card.parentId] = {
              ...cards[card.parentId],
              childrenIds: cards[card.parentId].childrenIds.filter((cid) => cid !== cardId),
            };
          }
          for (const id of toDelete) delete cards[id];
          return { cards, currentNodeId: cardId === state.currentNodeId ? card.parentId : state.currentNodeId };
        }),

      setCurrentNode: (cardId) => set({ currentNodeId: cardId }),

      getCurrentNode: () => {
        const { cards, currentNodeId } = get();
        return currentNodeId ? cards[currentNodeId] ?? null : null;
      },

      setTier: (cardId, tier) =>
        set((state) => {
          const card = state.cards[cardId];
          if (!card || (card.type !== 'draft' && card.type !== 'rewrite')) return state;
          return { cards: { ...state.cards, [cardId]: { ...card, tier, updatedAt: Date.now() } } };
        }),

      addPerformance: (cardId, record) =>
        set((state) => {
          const card = state.cards[cardId];
          if (!card || (card.type !== 'draft' && card.type !== 'rewrite')) return state;
          return { cards: { ...state.cards, [cardId]: { ...card, performances: [...card.performances, record], updatedAt: Date.now() } } };
        }),

      setLineAnnotation: (cardId, lineIndex, type) =>
        set((state) => {
          const card = state.cards[cardId];
          if (!card || (card.type !== 'draft' && card.type !== 'rewrite')) return state;
          const annotations = { ...(card.lineAnnotations || {}) };
          if (type === null) delete annotations[lineIndex];
          else annotations[lineIndex] = type;
          return { cards: { ...state.cards, [cardId]: { ...card, lineAnnotations: annotations, updatedAt: Date.now() } } };
        }),

      reorderSiblings: (cardId, newIndex) =>
        set((state) => {
          const card = state.cards[cardId];
          if (!card?.parentId) return state;
          const parent = state.cards[card.parentId];
          if (!parent) return state;
          const siblings = [...parent.childrenIds];
          const old = siblings.indexOf(cardId);
          if (old === -1) return state;
          siblings.splice(old, 1);
          siblings.splice(newIndex, 0, cardId);
          return { cards: { ...state.cards, [parent.id]: { ...parent, childrenIds: siblings, updatedAt: Date.now() } } };
        }),

      treeToJSON: () => get().cards,

      restoreFromJSON: (cards) => {
        const first = Object.keys(cards)[0] ?? null;
        set({ cards, currentNodeId: first });
      },

      getChildren: (cardId) => {
        const { cards } = get();
        const card = cards[cardId];
        return card ? card.childrenIds.map((id) => cards[id]).filter(Boolean) : [];
      },
    }),
    { name: 'premise-studio-card-tree' }
  )
);
