import { NextRequest } from 'next/server';
import { createDeepSeekStream, sseResponse } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const content = body?.content || '';
  const system = '你是单口喜剧素材分析助手，只做素材分析。禁止生成前提或完整段子。';
  const prompt = `分析以下素材，提取关键信息。以JSON返回：{"inputType":"observation|story|rant|dialogue|draft","keyTopics":[],"emotionalTone":"anger|resignation|absurdity|self-deprecation|confusion","contradictions":[],"personalStance":"","rawInsights":[]}。\n\n素材：${content}`;
  return sseResponse(createDeepSeekStream(prompt, system));
}
