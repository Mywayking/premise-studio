import { NextRequest, NextResponse } from 'next/server';
import { MOONSHOT_API_KEY } from '@/lib/env';

const MINIMAX_STREAMING_MODEL = 'MiniMax-M2.7';

interface DraftRequest {
  angle: string;
  premise: string;
  action?: string; // 'generate' | 'add_detail' | 'enhance_emotion'
  context?: string; // previous draft content for enhancement
}

function buildDraftPrompt(
  angle: string,
  premise: string,
  action: string = 'generate',
  context?: string
): string {
  const baseInstruction = `你是单口喜剧演员。基于以下前提和角度，写一段60-90秒的单口段子（中文）。

前提: ${premise}
角度: ${angle}

要求：
- 真实、接地气、有细节
- 有call-back潜力
- 节奏感强，口语化
- 不要凑字数，要精准
`;

  if (action === 'add_detail' && context) {
    return `${baseInstruction}

这是一段已有草稿，请增加更多真实细节和生活场景：

已有草稿:
${context}

增加3-5个具体的细节描写（动作、表情、环境、语气），让段子更生动。`;
  }

  if (action === 'enhance_emotion' && context) {
    return `${baseInstruction}

这是一段已有草稿，请增强情绪张力：

已有草稿:
${context}

增强情绪感染力，让笑点更有爆发力。注意保持段子的真实性。`;
  }

  return baseInstruction;
}

export async function POST(req: NextRequest) {
  try {
    const body: DraftRequest = await req.json();
    const { angle, premise, action = 'generate', context } = body;

    if (!angle || !premise) {
      return NextResponse.json(
        { error: '角度和前提不能为空' },
        { status: 400 }
      );
    }

    const apiKey = MOONSHOT_API_KEY || process.env.MOONSHOT_API_KEY;
    const prompt = buildDraftPrompt(angle, premise, action, context);

    // Streaming response using ReadableStream
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
                    content: '你是一个专业的单口喜剧演员，擅长写真实、有共鸣的段子。',
                  },
                  {
                    role: 'user',
                    content: prompt,
                  },
                ],
                temperature: 0.85,
                max_tokens: 800,
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
    console.error('Draft route error:', error);
    return NextResponse.json({ error: '服务器错误' }, { status: 500 });
  }
}
