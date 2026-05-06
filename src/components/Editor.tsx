'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardType, InputType } from '@/types';
import { useCardTreeStore } from '@/store/cardTreeStore';
import { useStreaming } from '@/hooks/useStreaming';
import { parseInput, validateInput } from '@/lib/inputUnderstanding';

interface EditorProps {
  card: Card | null;
  onUpdateCard: (cardId: string, updates: Partial<Card>) => void;
  onGenerateContent: (
    cardId: string,
    type: CardType,
    options: Record<string, string>
  ) => void;
}

export function Editor({ card, onUpdateCard, onGenerateContent }: EditorProps) {
  const [localContent, setLocalContent] = useState(card?.content || '');
  const [localTitle, setLocalTitle] = useState(card?.title || '');
  const [streamingContent, setStreamingContent] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const streamingRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const { getCardActions, getCardTypeLabel } = useCardTreeStore();

  // Sync local state when card changes
  useEffect(() => {
    if (card) {
      setLocalContent(card.content || '');
      setLocalTitle(card.title || '');
      setStreamingContent('');
      setIsStreaming(false);
    }
  }, [card?.id]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
    }
  }, [localContent]);

  const handleSave = useCallback(() => {
    if (!card) return;
    if (localContent !== card.content) {
      onUpdateCard(card.id, { content: localContent });
    }
    if (localTitle !== card.title) {
      onUpdateCard(card.id, { title: localTitle });
    }
  }, [card, localContent, localTitle, onUpdateCard]);

  const handleAction = useCallback(
    (action: string) => {
      if (!card) return;

      // Actions for material
      if (card.type === 'material') {
        if (action === '提炼前提') {
          const parsed = parseInput(localContent);
          if (validateInput(localContent).valid) {
            onGenerateContent(card.id, 'premise', {
              materialContent: localContent,
              inputType: parsed.type,
            });
          }
        }
      }

      // Actions for premise
      if (card.type === 'premise') {
        if (action === '找角度') {
          onGenerateContent(card.id, 'angle', {
            premise: card.content || card.title,
          });
        }
      }

      // Actions for angle
      if (card.type === 'angle') {
        if (action === '生成草稿') {
          const premiseCard = findParentCard(card);
          onGenerateContent(card.id, 'draft', {
            angle: card.content || card.title,
            premise: premiseCard?.content || premiseCard?.title || '',
          });
        }
      }
    },
    [card, localContent, onGenerateContent]
  );

  // Streaming handler
  const { startStream, abort } = useStreaming({
    onChunk: (chunk) => {
      setStreamingContent((prev) => prev + chunk);
    },
    onComplete: () => {
      setIsStreaming(false);
      if (streamingContent && card) {
        onUpdateCard(card.id, { content: streamingContent });
        setLocalContent(streamingContent);
      }
    },
    onError: (err) => {
      console.error('Streaming error:', err);
      setIsStreaming(false);
    },
  });

  if (!card) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <div className="text-center">
          <div className="text-4xl mb-2">🎤</div>
          <p>选择一个卡片开始创作</p>
        </div>
      </div>
    );
  }

  const actions = getCardActions(card.type);

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
          <span className="px-2 py-0.5 bg-gray-100 rounded text-xs">
            {getCardTypeLabel(card.type)}
          </span>
        </div>
        <input
          type="text"
          value={localTitle}
          onChange={(e) => setLocalTitle(e.target.value)}
          onBlur={handleSave}
          className="w-full text-xl font-medium bg-transparent border-none outline-none"
          placeholder="标题..."
        />
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Show streaming content if active */}
        <AnimatePresence>
          {streamingContent && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200 text-sm text-blue-800 whitespace-pre-wrap"
            >
              {streamingContent}
              <span className="inline-block w-2 h-4 bg-blue-400 animate-pulse ml-1" />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main content textarea */}
        <textarea
          ref={textareaRef}
          value={localContent}
          onChange={(e) => setLocalContent(e.target.value)}
          onBlur={handleSave}
          className="w-full min-h-[200px] bg-transparent border-none outline-none resize-none text-gray-800 leading-relaxed"
          placeholder={
            card.type === 'material'
              ? '输入你的素材...（观察、故事、吐槽、对话）'
              : card.type === 'premise'
              ? '前提内容...'
              : card.type === 'angle'
              ? '角度内容...'
              : card.type === 'draft'
              ? '草稿内容...'
              : '改稿内容...'
          }
          disabled={isStreaming}
        />
      </div>

      {/* Action Bar */}
      {actions.length > 0 && (
        <div className="px-4 py-3 border-t border-gray-100">
          <div className="flex flex-wrap gap-2">
            {actions.map((action) => (
              <button
                key={action}
                onClick={() => handleAction(action)}
                disabled={isStreaming}
                className={`
                  px-3 py-1.5 text-sm rounded-lg border transition-colors
                  ${
                    isStreaming
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:border-gray-300'
                  }
                `}
              >
                {action}
              </button>
            ))}
            {isStreaming && (
              <button
                onClick={() => {
                  abort();
                  setIsStreaming(false);
                }}
                className="px-3 py-1.5 text-sm rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
              >
                停止
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper to find parent card (simplified - in real app would use tree traversal)
function findParentCard(card: Card): Card | null {
  // This is a placeholder - in real implementation would traverse the tree
  return null;
}
