import type { AiCorrection, ChatTurn } from '@/data/remote/ai';

/**
 * Shared pieces of the AI conversation practice screen (roadmap item 6):
 * the message model used by the chat UI plus the pure history projection
 * sent to the server on every turn.
 */

/** A rendered chat message; assistant turns carry the Turkish translation. */
export interface ConversationMessage extends ChatTurn {
  /** Turkish translation of an assistant reply (server-provided). */
  replyTr?: string;
  /** Grammar correction for a user message (arrives with the assistant's reply). */
  correction?: AiCorrection | null;
}

/** The server accepts at most 20 history turns (≤ 600 chars each). */
export const HISTORY_LIMIT = 20;

/**
 * The `history` field of the next chat request: every previous turn in order
 * (scenario opener first), reduced to plain { role, text } and trimmed to the
 * last HISTORY_LIMIT entries. The new user message is appended by the caller,
 * never included here.
 */
export function historyFor(messages: ConversationMessage[]): ChatTurn[] {
  return messages.map(({ role, text }) => ({ role, text })).slice(-HISTORY_LIMIT);
}
