import { GoogleGenAI } from "@google/genai";
import { MATH_SYSTEM_PROMPT } from "../constants";

export type ModelProvider = "google" | "groq" | "nvidia" | "openrouter";

export interface AIModel {
  id: string;
  apiId?: string;
  name: string;
  provider: ModelProvider;
  description: string;
  badge?: "Fast" | "Smart" | "Balanced";
}

export const SUPPORTED_MODELS: AIModel[] = [
  {
    id: "nvidia-gpt-oss-120b",
    apiId: "openai/gpt-oss-120b",
    name: "Framr Intelligence (Ultra)",
    provider: "nvidia",
    description: "Our most powerful reasoning logic",
    badge: "Smart",
  },
  {
    id: "openrouter-gpt-oss-120b",
    apiId: "openai/gpt-oss-120b",
    name: "Framr Intelligence (Pro)",
    provider: "openrouter",
    description: "High-intelligence reasoning fallback",
    badge: "Smart",
  },
  {
    id: "gemini-1.5-flash",
    name: "Framr Flash",
    provider: "google",
    description: "Fast, efficient responses",
    badge: "Fast",
  },
  {
    id: "llama3-70b-8192",
    name: "Groq Llama 3 70B",
    provider: "groq",
    description: "Best for speed + coding tasks",
    badge: "Fast",
  },
  {
    id: "meta/llama-3.1-70b-instruct",
    name: "NVIDIA Llama 3.1 70B",
    provider: "nvidia",
    description: "NVIDIA NIM optimized inference",
    badge: "Smart",
  },
  {
    id: "nvidia/llama-3.1-nemotron-70b-instruct",
    name: "Nemotron 70B",
    provider: "nvidia",
    description: "NVIDIA's flagship smart model",
    badge: "Smart",
  },
  {
    id: "meta-llama/llama-3-70b-instruct",
    name: "Llama 3 70B (OpenRouter)",
    provider: "openrouter",
    description: "Balanced reasoning performance",
    badge: "Balanced",
  },
];

export async function routeModel(message: string, currentModelId?: string): Promise<AIModel> {
  if (currentModelId) {
    const model = SUPPORTED_MODELS.find(m => m.id === currentModelId);
    if (model) return model;
  }

  // Default to GPT OSS 120B as primary
  return SUPPORTED_MODELS[0];
}

export async function* streamChat(model: AIModel, messages: any[]) {
  console.log(`[CLIENT DEBUG] Requesting AI: ${model.name} (${model.provider})`);
  
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages: [
        { role: "system", content: MATH_SYSTEM_PROMPT },
        ...messages.map(m => ({ role: m.role, content: m.content }))
      ],
      stream: true,
      provider: model.provider,
      modelId: model.apiId || model.id
    }),
  });

  // Log headers for debugging
  const usedProvider = response.headers.get("X-AI-Provider");
  const usedModel = response.headers.get("X-AI-Model");
  if (usedProvider && usedModel) {
    console.log(`[CLIENT DEBUG] Actually used Provider: ${usedProvider}`);
    console.log(`[CLIENT DEBUG] Actually used Model: ${usedModel}`);
  }

  if (!response.ok) {
    const errText = await response.text();
    let errData = { reply: "Unable to reach AI model" };
    try { errData = JSON.parse(errText); } catch(e) {}
    console.error(`[CLIENT DEBUG] Response Error:`, errText);
    throw new Error(errData.reply || "Unable to reach AI model");
  }

  const reader = response.body?.getReader();
  const decoder = new TextDecoder();

  if (!reader) return;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    
    const chunk = decoder.decode(value);
    const lines = chunk.split("\n");
    
    for (const line of lines) {
      if (line.trim().startsWith("data: ")) {
        const data = line.trim().slice(6);
        if (data === "[DONE]") break;
        try {
          const json = JSON.parse(data);
          const content = json.choices[0]?.delta?.content || "";
          if (content) yield content;
        } catch (e) {
          // Handle potential partial JSON in a chunk
        }
      }
    }
  }
}
