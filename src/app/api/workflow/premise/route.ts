import { NextRequest } from 'next/server';
import { createDeepSeekStream, sseResponse } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const content = body?.content || '';
  const system = '你是单口喜剧创作教练。遵循《手把手教你玩脱口秀》方法论。';
  const prompt = `基于以下素材，提炼3-5个喜剧前提。每个前提必须有态度、有普遍性、有冲突、有发挥空间。以JSON返回：{"premises":[{"statement":"","attitude":"","conflict":"","potential":""}]}。禁止：生成完整段子、无态度的客观事实陈述。\n\n素材：${content}`;
  return sseResponse(createDeepSeekStream(prompt, system));
}
