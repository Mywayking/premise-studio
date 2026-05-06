'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useSessionStore } from '@/store/sessionStore';
import { useCardTreeStore } from '@/store/cardTreeStore';
import { CardTreePanel } from '@/components/CardTree';
import { Editor } from '@/components/Editor';
import { ActionPanel } from '@/components/ActionPanel';
import { Card, CardType } from '@/types';
import { parseInput, validateInput } from '@/lib/inputUnderstanding';
import { useStreaming } from '@/hooks/useStreaming';

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export default function Home() {
  const { sessions, currentSessionId, createSession, updateSession, setCurrentSession } =
    useSessionStore();
  const { createCard, updateCard, findCard, appendChild } = useCardTreeStore();

  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showMobilePanel, setShowMobilePanel] = useState(false);

  // Get current session
  const currentSession = sessions.find((s) => s.id === currentSessionId);

  // Initialize with a session if none exists
  useEffect(() => {
    if (sessions.length === 0) {
      createSession();
    }
  }, [sessions.length, createSession]);

  // Streaming state
  const [streamingCardId, setStreamingCardId] = useState<string | null>(null);
  const [streamingContent, setStreamingContent] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleSelectCard = useCallback((cardId: string) => {
    setActiveCardId(cardId);
    setShowMobileSidebar(false);
    setShowMobilePanel(false);
  }, []);

  const handleAddChild = useCallback(
    (parentId: string, type: CardType, title: string) => {
      if (!currentSession) return;
      const { newCard, updatedRoot } = createCard(
        currentSession.rootCard,
        parentId,
        type,
        title
      );
      updateSession(currentSession.id, { rootCard: updatedRoot });
      setActiveCardId(newCard.id);
    },
    [currentSession, createCard, updateSession]
  );

  const handleUpdateCard = useCallback(
    (cardId: string, updates: Partial<Card>) => {
      if (!currentSession) return;
      const updatedRoot = updateCard(currentSession.rootCard, cardId, updates);
      updateSession(currentSession.id, { rootCard: updatedRoot });
    },
    [currentSession, updateCard, updateSession]
  );

  // Handle AI content generation with streaming
  const handleGenerateContent = useCallback(
    async (cardId: string, targetType: CardType, options: Record<string, string>) => {
      if (!currentSession) return;

      // Determine which API to call based on target type
      let endpoint = '';
      let body: Record<string, unknown> = {};

      if (targetType === 'premise') {
        endpoint = '/api/workflow/premise';
        body = {
          materialContent: options.materialContent,
          inputType: options.inputType,
        };
      } else if (targetType === 'angle') {
        endpoint = '/api/workflow/angle';
        body = { premise: options.premise };
      } else if (targetType === 'draft') {
        endpoint = '/api/workflow/draft';
        body = {
          angle: options.angle,
          premise: options.premise,
        };
      } else {
        return;
      }

      // For premise and angle (non-streaming), call API and create new cards
      if (targetType === 'premise' || targetType === 'angle') {
        try {
          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });

          const data = await response.json();
          if (data.error) {
            console.error('API error:', data.error);
            return;
          }

          // Create child cards with the generated content
          const items = targetType === 'premise' ? data.premises : data.angles;
          const titlePrefix = targetType === 'premise' ? '前提' : '角度';

          for (let i = 0; i < items.length; i++) {
            const item = items[i];
            const newCard: Card = {
              id: generateId(),
              type: targetType,
              title: `${titlePrefix} ${i + 1}`,
              content: item,
              children: [],
              createdAt: Date.now(),
              updatedAt: Date.now(),
            };
            const updatedRoot = appendChild(currentSession.rootCard, cardId, newCard);
            updateSession(currentSession.id, { rootCard: updatedRoot });
          }
        } catch (error) {
          console.error('Error generating content:', error);
        }
        return;
      }

      // For draft (streaming), start streaming response
      if (targetType === 'draft') {
        setStreamingCardId(cardId);
        setStreamingContent('');

        try {
          const controller = new AbortController();
          abortControllerRef.current = controller;

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            signal: controller.signal,
          });

          if (!response.ok) {
            throw new Error('Request failed');
          }

          const reader = response.body?.getReader();
          if (!reader) throw new Error('No reader');

          const decoder = new TextDecoder();
          let buffer = '';

          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  // Create the draft card with the streamed content
                  const draftCard: Card = {
                    id: generateId(),
                    type: 'draft',
                    title: '草稿 v1',
                    content: streamingContent,
                    children: [],
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                  };
                  const updatedRoot = appendChild(
                    currentSession.rootCard,
                    cardId,
                    draftCard
                  );
                  updateSession(currentSession.id, { rootCard: updatedRoot });

                  setStreamingCardId(null);
                  setStreamingContent('');
                  return;
                }
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.error) {
                    throw new Error(parsed.error);
                  }
                  if (parsed.content) {
                    setStreamingContent((prev) => prev + parsed.content);
                  }
                } catch {
                  // Skip malformed JSON
                }
              }
            }
          }
        } catch (error) {
          if ((error as Error).name !== 'AbortError') {
            console.error('Streaming error:', error);
          }
          setStreamingCardId(null);
          setStreamingContent('');
        }
      }
    },
    [currentSession, appendChild, updateSession, streamingContent]
  );

  const handleAction = useCallback(
    (cardId: string, action: string) => {
      if (!currentSession) return;

      const card = findCard(currentSession.rootCard, cardId);
      if (!card) return;

      // Map actions to generation calls
      if (card.type === 'material' && action === '提炼前提') {
        const parsed = parseInput(card.content);
        if (validateInput(card.content).valid) {
          handleGenerateContent(cardId, 'premise', {
            materialContent: card.content,
            inputType: parsed.type,
          });
        }
      } else if (card.type === 'premise' && action === '找角度') {
        handleGenerateContent(cardId, 'angle', {
          premise: card.content || card.title,
        });
      } else if (card.type === 'angle' && action === '生成草稿') {
        // Find parent premise
        const premiseContent = card.content || card.title;
        handleGenerateContent(cardId, 'draft', {
          angle: premiseContent,
          premise: premiseContent,
        });
      } else if (card.type === 'draft' && action === '改稿') {
        // Call rewrite API with streaming
        // Similar to draft generation
      }
    },
    [currentSession, findCard, handleGenerateContent]
  );

  const handleNewSession = useCallback(() => {
    createSession();
  }, [createSession]);

  // Get active card
  const activeCard = currentSession
    ? findCard(currentSession.rootCard, activeCardId || '')
    : null;

  // If there's a streaming card, show streaming content in editor
  const displayCard = streamingCardId && currentSession
    ? {
        ...(findCard(currentSession.rootCard, streamingCardId) || {
          id: streamingCardId,
          type: 'draft' as CardType,
          title: '生成中...',
          content: streamingContent,
          children: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        }),
        content: streamingContent,
      }
    : activeCard;

  return (
    <div className="h-screen flex flex-col">
      {/* Header */}
      <header className="h-14 flex items-center justify-between px-4 border-b border-gray-200 bg-white shrink-0">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎤</span>
            <h1 className="font-semibold text-gray-800">Premise Studio</h1>
          </div>
          <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded">
            V1
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Session selector */}
          <select
            value={currentSessionId || ''}
            onChange={(e) => setCurrentSession(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-2 py-1.5 bg-white"
          >
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          <button
            onClick={handleNewSession}
            className="text-sm px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            新会话
          </button>

          {/* Mobile toggle buttons */}
          <button
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700"
          >
            ☰
          </button>
        </div>
      </header>

      {/* Main Content - Three Column Layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar - Card Tree */}
        <aside
          className={`
            w-[390px] border-r border-gray-200 bg-white shrink-0
            lg:block hidden lg:block
            ${showMobileSidebar ? 'block' : 'hidden lg:block'}
          `}
        >
          <div className="h-full flex flex-col">
            <div className="px-4 py-3 border-b border-gray-100">
              <h2 className="text-sm font-medium text-gray-600">素材树</h2>
            </div>
            <div className="flex-1 overflow-y-auto">
              {currentSession && (
                <CardTreePanel
                  card={currentSession.rootCard}
                  activeCardId={activeCardId}
                  onSelectCard={handleSelectCard}
                  onAddChild={handleAddChild}
                />
              )}
            </div>
          </div>
        </aside>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {showMobileSidebar && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-40 lg:hidden"
                onClick={() => setShowMobileSidebar(false)}
              />
              <motion.aside
                initial={{ x: -280 }}
                animate={{ x: 0 }}
                exit={{ x: -280 }}
                transition={{ type: 'spring', damping: 25 }}
                className="fixed left-0 top-14 bottom-0 w-[280px] bg-white border-r border-gray-200 z-50 lg:hidden"
              >
                <div className="h-full flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-sm font-medium text-gray-600">素材树</h2>
                    <button
                      onClick={() => setShowMobileSidebar(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    {currentSession && (
                      <CardTreePanel
                        card={currentSession.rootCard}
                        activeCardId={activeCardId}
                        onSelectCard={handleSelectCard}
                        onAddChild={handleAddChild}
                      />
                    )}
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        {/* Center - Editor */}
        <main className="flex-1 bg-white overflow-hidden">
          <Editor
            card={displayCard}
            onUpdateCard={handleUpdateCard}
            onGenerateContent={handleGenerateContent}
          />
        </main>

        {/* Right Panel - Actions */}
        <aside
          className={`
            w-80 border-l border-gray-200 bg-white shrink-0
            xl:block hidden
            ${showMobilePanel ? 'block' : 'hidden xl:block'}
          `}
        >
          <ActionPanel card={activeCard} onAction={handleAction} />
        </aside>

        {/* Mobile Panel Toggle */}
        <button
          onClick={() => setShowMobilePanel(!showMobilePanel)}
          className="fixed right-4 bottom-4 w-12 h-12 bg-blue-500 text-white rounded-full shadow-lg flex items-center justify-center xl:hidden z-30"
        >
          ⚡
        </button>

        {/* Mobile Panel Overlay */}
        <AnimatePresence>
          {showMobilePanel && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/30 z-40 xl:hidden"
                onClick={() => setShowMobilePanel(false)}
              />
              <motion.aside
                initial={{ x: 320 }}
                animate={{ x: 0 }}
                exit={{ x: 320 }}
                transition={{ type: 'spring', damping: 25 }}
                className="fixed right-0 top-14 bottom-0 w-[320px] bg-white border-l border-gray-200 z-50 xl:hidden"
              >
                <div className="h-full flex flex-col">
                  <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center">
                    <h2 className="text-sm font-medium text-gray-600">操作面板</h2>
                    <button
                      onClick={() => setShowMobilePanel(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ✕
                    </button>
                  </div>
                  <div className="flex-1 overflow-y-auto">
                    <ActionPanel card={activeCard} onAction={handleAction} />
                  </div>
                </div>
              </motion.aside>
            </>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
