import { NextRequest } from 'next/server';
import { createDeepSeekStream, sseResponse } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const content = body?.content || '';
  const action = body?.action || 'rewrite';
  const system = '你是单口喜剧改稿教练。让段子更精准、更有力。';

  const promptMap: Record<string, string> = {
    're-rewrite': `在已改稿基础上继续打磨：\n\n${content}`,
    'branch': `从以下版本出发，生成一个显著不同的风格变体：\n\n${content}`,
    'performance-script': `把以下段子调成演出稿。标注停顿（//）、重音（**粗体**）、气口（/）、情绪提示（【愤怒】【无奈】等）：\n\n${content}`,
    'compare': `对比分析以下版本的差异和改动类型：\n\n${content}`,
  };
  const prompt = promptMap[action] || `优化以下草稿：增强punch、增强节奏、寻找callback机会、精简。\n\n${content}`;
  return sseResponse(createDeepSeekStream(prompt, system));
}
