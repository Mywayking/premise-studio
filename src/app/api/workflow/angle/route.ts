import { NextRequest } from 'next/server';
import { createDeepSeekStream, sseResponse } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const content = body?.content || '';
  const system = '你是单口喜剧创作教练。擅长从前提找到独特的喜剧角度。';
  const prompt = `基于以下前提，探索3-5个不同角度（字面化/系统化/情绪化/身份错位/极端推演）。以JSON返回：{"angles":[{"type":"","description":"","opening":"","direction":""}]}。\n\n前提：${content}`;
  return sseResponse(createDeepSeekStream(prompt, system));
}
