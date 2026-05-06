import { NextRequest, NextResponse } from 'next/server';
import { MOONSHOT_API_KEY } from '@/lib/env';

const MINIMAX_STREAMING_MODEL = 'MiniMax-M2.7';

type RewriteAction = 'shorten' | 'callback' | 'colloquial' | 'rewrite';

interface RewriteRequest {
  draft: string;
  action: RewriteAction;
  context?: string; // for callback, additional context
}

function buildRewritePrompt(draft: string, action: RewriteAction, context?: string): string {
  const base = `你是单口喜剧改稿教练。参考原文，进行改写。\n\n原文:\n${draft}`;

  switch (action) {
    case 'shorten':
      return `${base}\n\n请缩短原文，去掉冗余表述，保留核心笑点。目标是精简30%，同时保持段子的节奏感和爆发力。`;

    case 'callback':
      return `${base}\n\n请在结尾增加一个callback（回扣），呼应前文的某个细节或词语，制造"原来如此"的笑果。`;

    case 'colloquial':
      return `${base}\n\n请改写成更口语化的表达，像朋友聊天一样自然。去掉书面语，增加语气词和口头禅。`;

    case 'rewrite':
    default:
      return `${base}\n\n请重新改写这个段子，可以调整结构、增强笑点、或改变节奏。让它更有喜剧效果。`;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: RewriteRequest = await req.json();
    const { draft, action = 'rewrite', context } = body;

    if (!draft) {
      return NextResponse.json({ error: '草稿内容不能为空' }, { status: 400 });
    }

    const apiKey = MOONSHOT_API_KEY || process.env.MOONSHOT_API_KEY;
    const prompt = buildRewritePrompt(draft, action, context);

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
      async start(controller) {
        try {
          const response = await fetch(
            'https://api.moonshot.cn/v1/chat/completions',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model: MINIMAX_STREAMING_MODEL,
                messages: [
                  {
                    role: 'system',
                    content: '你是一个专业的单口喜剧改稿教练，擅长让段子更加精准、有力。',
                  },
                  {
                    role: 'user',
                    content: prompt,
                  },
                ],
                temperature: 0.8,
                max_tokens: 600,
                stream: true,
              }),
            }
          );

          if (!response.ok) {
            const error = await response.text();
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ error: 'AI 调用失败' })}\n\n`)
            );
            controller.close();
            return;
          }

          const reader = response.body?.getReader();
          if (!reader) {
            controller.close();
            return;
          }

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
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                } else {
                  try {
                    const parsed = JSON.parse(data);
                    const content = parsed.choices?.[0]?.delta?.content;
                    if (content) {
                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ content })}\n\n`)
                      );
                    }
                  } catch {
                    // Skip malformed JSON
                  }
                }
              }
            }
          }

          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        } catch (error) {
          console.error('Streaming error:', error);
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ error: '流式输出错误' })}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Rewrite route error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
