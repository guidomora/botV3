import { ChatMessage, Intention } from "src/lib";

export function inferActiveIntent(history: ChatMessage[]): Intention | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const m = history[i];
    if (m.intention) return m.intention;     // p.ej. la última pregunta del bot: CANCEL
  }
  return null;
}