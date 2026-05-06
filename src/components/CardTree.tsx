'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardType } from '@/types';
import { useCardTreeStore } from '@/store/cardTreeStore';

interface CardTreeProps {
  card: Card;
  activeCardId: string | null;
  onSelectCard: (cardId: string) => void;
  onAddChild: (parentId: string, type: CardType, title: string) => void;
  depth?: number;
}

const CARD_TYPE_COLORS: Record<CardType, { bg: string; border: string; text: string }> = {
  material: { bg: 'bg-amber-50', border: 'border-amber-300', text: 'text-amber-700' },
  premise: { bg: 'bg-blue-50', border: 'border-blue-300', text: 'text-blue-700' },
  angle: { bg: 'bg-purple-50', border: 'border-purple-300', text: 'text-purple-700' },
  draft: { bg: 'bg-green-50', border: 'border-green-300', text: 'text-green-700' },
  rewrite: { bg: 'bg-rose-50', border: 'border-rose-300', text: 'text-rose-700' },
};

const CARD_TYPE_ICONS: Record<CardType, string> = {
  material: '📝',
  premise: '💡',
  angle: '🎯',
  draft: '✍️',
  rewrite: '🔄',
};

function CardNode({ card, activeCardId, onSelectCard, onAddChild, depth = 0 }: CardTreeProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [showAddMenu, setShowAddMenu] = useState(false);
  const { getCardTypeLabel, getCardActions } = useCardTreeStore();

  const colors = CARD_TYPE_COLORS[card.type];
  const isActive = activeCardId === card.id;
  const hasChildren = card.children.length > 0;

  // Determine what types of children can be added
  const getChildTypes = (type: CardType): CardType[] => {
    switch (type) {
      case 'material':
        return ['premise'];
      case 'premise':
        return ['angle'];
      case 'angle':
        return ['draft'];
      case 'draft':
        return ['rewrite'];
      case 'rewrite':
        return [];
      default:
        return [];
    }
  };

  const childTypes = getChildTypes(card.type);

  return (
    <div className="select-none">
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.2 }}
        className={`
          flex items-center gap-1 px-2 py-1.5 rounded-lg cursor-pointer
          transition-colors group
          ${isActive ? `${colors.bg} ${colors.border} border` : 'hover:bg-gray-50'}
        `}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
        onClick={() => onSelectCard(card.id)}
      >
        {/* Expand/Collapse */}
        <button
          className={`w-4 h-4 flex items-center justify-center text-xs ${hasChildren ? 'text-gray-400' : 'text-transparent'}`}
          onClick={(e) => {
            e.stopPropagation();
            if (hasChildren) setIsExpanded(!isExpanded);
          }}
        >
          {hasChildren && (isExpanded ? '▼' : '▶')}
        </button>

        {/* Type Icon */}
        <span className="text-sm">{CARD_TYPE_ICONS[card.type]}</span>

        {/* Title */}
        <span className={`text-sm truncate flex-1 ${isActive ? colors.text : 'text-gray-700'}`}>
          {card.title}
        </span>

        {/* Child count badge */}
        {hasChildren && (
          <span className="text-xs text-gray-400">{card.children.length}</span>
        )}

        {/* Add button */}
        {childTypes.length > 0 && (
          <button
            className="opacity-0 group-hover:opacity-100 w-5 h-5 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded"
            onClick={(e) => {
              e.stopPropagation();
              setShowAddMenu(!showAddMenu);
            }}
          >
            +
          </button>
        )}
      </motion.div>

      {/* Add child menu */}
      <AnimatePresence>
        {showAddMenu && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="ml-8 mt-1 flex flex-wrap gap-1"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
          >
            {childTypes.map((type) => (
              <button
                key={type}
                className={`text-xs px-2 py-1 rounded border ${CARD_TYPE_COLORS[type].bg} ${CARD_TYPE_COLORS[type].border} ${CARD_TYPE_COLORS[type].text}`}
                onClick={() => {
                  onAddChild(card.id, type, `新${getCardTypeLabel(type)}`);
                  setShowAddMenu(false);
                }}
              >
                + {getCardTypeLabel(type)}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Children */}
      <AnimatePresence>
        {isExpanded && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {card.children.map((child) => (
              <CardNode
                key={child.id}
                card={child}
                activeCardId={activeCardId}
                onSelectCard={onSelectCard}
                onAddChild={onAddChild}
                depth={depth + 1}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface CardTreePanelProps {
  card: Card;
  activeCardId: string | null;
  onSelectCard: (cardId: string) => void;
  onAddChild: (parentId: string, type: CardType, title: string) => void;
}

export function CardTreePanel({ card, activeCardId, onSelectCard, onAddChild }: CardTreePanelProps) {
  return (
    <div className="h-full overflow-y-auto p-2">
      <CardNode
        card={card}
        activeCardId={activeCardId}
        onSelectCard={onSelectCard}
        onAddChild={onAddChild}
      />
    </div>
  );
}
