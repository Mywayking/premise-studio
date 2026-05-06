'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardType } from '@/types';
import { useCardTreeStore } from '@/store/cardTreeStore';

interface ActionPanelProps {
  card: Card | null;
  onAction: (cardId: string, action: string, params?: Record<string, string>) => void;
}

const ACTION_CONFIGS: Record<string, { icon: string; description: string }> = {
  '提炼前提': { icon: '💡', description: '从素材中提炼喜剧前提' },
  '提取情绪': { icon: '🎭', description: '提取素材中的情绪元素' },
  '提取冲突': { icon: '⚔️', description: '提取素材中的核心冲突' },
  '找角度': { icon: '🎯', description: '为前提找到独特的喜剧角度' },
  '加强攻击性': { icon: '🔥', description: '增强段子的攻击性和张力' },
  '更荒诞': { icon: '🌙', description: '让段子更荒诞有趣' },
  '更真实': { icon: '💯', description: '让段子更接地气真实' },
  '生成草稿': { icon: '✍️', description: '基于角度生成段子草稿' },
  '增加细节': { icon: '🔍', description: '为草稿增加真实细节' },
  '增强情绪': { icon: '💥', description: '增强段子的情绪感染力' },
  '改稿': { icon: '🔧', description: '全面改稿优化' },
  '缩短': { icon: '✂️', description: '精简段子去掉冗余' },
  'callback': { icon: '🔄', description: '增加回扣呼应前文' },
  '更口语化': { icon: '🗣️', description: '让表达更自然口语' },
  '再改稿': { icon: '🔁', description: '继续优化改稿' },
  '比较版本': { icon: '📊', description: '对比新旧版本' },
  '分支创作': { icon: '🌿', description: '从当前版本分支创作' },
};

interface VersionHistoryProps {
  card: Card;
  onCompare: (cardId: string) => void;
}

function VersionHistory({ card, onCompare }: VersionHistoryProps) {
  if (!card.children.length) return null;

  return (
    <div className="mt-4">
      <h4 className="text-xs font-medium text-gray-500 uppercase mb-2">
        历史版本
      </h4>
      <div className="space-y-2">
        {card.children.map((child, index) => (
          <motion.div
            key={child.id}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="p-2 bg-gray-50 rounded-lg text-sm"
          >
            <div className="flex items-center justify-between">
              <span className="text-gray-600">
                v{index + 1} · {child.title}
              </span>
              <button
                onClick={() => onCompare(child.id)}
                className="text-xs text-blue-500 hover:underline"
              >
                对比
              </button>
            </div>
            <p className="text-gray-500 text-xs mt-1 truncate">
              {child.content.slice(0, 50)}...
            </p>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

export function ActionPanel({ card, onAction }: ActionPanelProps) {
  const [showVersions, setShowVersions] = useState(false);
  const { getCardActions, getCardTypeLabel } = useCardTreeStore();

  if (!card) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400 p-4">
        <div className="text-center text-sm">
          <div className="text-3xl mb-2">⚡</div>
          <p>选择一个卡片</p>
          <p className="mt-1">查看可用操作</p>
        </div>
      </div>
    );
  }

  const actions = getCardActions(card.type);

  return (
    <div className="h-full overflow-y-auto p-4">
      {/* Card Info */}
      <div className="mb-4">
        <span
          className={`
            inline-block px-2 py-1 rounded text-xs font-medium
            ${card.type === 'material' ? 'bg-amber-100 text-amber-700' : ''}
            ${card.type === 'premise' ? 'bg-blue-100 text-blue-700' : ''}
            ${card.type === 'angle' ? 'bg-purple-100 text-purple-700' : ''}
            ${card.type === 'draft' ? 'bg-green-100 text-green-700' : ''}
            ${card.type === 'rewrite' ? 'bg-rose-100 text-rose-700' : ''}
          `}
        >
          {getCardTypeLabel(card.type)}
        </span>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 mb-6">
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-medium text-gray-800">
            {card.content.length}
          </div>
          <div className="text-xs text-gray-500">字符数</div>
        </div>
        <div className="p-3 bg-gray-50 rounded-lg">
          <div className="text-2xl font-medium text-gray-800">
            {card.children.length}
          </div>
          <div className="text-xs text-gray-500">子节点</div>
        </div>
      </div>

      {/* Actions */}
      <div className="mb-6">
        <h3 className="text-xs font-medium text-gray-500 uppercase mb-3">
          可用操作
        </h3>
        <div className="space-y-2">
          <AnimatePresence>
            {actions.map((action, index) => {
              const config = ACTION_CONFIGS[action] || {
                icon: '➡️',
                description: action,
              };
              return (
                <motion.button
                  key={action}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  onClick={() => onAction(card.id, action)}
                  className="w-full p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-left group"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{config.icon}</span>
                    <span className="font-medium text-gray-800">{action}</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    {config.description}
                  </p>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      {/* Version History for drafts/rewrites */}
      {(card.type === 'draft' || card.type === 'rewrite') && (
        <VersionHistory
          card={card}
          onCompare={(id) => console.log('Compare', id)}
        />
      )}

      {/* Tips */}
      <div className="mt-6 p-3 bg-yellow-50 rounded-lg border border-yellow-100">
        <h4 className="text-xs font-medium text-yellow-800 mb-1">💡 创作提示</h4>
        <p className="text-xs text-yellow-700">
          {card.type === 'material' &&
            '好的素材来源于真实的生活观察。试着回忆具体的场景、人物和对话。'}
          {card.type === 'premise' &&
            '前提是段子的核心冲突。一个好的前提应该有一个清晰的目标和障碍。'}
          {card.type === 'angle' &&
            '角度决定了你怎么看这个前提。试着从不同身份、不同立场思考。'}
          {card.type === 'draft' &&
            '初稿不要追求完美，先把想法倒出来。后续我们会帮你打磨。'}
          {card.type === 'rewrite' &&
            '改稿是让段子更精准的过程。每次改稿只解决一个问题。'}
        </p>
      </div>
    </div>
  );
}
