/* ------------------------------------------------------------------
   Tiered chat with a failover ladder — the spec's routing table as
   DATA, not hardcoded logic. Primary Gemini; on a retriable failure
   hop to the next entry FAST (short delays) instead of sleeping
   through the old 42s backoff ladder. Groq is the last hop when its
   key exists. One entry point for every agent in the engine.
------------------------------------------------------------------- */

import { CHAT_MODEL, CHAT_MODEL_LITE, ProviderError, geminiChat } from "./gemini";
import { GROQ_MODEL, GROQ_MODEL_LITE, groqChat, groqEnabled } from "./groq";

export type ChatTier = "reason" | "fast";

export interface LadderEntry {
  kind: "gemini" | "groq";
  model: string;
  attempts: number;
  delayMs: number; // wait between attempts WITHIN this entry
}

export interface ChatResult {
  text: string;
  provider: string; // the model that served
  hops: number; // entries that failed before the one that served
}

const GEMINI_FALLBACK = process.env.GEMINI_MODEL_FALLBACK ?? "gemini-3.7-flash";

/** the routing table (per spec §7b: config, not hardcoded) */
export function buildLadder(tier: ChatTier, withGroq: boolean): LadderEntry[] {
  const ladder: LadderEntry[] =
    tier === "reason"
      ? [
          { kind: "gemini", model: CHAT_MODEL, attempts: 2, delayMs: 700 },
          { kind: "gemini", model: GEMINI_FALLBACK, attempts: 1, delayMs: 0 },
        ]
      : [{ kind: "gemini", model: CHAT_MODEL_LITE, attempts: 2, delayMs: 500 }];
  if (withGroq) {
    ladder.push(
      tier === "reason"
        ? { kind: "groq", model: GROQ_MODEL, attempts: 2, delayMs: 600 }
        : { kind: "groq", model: GROQ_MODEL_LITE, attempts: 2, delayMs: 500 }
    );
  }
  return ladder;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function retriable(e: unknown): boolean {
  if (e instanceof ProviderError) return e.status === 429 || e.status >= 500;
  return true; // network / fetch failures are retriable
}

export async function chatComplete(
  system: string,
  user: string,
  opts: {
    tier?: ChatTier;
    withGroq?: boolean; // tests force this; production reads the key
    on429?: (entry: LadderEntry) => void;
    onHop?: () => void;
    /** cap gemini thinking tokens for THIS call (spec §7: the planner
     *  demotes before the director — its words are reviewable) */
    thinkingBudget?: number;
    transport?: (e: LadderEntry) => Promise<string>;
  } = {}
): Promise<ChatResult> {
  const tier = opts.tier ?? "reason";
  const transport =
    opts.transport ??
    (async (e: LadderEntry) =>
      e.kind === "gemini"
        ? geminiChat(system, user, {
            model: e.model,
            thinkingBudget: opts.thinkingBudget,
          })
        : groqChat(system, user, e.model));
  const ladder = buildLadder(tier, opts.withGroq ?? groqEnabled());

  let lastErr: unknown = null;
  for (let e = 0; e < ladder.length; e++) {
    const entry = ladder[e];
    for (let a = 0; a < entry.attempts; a++) {
      if (a) await sleep(entry.delayMs);
      try {
        const text = (await transport(entry)).trim();
        if (!text) throw new ProviderError(502, "empty completion");
        return { text, provider: entry.model, hops: e };
      } catch (err) {
        lastErr = err;
        if (err instanceof ProviderError && err.status === 429) opts.on429?.(entry);
        if (!retriable(err)) throw err; // 4xx (≠429): our request is bad everywhere
      }
    }
    if (e < ladder.length - 1) {
      console.warn(`[chat] failover: ${entry.kind}:${entry.model} exhausted, hopping`);
      opts.onHop?.();
    }
  }
  throw lastErr ?? new Error("chat failed on every provider");
}
