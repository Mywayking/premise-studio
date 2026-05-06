import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Card, CardType } from '@/types';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function findCardInTree(card: Card, id: string): Card | null {
  if (card.id === id) return card;
  for (const child of card.children) {
    const found = findCardInTree(child, id);
    if (found) return found;
  }
  return null;
}

function updateCardInTree(card: Card, id: string, updates: Partial<Card>): Card {
  if (card.id === id) {
    return { ...card, ...updates, updatedAt: Date.now() };
  }
  return {
    ...card,
    children: card.children.map((c) => updateCardInTree(c, id, updates)),
    updatedAt: Date.now(),
  };
}

function deleteCardFromTree(card: Card, id: string): Card {
  return {
    ...card,
    children: card.children
      .filter((c) => c.id !== id)
      .map((c) => deleteCardFromTree(c, id)),
    updatedAt: Date.now(),
  };
}

function appendChildToCard(card: Card, parentId: string, newCard: Card): Card {
  if (card.id === parentId) {
    return {
      ...card,
      children: [...card.children, newCard],
      updatedAt: Date.now(),
    };
  }
  return {
    ...card,
    children: card.children.map((c) => appendChildToCard(c, parentId, newCard)),
    updatedAt: Date.now(),
  };
}

interface CardTreeState {
  createCard(
    sessionRootCard: Card,
    parentId: string,
    type: CardType,
    title: string,
    content?: string
  ): { newCard: Card; updatedRoot: Card };

  appendChild(sessionRootCard: Card, parentId: string, card: Card): Card;

  branchNode(
    sessionRootCard: Card,
    sourceId: string,
    newParentId: string
  ): Card;

  updateCard(
    sessionRootCard: Card,
    cardId: string,
    updates: Partial<Card>
  ): Card;

  deleteCard(sessionRootCard: Card, cardId: string): Card;

  findCard(card: Card, id: string): Card | null;

  getCardTypeLabel(type: CardType): string;

  getCardActions(type: CardType): string[];
}

export const useCardTreeStore = create<CardTreeState>()(
  persist(
    (set, get) => ({
      createCard: (sessionRootCard, parentId, type, title, content = '') => {
        const newCard: Card = {
          id: generateId(),
          type,
          title,
          content,
          children: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        const updatedRoot = appendChildToCard(
          sessionRootCard,
          parentId,
          newCard
        );
        return { newCard, updatedRoot };
      },

      appendChild: (sessionRootCard, parentId, card) => {
        return appendChildToCard(sessionRootCard, parentId, card);
      },

      branchNode: (sessionRootCard, sourceId, newParentId) => {
        const sourceCard = findCardInTree(sessionRootCard, sourceId);
        if (!sourceCard) return sessionRootCard;
        const branchedCard: Card = {
          ...sourceCard,
          id: generateId(),
          children: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        return appendChildToCard(sessionRootCard, newParentId, branchedCard);
      },

      updateCard: (sessionRootCard, cardId, updates) => {
        return updateCardInTree(sessionRootCard, cardId, updates);
      },

      deleteCard: (sessionRootCard, cardId) => {
        return deleteCardFromTree(sessionRootCard, cardId);
      },

      findCard: (card, id) => findCardInTree(card, id),

      getCardTypeLabel: (type) => {
        const labels: Record<CardType, string> = {
          material: '素材',
          premise: '前提',
          angle: '角度',
          draft: '草稿',
          rewrite: '改稿',
        };
        return labels[type];
      },

      getCardActions: (type) => {
        const actions: Record<CardType, string[]> = {
          material: ['提炼前提', '提取情绪', '提取冲突'],
          premise: ['找角度', '加强攻击性', '更荒诞', '更真实'],
          angle: ['生成草稿', '增加细节', '增强情绪'],
          draft: ['改稿', '缩短', 'callback', '更口语化'],
          rewrite: ['再改稿', '比较版本', '分支创作'],
        };
        return actions[type];
      },
    }),
    { name: 'premise-studio-card-tree' }
  )
);
