import { NextRequest, NextResponse } from 'next/server';
import { DEEPSEEK_API_KEY } from '@/lib/env';

const DEEPSEEK_MODEL = 'deepseek-v4-pro';

interface PremiseRequest {
  materialContent: string;
  inputType: string;
  count?: number; // number of premise options to generate
}

function buildPremisePrompt(material: string, inputType: string): string {
  return `你是单口喜剧创作教练。基于以下素材，按照《手把手教你玩脱口秀》的方法论，提炼出多个有潜力的喜剧前提。

素材类型: ${inputType}
素材内容:
${material}

请提炼3-5个喜剧前提。每个前提应该：
1. 是一个能产生喜剧效果的"如果...会怎样"的情境
2. 有明确的目标和障碍
3. 能引发真实或荒诞的笑声

格式要求：
- 每个前提用一句话概括
- 简短有力，适合作为段子的核心冲突
- 标注前提类型：[现实观察]、[个人经历]、[社会讽刺]、[荒诞假设]
`;
}

export async function POST(req: NextRequest) {
  try {
    const body: PremiseRequest = await req.json();
    const { materialContent, inputType, count = 5 } = body;

    if (!materialContent) {
      return NextResponse.json(
        { error: '素材内容不能为空' },
        { status: 400 }
      );
    }

    const apiKey = DEEPSEEK_API_KEY || process.env.DEEPSEEK_API_KEY;

    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: DEEPSEEK_MODEL,
        messages: [
          {
            role: 'system',
            content: '你是一个专业的单口喜剧创作教练，擅长从生活素材中提炼喜剧前提。',
          },
          {
            role: 'user',
            content: buildPremisePrompt(materialContent, inputType),
          },
        ],
        temperature: 0.8,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Premise API error:', error);
      return NextResponse.json(
        { error: 'AI 调用失败' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    // Parse premises from response
    const premises = content
      .split(/\n/)
      .filter((line: string) => line.trim().length > 5)
      .map((line: string) => line.replace(/^[\d\.\-\*\s]+/, '').trim())
      .filter((line: string) => line.length > 0);

    return NextResponse.json({ premises, raw: content });
  } catch (error) {
    console.error('Premise route error:', error);
    return NextResponse.json(
      { error: '服务器错误' },
      { status: 500 }
    );
  }
}
