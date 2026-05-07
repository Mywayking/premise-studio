import { NextRequest } from 'next/server';
import { createDeepSeekStream, sseResponse } from '@/lib/ai';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const content = body?.content || '';
  const action = body?.action || 'generate-draft';
  const system = '你是单口喜剧演员。段子要像真人说话，有停顿感、有情绪、不像作文。';

  let prompt: string;
  const polishMap: Record<string, string> = {
    'shorten': `缩短以下段子20-30%，保留所有punchline：\n\n${content}`,
    'callback': `为以下段子添加callback——在末尾呼应前文细节：\n\n${content}`,
    'colloquial': `把以下文本调整为更自然的说话方式，增加语气词：\n\n${content}`,
    'enhance-punch': `增强以下段子每个punchline的力度：\n\n${content}`,
    'generate-tag': `为以下punchline生成3个tag（追加短句用于叠加笑声），从荒诞、真实、个人化三个方向：\n\n${content}`,
    'topper': `基于以下tag生成1-2个topper（tag之上的叠加，最炸的一句）：\n\n${content}`,
  };

  if (polishMap[action]) {
    prompt = polishMap[action];
  } else {
    prompt = `基于以下角度生成可表演草稿。像真人说话，有停顿感，标注punchline位置。以JSON返回：{"draft":{"text":"","punchlines":[],"estimatedDuration":60,"notes":""}}。\n\n角度：${content}`;
  }
  return sseResponse(createDeepSeekStream(prompt, system));
}
