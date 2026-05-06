import { InputType } from '@/types';

interface ParsedInput {
  type: InputType;
  confidence: number;
  raw: string;
  cleaned: string;
  entities?: {
    people?: string[];
    locations?: string[];
    emotions?: string[];
  };
}

// Pattern-based input type detection
const PATTERNS = {
  observation: [
    /^(我发现?|我觉得?|注意到?|观察到?|奇怪|居然|竟然|没想到)/,
    /^(大街上|地铁里|网上|朋友圈|新闻|热搜)/,
  ],
  story: [
    /^(昨天|今天|上周|上个月|小时候|有一次|曾经)/,
    /^(我去|我跟|我妈|我爸|朋友|同事).*说/,
    /然后|结果|最后|没想到/,
  ],
  rant: [
    /\?{3,}|!{2,}/,
    /真是|太|无比|简直|怎么(又|都|总是)/,
    /受不了|崩溃|无语|吐了|气死了/,
  ],
  dialogue: [
    /^[""'](.+?)[""']\s*[:：]/,
    /[：:]\s*[""'](.+?)[""']$/,
    /他说|我说|你听|你懂|我说啊/,
  ],
};

function detectInputType(text: string): { type: InputType; confidence: number } {
  const trimmed = text.trim();
  const scores: Record<InputType, number> = {
    observation: 0,
    story: 0,
    rant: 0,
    dialogue: 0,
    draft: 0,
  };

  // Check patterns
  for (const [type, patterns] of Object.entries(PATTERNS)) {
    for (const pattern of patterns as RegExp[]) {
      if (pattern.test(trimmed)) {
        scores[type as InputType] += 0.3;
      }
    }
  }

  // Length heuristics
  if (trimmed.length < 50) {
    scores.observation += 0.2;
  } else if (trimmed.length > 200) {
    scores.story += 0.2;
  }

  // Rant detection - high punctuation density
  const exclamationCount = (trimmed.match(/!/g) || []).length;
  const questionCount = (trimmed.match(/\?/g) || []).length;
  if (exclamationCount + questionCount > trimmed.length / 30) {
    scores.rant += 0.4;
  }

  // Dialogue detection - quotation marks
  const hasQuotes = /[""']/.test(trimmed);
  if (hasQuotes) {
    scores.dialogue += 0.5;
  }

  // Check for "draft" keyword
  if (/草稿|段子|笑话|笑点|梗/.test(trimmed)) {
    scores.draft += 0.3;
  }

  // Find highest score
  let maxType: InputType = 'observation';
  let maxScore = 0;
  for (const [type, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      maxType = type as InputType;
    }
  }

  // Normalize confidence
  const confidence = Math.min(maxScore, 1);

  return { type: maxType, confidence };
}

function extractEntities(text: string) {
  const entities: ParsedInput['entities'] = {};

  // Simple entity extraction
  const peopleMatches = text.match(/(我爸|我妈|我朋友|我同事|我老板|我老婆|我老公|隔壁老王)/g);
  if (peopleMatches) {
    entities.people = [...new Set(peopleMatches)];
  }

  const emotionWords = [
    '尴尬', '社死', '崩溃', '无语', '搞笑', '离谱',
    '生气', '郁闷', '开心', '惊喜', '意外', '后悔',
  ];
  const foundEmotions = emotionWords.filter((w) => text.includes(w));
  if (foundEmotions.length > 0) {
    entities.emotions = foundEmotions;
  }

  return entities;
}

function cleanText(text: string): string {
  return text
    .replace(/^[""']|[""']$/g, '') // Remove surrounding quotes
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

export function parseInput(rawText: string): ParsedInput {
  const cleaned = cleanText(rawText);
  const { type, confidence } = detectInputType(rawText);
  const entities = extractEntities(cleaned);

  return {
    type,
    confidence,
    raw: rawText,
    cleaned,
    entities,
  };
}

export function validateInput(text: string): { valid: boolean; error?: string } {
  if (!text || text.trim().length === 0) {
    return { valid: false, error: '输入不能为空' };
  }
  if (text.trim().length < 5) {
    return { valid: false, error: '输入太短，至少需要5个字符' };
  }
  if (text.trim().length > 10000) {
    return { valid: false, error: '输入太长，最多10000个字符' };
  }
  return { valid: true };
}
