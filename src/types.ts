import { AIProvider, ChatMessage } from './services/aiService';

export interface ChatSession {
  id: string;
  title: string;
  messages: ChatMessage[];
  provider: AIProvider;
  isPinned: boolean;
  createdAt: number;
}
