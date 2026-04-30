import { AIProvider } from './services/aiService';

export interface ModelConfig {
  id: string;
  name: string;
  provider: AIProvider;
  description: string;
  icon: string; // Simple Icons key or Lucide icon name
  modelName: string; // Real model name used by API
}

export const MODELS: ModelConfig[] = [
  {
    id: 'gpt-5-4',
    name: 'GPT 5.4',
    provider: AIProvider.NVIDIA,
    description: 'High performance compute by NVIDIA',
    icon: 'openai',
    modelName: 'meta/llama-3.1-405b-instruct'
  },
  {
    id: 'manus-1-6',
    name: 'Manus 1.6',
    provider: AIProvider.GROQ,
    description: 'Ultra-fast inference (Llama 3 70B)',
    icon: 'meta',
    modelName: 'llama3-70b-8192'
  },
  {
    id: 'gemini-3-pro',
    name: 'Gemini 3 Pro',
    provider: AIProvider.OPENROUTER,
    description: 'Advanced reasoning via OpenRouter',
    icon: 'google',
    modelName: 'google/gemma-2-27b-it'
  }
];

export const DEFAULT_MODEL_ID = 'gpt-5-4';
