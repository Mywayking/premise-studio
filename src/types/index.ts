export type CardType = "material" | "premise" | "angle" | "draft" | "rewrite";
export type CardTier = "A" | "B" | "experimental" | "abandoned" | "saver";
export type CardStatus = "idle" | "streaming" | "completed" | "error";
export type LineAnnotationType = "opener" | "setup" | "punchline" | "tag" | "topper" | "act-out" | "transition" | "closer";
export type PerformanceResult = "killed" | "ok" | "bombed";
export type InputType = "observation" | "story" | "rant" | "dialogue" | "draft";
export type EmotionalTone = "anger" | "resignation" | "absurdity" | "self-deprecation" | "confusion";
export type StreamingState = "idle" | "streaming" | "completed" | "timeout" | "error" | "aborted";
export type ErrorCode = "TIMEOUT" | "UNAVAILABLE" | "INVALID";

export interface InputUnderstandingResult {
  inputType: InputType;
  keyTopics: string[];
  emotionalTone: EmotionalTone;
  contradictions: string[];
  personalStance: string;
  rawInsights: string[];
}

export interface PerformanceRecord {
  id: string;
  date: string;
  venue?: string;
  result: PerformanceResult;
  recordingUrl?: string;
  notes?: string;
  createdAt: number;
}

export interface Card {
  id: string;
  type: CardType;
  parentId: string | null;
  childrenIds: string[];
  content: string;
  tier?: CardTier;
  lineAnnotations?: Record<number, LineAnnotationType>;
  performances: PerformanceRecord[];
  inputUnderstanding?: InputUnderstandingResult;
  createdAt: number;
  updatedAt: number;
  status: CardStatus;
}

export interface Session {
  id: string;
  name: string;
  rootCardId: string;
  createdAt: number;
  updatedAt: number;
}

export interface WorkflowRequest {
  cardId: string;
  sessionId: string;
  action: string;
  options?: { lineIndex?: number; performanceContext?: string; content?: string };
}
