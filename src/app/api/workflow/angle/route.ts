import { NextRequest, NextResponse } from 'next/server';
import { DEEPSEEK_API_KEY } from '@/lib/env';

const DEEPSEEK_MODEL = 'deepseek-v4-pro';

interface AngleRequest {
  premise: string;
  count?: number;
}

function buildAnglePrompt(premise: string): string {
  return `你是单口喜剧创作教练。基于以下喜剧前提，按照《手把手教你玩脱口秀》的方法论，找出多个有潜力的喜剧角度。

前提: ${premise}

请找出3-5个不同的喜剧角度，每个角度应该：
1. 是一个独特的"看问题的视角"
2. 能让同一个前提产生完全不同的喜剧效果
3. 考虑：谁是受害者？谁是受益者？预期的反转是什么？

角度类型：
- [攻击型] 攻击某个群体或现象
- [自嘲型] 拿自己开刀
- [荒诞型] 把正常变荒诞
- [逻辑型] 顺着不合理推导
- [身份型] 从不同身份切入

格式：每个角度用一句话概括，简短有力`;
}

export async function POST(req: NextRequest) {
  try {
    const body: AngleRequest = await req.json();
    const { premise, count = 5 } = body;

    if (!premise) {
      return NextResponse.json({ error: '前提不能为空' }, { status: 400 });
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
            content: '你是一个专业的单口喜剧创作教练，擅长从前提找到独特的喜剧角度。',
          },
          {
            role: 'user',
            content: buildAnglePrompt(premise),
          },
        ],
        temperature: 0.8,
        max_tokens: 1500,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Angle API error:', error);
      return NextResponse.json({ error: 'AI 调用失败' }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content || '';

    const angles = content
      .split(/\n/)
      .filter((line: string) => line.trim().length > 3)
      .map((line: string) => line.replace(/^[\d\.\-\*\s]+/, '').trim())
      .filter((line: string) => line.length > 0);

    return NextResponse.json({ angles, raw: content });
  } catch (error) {
    console.error('Angle route error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
