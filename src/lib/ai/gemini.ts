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
export const TEACHER_VOICE_STYLE = "A calm, patient classroom teacher. Speak at approximately 120 words per minute, more slowly through equations. Pause naturally between reasoning steps and after important results. Clear, warm delivery, without rushing or dramatic performance. No music, sound effects, filler sounds, or added words.";

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

async function call(model: string, body: unknown, interactions = false): Promise<Record<string, unknown>> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new ProviderError(
      500,
      "GEMINI_API_KEY is not set — get a free key at aistudio.google.com and add it to .env"
    );
  }
  const r = await fetch(interactions ? "https://generativelanguage.googleapis.com/v1beta/interactions" : `${BASE}/${model}:generateContent`, {
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
  TTS_MODEL,
  "gemini-3.8-flash-lite-tts",
  "gemini-2.5-flash-preview-tts",
  "gemini-3.8-flash-tts",
  "gemini-3.1-flash-tts-preview",
];

/** Gemini TTS → WAV; preserve modern WAV output, wrap legacy PCM once. */
export async function geminiTTS(text: string, voice: string): Promise<Buffer> {
  const models = [...new Set(TTS_FALLBACKS)];
  let lastError: unknown = null;

  for (const model of models) {
    try {
      // 3.8 reads input verbatim: delivery instructions belong in metadata,
      // never in the transcript. Its default output is already WAV.
      if (model.startsWith("gemini-3.8")) {
        const data = await call(model, {
          model,
          input: [{ type: "user_input", content: [{ type: "text", text,
            annotations: [{ type: "speech_metadata", style: TEACHER_VOICE_STYLE }] }] }],
          response_format: { type: "audio" },
          generation_config: { speech_config: [{ voice: normalizeVoice(voice) }] },
        }, true);
        const steps = data.steps as Array<{ type: string; content?: Array<{ type: string; data?: string }> }> | undefined;
        const b64 = steps?.filter(s => s.type === "model_output").flatMap(s => s.content ?? []).filter(c => c.type === "audio").at(-1)?.data;
        if (!b64) throw new Error("tts returned no audio");
        const wav = Buffer.from(b64, "base64");
        if (wav.toString("ascii", 0, 4) !== "RIFF" || wav.toString("ascii", 8, 12) !== "WAVE") throw new Error("tts returned an invalid WAV");
        return wav;
      }
      const data = await call(model, {
        contents: [{ parts: [{ text: `${TEACHER_VOICE_STYLE}\nRead only the following transcript:\n${text}` }] }],
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
      const pcm = Buffer.from(b64, "base64");
      if (!pcm.length) throw new Error("empty audio");
      if (pcm.toString("ascii", 0, 4) === "RIFF" && pcm.toString("ascii", 8, 12) === "WAVE") return pcm;
      return pcmToWav(pcm, 24000);
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
  const blockAlign = (channels * bits) / 8;
  const byteRate = sampleRate * blockAlign;
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + pcm.length, 4);
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
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}
