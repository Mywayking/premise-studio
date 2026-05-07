import { createDeepSeekStream, sseResponse } from '@/lib/ai';

export async function POST() {
  const prompt = `分析以下素材，提取关键信息。以JSON返回：{"inputType":"observation|story|rant|dialogue|draft","keyTopics":[],"emotionalTone":"anger|resignation|absurdity|self-deprecation|confusion","contradictions":[],"personalStance":"","rawInsights":[]}。禁止生成前提或完整段子。`;
  return sseResponse(createDeepSeekStream(prompt, '你是单口喜剧素材分析助手，只做素材分析。'));
}
