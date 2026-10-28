export type Role = 'user' | 'editor' | 'writer' | 'reader' | 'designer';

export enum Stage {
  INIT = 'INIT',           // 1. Setup Genre/Tone
  BRIEF = 'BRIEF',         // 2. Story Bible Creation & Approval
  WRITING = 'WRITING',     // 3. Writer is working or Draft is ready
  CRITIQUE = 'CRITIQUE',   // 4. Reader/Critic analysis
  RELEASE = 'RELEASE',     // 5. Final Compilation
}

export interface Asset {
  id: string;
  type: 'image' | 'text' | 'pdf' | 'generated_image';
  name: string;
  url?: string; // For images
  content?: string; // For text
  category: 'reference' | 'style' | 'lore' | 'output';
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  attachments?: Asset[];
}

export interface Chapter {
  id: string;
  title: string;
  content: string;
  status: 'draft' | 'review' | 'final'; // Strict status
  feedback?: string;
}

export interface StoryContext {
  title: string;
  concept: string;
  targetAudience: string;
  styleTone: string;
  outline: string[];
  currentChapterIndex: number;
  chapters: Chapter[];
}

export interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info';
}

export interface TokenUsage {
  input: number;
  output: number;
  total: number;
}

export interface AppState {
  stage: Stage;
  messages: Message[];
  assets: Asset[];
  story: StoryContext;
  isProcessing: boolean;
  activeAgent: Role | null;
  toasts: Toast[];
  tokenUsage: TokenUsage;
}