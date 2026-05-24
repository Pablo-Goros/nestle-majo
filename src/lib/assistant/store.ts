import { loadJson, saveJson } from "@/lib/storage";
import type { ChatMessage } from "./types";

const CHAT_KEY = "nestle_assistant_chat";

export const ASSISTANT_CHANGED_EVENT = "nestle-assistant-changed";

const GREETING =
  "Hola, soy el asistente de Demand Planning. Tengo contexto de forecasts, alertas, consenso, finanzas e MBP según los datos actuales de la plataforma. ¿En qué te ayudo?";

function emitChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(ASSISTANT_CHANGED_EVENT));
  }
}

function createId(): string {
  return `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function getDefaultMessages(): ChatMessage[] {
  return [
    {
      id: createId(),
      role: "assistant",
      content: GREETING,
      createdAt: new Date().toISOString(),
    },
  ];
}

export function loadChatHistory(): ChatMessage[] {
  const parsed = loadJson<ChatMessage[]>(CHAT_KEY, []);
  return parsed.length > 0 ? parsed : getDefaultMessages();
}

export function saveChatHistory(messages: ChatMessage[]): void {
  const trimmed = messages.slice(-50);
  saveJson(CHAT_KEY, trimmed);
  emitChange();
}

export function appendChatMessage(
  role: ChatMessage["role"],
  content: string,
  prev: ChatMessage[],
): ChatMessage[] {
  const next = [
    ...prev,
    {
      id: createId(),
      role,
      content,
      createdAt: new Date().toISOString(),
    },
  ];
  saveChatHistory(next);
  return next;
}

export function clearChatHistory(): ChatMessage[] {
  const fresh = getDefaultMessages();
  saveChatHistory(fresh);
  return fresh;
}
