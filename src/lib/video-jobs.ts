import { chatComplete } from "./ai/chat";
import { extractJson, sanitizeScript, cleanNarration } from "./solve-schema";
import { compileTimeline } from "./video/compile";
import { scriptOverlap } from "./video/overlap";
import { auditTimeline } from "./video/layout-audit";
import { speak } from "./tts-queue";
import {
  DIRECTOR_PROMPT,
  TRANSCRIPT_PROMPT,
  plannerUserPrompt,
  WRITER_SYSTEM,
  writerUser,
} from "./prompts";
import type { SolveScript } from "./video/types";

/* ------------------------------------------------------------------
   The multi-agent video studio.

   One job = one solve video, assembled by a crew of AI agents:

     t0  DIRECTOR (1 call)      question → lesson outline: chapters +
                                precise board summaries, laid out along
                                the classic lecture arc. No narration
                                here — small JSON → fast.
     t1  TRANSCRIPT PLANNER (1 call, NEW)
                                the outline → the COMPLETE spoken
                                lecture: one engaging, unhurried script
                                per scene, plus where an analogy or a
                                visualization genuinely helps. The words
                                are planned as ONE whole so the lecture
                                flows, and the arc is explicit:
                                understand → gather → name the ask →
                                plan → solve → check.
     t2  SCENE WRITERS (N calls, 3 in flight)
                                each receives the outline + ITS slice of
                                the transcript and choreographs the board
                                for exactly those words — every written
                                line tagged with the words spoken as it
                                is written (the say/write sync).
     t2+ VOICE AGENT (queued)   the moment scene 1's writer lands, its
                                narration enters the global TTS queue —
                                in PLAYBACK ORDER, so the opening is
                                always recorded first.
     t3  MERGE → sanitize → server-side compile check
                                the script is delivered to the client
                                HERE — the user starts watching while
                                the last voices are still recording.

   Wall-clock to "watchable" ≈ director + planner + ceil(N/3) writer
   waves, independent of video length. Everything is measured so the
   client can show a live, honest ETA.
------------------------------------------------------------------- */

const WRITER_CONCURRENCY = 3;
const WRITER_ATTEMPTS = 3;
const DIRECTOR_ATTEMPTS = 3;
const PLANNER_ATTEMPTS = 3;
const JOB_TTL_MS = 35 * 60 * 1000;
const MAX_JOBS = 24;
const STAGGER_MS = 250;

/* ETA priors (ms) until first measurements arrive */
const PRIOR_DIRECTOR_MS = 12000;
const PRIOR_PLANNER_MS = 16000;
const PRIOR_WRITER_MS = 9000;
const PRIOR_VOICE_MS = 4500;

export type JobPhase =
  | "directing"
  | "scripting"
  | "boarding"
  | "voicing"
  | "ready"
  | "error";

interface OutlineScene {
  chapter: string;
  summary: string;
  narration?: string;
}
interface Outline {
  title: string;
  subject?: string;
  question: string;
  scenes: OutlineScene[];
}

interface Job {
  id: string;
  question: string;
  phase: JobPhase;
  createdAt: number;
  title: string | null;
  error: string | null;
  scenesTotal: number;
  scenesDone: number;
  voicesTotal: number;
  voicesDone: number;
  script: SolveScript | null;
  /* timing / ETA */
  directorMs: number | null;
  scriptStartAt: number | null;
  plannerMs: number | null;
  writerEwma: number;
  voiceEwma: number;
  mergedAt: number | null;
  readyAt: number | null;
  stats: {
    directorMs: number | null;
    plannerMs: number | null;
    writerMs: number[];
    voiceMs: number[];
    firstVoiceReadyMs: number | null;
    proseDropped: number;
    overlapPct: number | null;
    layoutViolations: number | null;
    providerHops: number;
    watchableMs: number | null;
  };
}

/* Anchored on globalThis so dev-mode hot reloads (which can re-
   instantiate this module per route) never lose running jobs. */
const g = globalThis as typeof globalThis & { __videoJobs?: Map<string, Job> };
const jobs: Map<string, Job> = (g.__videoJobs ??= new Map());
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ewma(prev: number, sample: number): number {
  return Math.round(prev * 0.7 + sample * 0.3);
}

/* ------------------------------ store ------------------------------ */

function sweep(now = Date.now()): void {
  for (const [id, job] of jobs) {
    if (job.phase === "ready" || job.phase === "error") {
      if (now - (job.readyAt ?? job.createdAt) > JOB_TTL_MS) jobs.delete(id);
    } else if (now - job.createdAt > JOB_TTL_MS + 10 * 60 * 1000) {
      job.phase = "error";
      job.error = "generation timed out";
    }
  }
  while (jobs.size > MAX_JOBS) {
    const oldest = jobs.keys().next().value;
    if (oldest === undefined) break;
    jobs.delete(oldest);
  }
}

export function createJob(question: string): string {
  sweep();
  const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  const job: Job = {
    id,
    question,
    phase: "directing",
    createdAt: Date.now(),
    title: null,
    error: null,
    scenesTotal: 0,
    scenesDone: 0,
    voicesTotal: 0,
    voicesDone: 0,
    script: null,
    directorMs: null,
    scriptStartAt: null,
    plannerMs: null,
    writerEwma: PRIOR_WRITER_MS,
    voiceEwma: PRIOR_VOICE_MS,
    mergedAt: null,
    readyAt: null,
    stats: {
      directorMs: null,
      plannerMs: null,
      writerMs: [],
      voiceMs: [],
      firstVoiceReadyMs: null,
      proseDropped: 0,
      overlapPct: null,
      layoutViolations: null,
      providerHops: 0,
      watchableMs: null,
    },
  };
  jobs.set(id, job);
  void runJob(job); // fire-and-forget: the client polls
  return id;
}

export interface JobSnapshot {
  id: string;
  phase: JobPhase;
  question: string;
  title: string | null;
  createdAt: number;
  scenesTotal: number;
  scenesDone: number;
  voicesTotal: number;
  voicesDone: number;
  /** ms until the script is ready and watching can start (0 when it is) */
  etaWatchMs: number;
  /** ms until every narration is recorded */
  etaVoiceMs: number;
  script: SolveScript | null;
  error: string | null;
  stats: Job["stats"];
}

export function getJob(id: string): JobSnapshot | null {
  sweep();
  const job = jobs.get(id);
  if (!job) return null;
  return snapshot(job);
}

function snapshot(job: Job): JobSnapshot {
  const now = Date.now();
  let etaWatchMs = 0;
  let etaVoiceMs = 0;

  if (job.phase === "directing") {
    const directorLeft =
      job.directorMs === null
        ? Math.max(0, PRIOR_DIRECTOR_MS - (now - job.createdAt))
        : 0;
    etaWatchMs = directorLeft + PRIOR_PLANNER_MS + PRIOR_WRITER_MS * 2;
    etaVoiceMs = etaWatchMs + job.voiceEwma * 4;
  } else if (job.phase === "scripting") {
    const plannerLeft = Math.max(
      0,
      PRIOR_PLANNER_MS - (now - (job.scriptStartAt ?? job.createdAt))
    );
    etaWatchMs = plannerLeft + PRIOR_WRITER_MS * 2;
    etaVoiceMs = Math.max(
      etaWatchMs,
      (job.voicesTotal - job.voicesDone) * job.voiceEwma
    );
  } else if (job.phase === "boarding") {
    const remaining = Math.max(0, job.scenesTotal - job.scenesDone);
    const waves = Math.ceil(remaining / WRITER_CONCURRENCY);
    etaWatchMs = waves * job.writerEwma + 1500;
    etaVoiceMs = Math.max(
      (job.voicesTotal - job.voicesDone) * job.voiceEwma,
      etaWatchMs
    );
  } else if (job.phase === "voicing") {
    etaVoiceMs = (job.voicesTotal - job.voicesDone) * job.voiceEwma;
  }

  return {
    id: job.id,
    phase: job.phase,
    question: job.question,
    title: job.title,
    createdAt: job.createdAt,
    scenesTotal: job.scenesTotal,
    scenesDone: job.scenesDone,
    voicesTotal: job.voicesTotal,
    voicesDone: job.voicesDone,
    etaWatchMs: Math.max(0, etaWatchMs),
    etaVoiceMs: Math.max(0, etaVoiceMs),
    script: job.script,
    error: job.error,
    stats: job.stats,
  };
}

/* ---------------------------- LLM helpers --------------------------- */

/* lets the job report "studio busy" instead of a misleading parse error
   when the upstream API is rate-limiting the account */
let lastChatWas429 = false;

async function chatJson(
  system: string,
  user: string,
  tier: "reason" | "fast" = "reason",
  hopSink?: { providerHops: number }
): Promise<string> {
  /* the ladder inside chatComplete retries 429/5xx briefly then hops
     provider — long sleeps are gone; callers keep their JSON-attempt
     loops (a bad parse is not a provider failure) */
  const r = await chatComplete(system, user, {
    tier,
    on429: () => {
      lastChatWas429 = true;
    },
    onHop: () => {
      if (hopSink) hopSink.providerHops += 1;
    },
  });
  return r.text;
}

function normalizeOutline(raw: unknown): Outline | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.scenes)) return null;
  const scenes: OutlineScene[] = [];
  for (const sRaw of o.scenes.slice(0, 14)) {
    if (!sRaw || typeof sRaw !== "object") continue;
    const s = sRaw as Record<string, unknown>;
    const chapter = String(s.chapter ?? "").replace(/\s+/g, " ").trim().slice(0, 42);
    const summary = String(s.summary ?? "").replace(/\s+/g, " ").trim().slice(0, 400);
    if (!chapter || !summary) continue;
    scenes.push({ chapter, summary });
  }
  if (scenes.length < 2) return null;
  const title = String(o.title ?? "").replace(/\s+/g, " ").trim().slice(0, 70) || "Solve with me";
  const subject = String(o.subject ?? "").replace(/\s+/g, " ").trim().slice(0, 36) || undefined;
  const question = String(o.question ?? "").replace(/\s+/g, " ").trim().slice(0, 600) || title;
  return { title, subject, question, scenes };
}

async function callDirector(job: Job): Promise<Outline | null> {
  const user = `Make a solve video for this question:\n\n${job.question}`;
  for (let attempt = 0; attempt < DIRECTOR_ATTEMPTS; attempt++) {
    if (attempt) await sleep(1500);
    try {
      const t0 = Date.now();
      const raw = await chatJson(
        DIRECTOR_PROMPT +
          (attempt
            ? "\n\nIMPORTANT REMINDER: Reply with the raw JSON object ONLY. No prose, no code fences. Start with { and end with }."
            : ""),
        user,
        "reason",
        job.stats
      );
      const outline = normalizeOutline(extractJson(raw));
      job.directorMs = Date.now() - t0;
      job.stats.directorMs = job.directorMs;
      if (outline) return outline;
    } catch (e) {
      console.error("director attempt failed:", e instanceof Error ? e.message : e);
    }
  }
  return null;
}

/* ------------------------ transcript planner ----------------------- */

/** one scene's planned words + teaching cues */
export interface TranscriptScene {
  script: string;
  visualize?: string;
  analogy?: string;
}

function normalizeTranscript(
  raw: unknown,
  sceneCount: number
): TranscriptScene[] | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.scenes)) return null;
  const out: TranscriptScene[] = [];
  for (const sRaw of o.scenes.slice(0, sceneCount)) {
    if (!sRaw || typeof sRaw !== "object") {
      out.push({ script: "" }); // hole — the writer self-authors
      continue;
    }
    const s = sRaw as Record<string, unknown>;
    const script = cleanNarration(s.script);
    const ts: TranscriptScene = { script };
    const visualize = cleanNarration(s.visualize);
    if (visualize) ts.visualize = visualize.slice(0, 160);
    const analogy = cleanNarration(s.analogy);
    if (analogy) ts.analogy = analogy.slice(0, 220);
    out.push(ts);
  }
  if (out.length !== sceneCount) return null;
  /* the transcript is only usable if most scenes actually have words */
  const voiced = out.filter((s) => s.script.length > 40).length;
  if (voiced < Math.ceil(sceneCount * 0.6)) return null;
  return out;
}

async function callPlanner(
  job: Job,
  outlineJson: string,
  sceneCount: number
): Promise<TranscriptScene[] | null> {
  for (let attempt = 0; attempt < PLANNER_ATTEMPTS; attempt++) {
    if (attempt) await sleep(1500);
    try {
      const t0 = Date.now();
      const raw = await chatJson(
        TRANSCRIPT_PROMPT +
          (attempt
            ? "\n\nIMPORTANT REMINDER: Reply with the raw JSON object ONLY. No prose, no code fences. Exactly one scenes entry per outline scene, same order."
            : ""),
        plannerUserPrompt(outlineJson),
        "reason",
        job.stats
      );
      const transcript = normalizeTranscript(extractJson(raw), sceneCount);
      job.plannerMs = Date.now() - t0;
      job.stats.plannerMs = job.plannerMs;
      if (transcript) return transcript;
    } catch (e) {
      console.error("planner attempt failed:", e instanceof Error ? e.message : e);
    }
  }
  return null;
}

async function writeScene(
  outlineJson: string,
  index: number,
  planned: TranscriptScene | null,
  hopSink?: { providerHops: number }
): Promise<{ narration?: string; beats: unknown[] } | null> {
  for (let attempt = 0; attempt < WRITER_ATTEMPTS; attempt++) {
    if (attempt) await sleep(1200 * (attempt + 1));
    try {
      const raw = await chatJson(
        WRITER_SYSTEM,
        writerUser(
          outlineJson,
          index,
          planned && planned.script.length > 40 ? planned.script : null,
          planned?.visualize,
          planned?.analogy
        ),
        "fast",
        hopSink
      );
      const parsed = extractJson(raw);
      if (parsed && typeof parsed === "object") {
        const o = parsed as Record<string, unknown>;
        if (Array.isArray(o.beats) && o.beats.length) {
          return {
            narration:
              typeof o.narration === "string" ? o.narration : undefined,
            beats: o.beats,
          };
        }
      }
    } catch (e) {
      console.error(
        `writer scene ${index + 1} attempt ${attempt + 1} failed:`,
        e instanceof Error ? e.message : e
      );
    }
  }
  return null;
}

/* ------------------------------ runner ------------------------------ */

async function runJob(job: Job): Promise<void> {
  try {
    /* 1 ─ the director plans the lesson */
    lastChatWas429 = false;
    const outline = await callDirector(job);
    if (!outline) {
      job.phase = "error";
      job.error = lastChatWas429
        ? "The AI studio is busy right now — wait a minute and try again."
        : "The tutor couldn't storyboard that one — try rephrasing the question.";
      return;
    }
    job.title = outline.title;
    job.scenesTotal = outline.scenes.length;
    job.voicesTotal = outline.scenes.length; // optimistic — trimmed for silent scenes

    const outlineJson = JSON.stringify({
      title: outline.title,
      question: outline.question,
      scenes: outline.scenes.map((s) => ({
        chapter: s.chapter,
        summary: s.summary,
      })),
    });

    /* 1b — the TRANSCRIPT PLANNER writes the whole spoken lecture:
       engaging, unhurried, arc-complete, with analogy/visualization
       cues. On failure the writers fall back to authoring their own
       narration (the previous behavior — never a hard failure). */
    job.phase = "scripting";
    job.scriptStartAt = Date.now();
    const transcript = await callPlanner(
      job,
      outlineJson,
      outline.scenes.length
    );
    job.phase = "boarding";

    /* 2 ─ voices flush in PLAYBACK ORDER as writers land. The queue is
       the same global TTS pipeline the player uses, so everything the
       voice agent records is an instant cache hit client-side. */
    /* undefined = writer hasn't landed yet; "" = landed but silent */
    const narrations: (string | undefined)[] = new Array(
      outline.scenes.length
    ).fill(undefined);
    let nextVoice = 0;
    let voiceChain: Promise<void> = Promise.resolve();
    const flushVoices = () => {
      while (nextVoice < narrations.length && narrations[nextVoice] !== undefined) {
        const text = narrations[nextVoice];
        const idx = nextVoice;
        nextVoice++;
        if (!text) {
          job.voicesTotal -= 1; // silent scene (writer fallback)
          continue;
        }
        voiceChain = voiceChain.then(async () => {
          try {
            const { ms, cached } = await speak(text, "jam", 1);
            if (!cached) {
              job.voiceEwma = ewma(job.voiceEwma, ms);
              job.stats.voiceMs.push(ms);
              if (job.stats.firstVoiceReadyMs === null) {
                job.stats.firstVoiceReadyMs = Date.now() - job.createdAt;
              }
            }
          } catch (e) {
            console.error(
              "voice prewarm failed:",
              e instanceof Error ? e.message : e
            );
          }
          job.voicesDone += 1;
        });
      }
    };

    /* 3 ─ scene writers, 3 in flight, staggered to be gentle. Each
       choreographs the board for its slice of the planned transcript. */
    const results: Array<{ narration?: string; beats: unknown[] }> = [];
    let launched = 0;
    const workers = Array.from(
      { length: Math.min(WRITER_CONCURRENCY, outline.scenes.length) },
      async () => {
        for (;;) {
          const i = launched++;
          if (i >= outline.scenes.length) break;
          const myIndex = i;
          if (myIndex > 0) await sleep(STAGGER_MS * (myIndex % WRITER_CONCURRENCY));
          /* if the API has been rate-limiting, space the writers out */
          if (myIndex > 0 && lastChatWas429) await sleep(1500);
          const t0 = Date.now();
          const planned = transcript ? transcript[myIndex] : null;
          const r =
            (await writeScene(outlineJson, myIndex, planned, job.stats)) ?? {
              /* graceful degradation: a single clean line + the PLANNER'S
                 words — a writer failure no longer costs the scene its
                 voice when the transcript exists */
              narration: planned && planned.script.length > 40 ? planned.script : undefined,
              beats: [
                {
                  type: "write",
                  text: outline.scenes[myIndex].summary.slice(0, 100),
                  color: "white",
                },
              ],
            };
          const ms = Date.now() - t0;
          job.writerEwma = ewma(job.writerEwma, ms);
          job.stats.writerMs.push(ms);
          results[myIndex] = r;
          /* cleaned EXACTLY like the script sanitizer cleans it, so the
             pre-warmed voice and the player's fetch are the same cache key */
          narrations[myIndex] = r.narration ? cleanNarration(r.narration) : "";
          job.scenesDone += 1;
          flushVoices();
        }
      }
    );
    await Promise.all(workers);

    /* 4 ─ merge → sanitize → compile-check → deliver */
    const rawScript = {
      title: outline.title,
      subject: outline.subject,
      question: outline.question,
      scenes: outline.scenes.map((scene, i) => ({
        chapter: scene.chapter,
        narration: results[i]?.narration ?? "",
        beats: results[i]?.beats ?? [],
      })),
    };
    const script = sanitizeScript(rawScript, job.stats);
    if (!script || script.scenes.length < 2) {
      job.phase = "error";
      job.error = "The storyboard came back incomplete — try again in a moment.";
      return;
    }
    const tl = compileTimeline(script); // server-side smoke test — must never crash a client
    job.stats.overlapPct = Math.round(scriptOverlap(script) * 100);
    const violations = auditTimeline(tl);
    job.stats.layoutViolations = violations.length;
    if (violations.length) {
      console.warn(
        `[layout-audit] ${violations.length} violation(s): ` +
          violations
            .map((v) => `${v.scene}:${v.kind}(${v.a}${v.b ? "×" + v.b : ""})`)
            .join(", ")
      );
    }
    job.script = script;
    job.mergedAt = Date.now();
    job.stats.watchableMs = Date.now() - job.createdAt; // delivery moment
    job.phase = "voicing";

    /* 5 ─ let the remaining voices land, then the job is complete */
    await voiceChain;
    job.phase = "ready";
    job.readyAt = Date.now();
  } catch (err) {
    console.error("video job crashed:", err);
    job.phase = "error";
    job.error = "Video generation hit a snag. Please try again.";
  }
}
