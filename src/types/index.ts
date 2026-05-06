// Card Types
export type CardType = 'material' | 'premise' | 'angle' | 'draft' | 'rewrite';

// Input Types for material
export type InputType = 'observation' | 'story' | 'rant' | 'dialogue' | 'draft';

export interface Card {
  id: string;
  type: CardType;
  title: string;
  content: string;
  children: Card[];
  createdAt: number;
  updatedAt: number;
  version?: number; // for drafts/rewrites
  parentId?: string;
  inputType?: InputType; // for material cards
}

export interface Session {
  id: string;
  name: string;
  rootCard: Card;
  activeCardId: string | null;
  createdAt: number;
  updatedAt: number;
}

// AI Model config
export interface ModelConfig {
  streamingModel: string; // MiniMax for streaming
  quickModel: string; // DeepSeek for quick calls
}
