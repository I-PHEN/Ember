/* ------------------------------------------------------------------
   Ember's model provider — Google AI Studio (Gemini) over plain REST.

   One free API key covers BOTH the chat agents and the voice. Zero SDK
   dependencies — fetch + JSON only — so the engine stays portable and
   the z-ai coupling is gone entirely.

   Env (all optional except the key):
     GEMINI_API_KEY      required — free from aistudio.google.com
     GEMINI_MODEL        default gemini-3.8-flash       (reasoning tier)
     GEMINI_MODEL_LITE   default gemini-3.8-flash-lite  (speed tier)
     GEMINI_TTS_MODEL    default gemini-3.8-flash-lite-tts
     GEMINI_TTS_VOICE    default Aoede — warm, breezy; Professor Ember
------------------------------------------------------------------- */

const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

export const CHAT_MODEL =
  process.env.GEMINI_MODEL ?? "gemini-3.5-flash";
export const CHAT_MODEL_LITE =
  process.env.GEMINI_MODEL_LITE ?? "gemini-3.5-flash-lite";
export const TTS_MODEL =
  process.env.GEMINI_TTS_MODEL ?? "gemini-3.8-flash-lite-tts";

/* Gemini's prebuilt neural voices. Anything else — including the
   legacy "jam" the client still sends — maps to the Ember default. */
const KNOWN_VOICES = new Set([
  "Zephyr", "Puck", "Charon", "Kore", "Fenrir", "Leda", "Orus", "Aoede",
  "Callirrhoe", "Autonoe", "Enceladus", "Iapetus", "Umbriel", "Algieba",
  "Despina", "Erinome", "Algenib", "Rasalgethi", "Laomedeia", "Achernar",
  "Alnilam", "Schedar", "Gacrux", "Pulcherrima", "Achird",
  "Zubenelgenubi", "Vindemiatrix", "Sadachbia", "Sadaltager", "Sulafat",
]);

export const EMBER_VOICE = process.env.GEMINI_TTS_VOICE ?? "Aoede";

export function normalizeVoice(voice: string): string {
  return KNOWN_VOICES.has(voice) ? voice : EMBER_VOICE;
}

/** carries the HTTP status inside the message ("status 429: …") so the
 *  queue/retry layers keep their existing regex semantics */
export class ProviderError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(`status ${status}: ${message}`);
    this.status = status;
  }
}

async function call(model: string, body: unknown): Promise<Record<string, unknown>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new ProviderError(
      500,
      "GEMINI_API_KEY is not set — get a free key at aistudio.google.com and add it to .env"
    );
  }
  const r = await fetch(`${BASE}/${model}:generateContent`, {
    method: "POST",
    signal: AbortSignal.timeout(60_000),
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": key,
    },
    body: JSON.stringify(body),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new ProviderError(r.status, text.slice(0, 300));
  }
  return (await r.json()) as Record<string, unknown>;
}

export interface ChatOpts {
  model?: string;
  /** "reason" = the strong tier (director/planner/solver);
   *  "fast" = the lite tier (writers/reviewer). Default "reason". */
  tier?: "reason" | "fast";
  /** cap thinking tokens (the 3.x family rejects 0; small caps like 1024
   *  ARE accepted and much faster — the spec's planner demotion path) */
  thinkingBudget?: number;
  /** optional JSON schema for structured output */
  responseSchema?: Record<string, unknown>;
}

/** one chat completion → plain text (all parts joined).
 *  NOTE (phase-0 probe, 2026-09-29): the current 3.x model family
 *  REJECTS thinkingBudget 0 (503/400) — every call runs with the
 *  dynamic budget (-1). That matches the spec anyway: thinking on for
 *  the reasoning steps, and the lite tier is fast (~1s) even with it. */
export async function geminiChat(
  system: string,
  user: string,
  opts: ChatOpts = {}
): Promise<string> {
  const model =
    opts.model ?? (opts.tier === "fast" ? CHAT_MODEL_LITE : CHAT_MODEL);
  const data = await call(model, {
    system_instruction: { parts: [{ text: system }] },
    contents: [{ role: "user", parts: [{ text: user }] }],
    generationConfig: {
      temperature: 0.7,
      thinkingConfig: { thinkingBudget: opts.thinkingBudget ?? -1 },
      ...(opts.responseSchema
        ? {
            responseMimeType: "application/json",
            responseSchema: opts.responseSchema,
          }
        : {}),
    },
  });
  const cand = data.candidates as
    | Array<{ content?: { parts?: Array<{ text?: string }> } }>
    | undefined;
  const parts = cand?.[0]?.content?.parts ?? [];
  return parts
    .map((p) => p?.text ?? "")
    .join("")
    .trim();
}

const TTS_FALLBACKS = [
  "gemini-3.1-flash-tts-preview",
  TTS_MODEL,
  "gemini-2.5-flash-preview-tts",
  "gemini-3.8-flash-lite-tts",
  "gemini-3.8-flash-tts",
];

/**
 * Unwrap raw signed 16-bit LE mono PCM from a buffer that may be raw PCM
 * or a full/nested RIFF WAVE container with trailing metadata chunks (e.g.
 * Gemini 3.1 TTS attaches a 6,070-byte C2PA JUMBF watermark chunk after
 * the `data` chunk, which plays as a loud 126ms static burst if not stripped).
 */
export function extractWavPcm(buf: Buffer): Buffer {
  let cur = buf;
  for (let depth = 0; depth < 3; depth++) {
    if (
      cur.length >= 44 &&
      cur.subarray(0, 4).toString("ascii") === "RIFF" &&
      cur.subarray(8, 12).toString("ascii") === "WAVE"
    ) {
      let offset = 12;
      let foundData: Buffer | null = null;
      while (offset + 8 <= cur.length) {
        const chunkId = cur.subarray(offset, offset + 4).toString("ascii");
        const chunkSize = cur.readUInt32LE(offset + 4);
        if (chunkId === "data") {
          const end = Math.min(cur.length, offset + 8 + chunkSize);
          foundData = cur.subarray(offset + 8, end);
          break;
        }
        offset += 8 + chunkSize + (chunkSize % 2);
      }
      if (foundData) {
        cur = foundData;
        continue;
      }
      cur = cur.subarray(44);
    }
    break;
  }

  // Defensive check: if any raw C2PA watermark trailer survived at the tail, strip it
  const c2paIdx = cur.indexOf("C2PA", Math.max(0, cur.length - 8192), "ascii");
  if (c2paIdx > 0) {
    cur = cur.subarray(0, c2paIdx);
  }

  const evenLen = cur.length & ~1;
  const out = Buffer.from(cur.subarray(0, evenLen));

  // Smooth 10ms fade-in (240 samples) and 15ms fade-out (360 samples) to eliminate boundary clicks
  const totalSamples = out.length >> 1;
  const fadeIn = Math.min(240, Math.floor(totalSamples / 4));
  const fadeOut = Math.min(360, Math.floor(totalSamples / 4));
  for (let i = 0; i < fadeIn; i++) {
    const s = out.readInt16LE(i * 2);
    out.writeInt16LE(Math.round((s * i) / fadeIn), i * 2);
  }
  for (let i = 0; i < fadeOut; i++) {
    const idx = (totalSamples - 1 - i) * 2;
    const s = out.readInt16LE(idx);
    out.writeInt16LE(Math.round((s * i) / fadeOut), idx);
  }
  return out;
}

/** Gemini TTS → a WAV buffer (PCM is extracted cleanly without C2PA trailers
 *  and wrapped with a standard 44-byte RIFF header). */
export async function geminiTTS(text: string, voice: string): Promise<Buffer> {
  const models = [...new Set(TTS_FALLBACKS)];
  let lastError: unknown = null;

  for (const model of models) {
    try {
      const data = await call(model, {
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: normalizeVoice(voice) } },
          },
        },
      });
      const cand = data.candidates as
        | Array<{ content?: { parts?: Array<{ inlineData?: { data?: string } }> } }>
        | undefined;
      const b64 = cand?.[0]?.content?.parts?.[0]?.inlineData?.data;
      if (!b64) throw new Error("tts returned no audio");
      const rawBytes = Buffer.from(b64, "base64");
      if (!rawBytes.length) throw new Error("empty audio");
      const cleanPcm = extractWavPcm(rawBytes);
      if (!cleanPcm.length) throw new Error("empty pcm after extraction");
      return pcmToWav(cleanPcm, 24000);
    } catch (err) {
      lastError = err;
      const msg = err instanceof Error ? err.message : String(err);
      // If it's a 404/429/503 on this model, try the next model in the fallback list
      if (/404|429|503|UNAVAILABLE|not found|quota/i.test(msg)) {
        continue;
      }
      throw err;
    }
  }

  throw lastError ?? new Error("TTS generation failed on all models");
}

/** wrap raw signed 16-bit LE mono PCM in a WAV (RIFF) header */
export function pcmToWav(
  pcm: Buffer,
  sampleRate = 24000,
  channels = 1,
  bits = 16
): Buffer {
  const clean =
    pcm.length >= 44 &&
    pcm.subarray(0, 4).toString("ascii") === "RIFF" &&
    pcm.subarray(8, 12).toString("ascii") === "WAVE"
      ? extractWavPcm(pcm)
      : pcm;
  const blockAlign = (channels * bits) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + clean.length, 4);
  header.write("WAVE", 8);
  header.write("fmt ", 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(channels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bits, 34);
  header.write("data", 36);
  header.writeUInt32LE(clean.length, 40);
  return Buffer.concat([header, clean]);
}
