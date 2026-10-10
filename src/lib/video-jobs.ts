import { chatComplete } from "./ai/chat";
import { existsSync } from "node:fs";
import { randomUUID } from "node:crypto";
import {
  extractJson,
  sanitizeScript,
  sanitizeSceneBeats,
  cleanNarration,
  isBoardProse,
} from "./solve-schema";
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
  REVIEWER_SYSTEM,
  reviewerUser,
  SOLVER_SYSTEM,
  solverUser,
} from "./prompts";
import { normalizeReviewFix, shouldReview } from "./video/review";
import { advanceProgress, computeWatchProgress } from "./video/progress";
import { checkSceneLines } from "./video/checker";
import {
  compareAnswers,
  extractScriptAnswer,
  normalizeSolver,
  type SolverAnswer,
  type VerifyVerdict,
} from "./video/solver";
import type { SolveScript } from "./video/types";
import { recordVoiceResult, finishVoicing } from "./video/voice-completion";
import { jobStore } from "./jobs/store";
import { DurableJobStore, LeaseLostError } from "./jobs/repository";
import { audioKey, ensureRecordedAudio } from "./jobs/audio-assets";
import { storedAudioKey } from "./video/recorded-audio";

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
const STAGGER_MS = 250;
/* dev-only reviewer drill: `touch scripts/plant-bad-beat.flag` plants a
   wrong beat into scene 2 of the next job until the file is removed */
const PLANT_BAD_BEAT_FLAG = "scripts/plant-bad-beat.flag";

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

interface SceneResult { narration?: string; beats: unknown[] }

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
  voiceFailures: number[];
  script: SolveScript | null;
  /* timing / ETA */
  directorMs: number | null;
  scriptStartAt: number | null;
  plannerMs: number | null;
  boardingStartAt: number | null;
  /* honest monotonic progress % — never 100 before ready */
  progressPct: number;
  writerEwma: number;
  voiceEwma: number;
  mergedAt: number | null;
  readyAt: number | null;
  checkpoint: {
    outline?: Outline;
    plannerDone?: boolean;
    transcript?: TranscriptScene[] | null;
    results: (SceneResult | null)[];
    voices: Record<number, string>;
    voiceKeys?: Record<number, string>;
    reviews: Record<number, "pass" | "fixed" | "skipped">;
    checkerScenes: number[];
    solverDone?: boolean;
    solver?: SolverAnswer | null;
    repaired?: boolean;
    repairScenes?: number[];
  };
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
    reviewedScenes: number;
    unreviewedScenes: number;
    fixedScenes: number;
    checkerChecked: number;
    checkerFlags: number;
    verification: {
      verdict: "match" | "mismatch" | "incomparable" | "unresolved";
      solverAnswer: string | null;
      scriptAnswer: string | null;
      rerun: boolean;
    } | null;
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function ewma(prev: number, sample: number): number {
  return Math.round(prev * 0.7 + sample * 0.3);
}

/* ------------------------------ store ------------------------------ */

export async function createJob(question: string, store = jobStore, dailyLimit?: number): Promise<string> {
  const id = `job_${randomUUID()}`;
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
    voiceFailures: [],
    script: null,
    directorMs: null,
    scriptStartAt: null,
    plannerMs: null,
    boardingStartAt: null,
    progressPct: 0,
    writerEwma: PRIOR_WRITER_MS,
    voiceEwma: PRIOR_VOICE_MS,
    mergedAt: null,
    readyAt: null,
    checkpoint: { results: [], voices: {}, reviews: {}, checkerScenes: [] },
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
      reviewedScenes: 0,
      unreviewedScenes: 0,
      fixedScenes: 0,
      checkerChecked: 0,
      checkerFlags: 0,
      verification: null,
    },
  };
  await store.insert(job, dailyLimit);
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
  /** honest monotonic progress toward ready (0-100, 100 only when ready) */
  progressPct: number;
}

export async function getJob(id: string, store = jobStore): Promise<JobSnapshot | null> {
  if (!/^job_[a-zA-Z0-9_-]{1,850}$/.test(id)) return null;
  const job = await store.read<Job>(id);
  return job ? snapshot(job) : null;
}

function snapshot(job: Job): JobSnapshot {
  const now = Date.now();
  /* honest monotonic progress — computed server-side where every phase
     timestamp lives; the client only renders it */
  const pct = advanceProgress(
    job.progressPct,
    computeWatchProgress(
      {
        phase: job.phase,
        createdAt: job.createdAt,
        scriptStartAt: job.scriptStartAt,
        boardingStartAt: job.boardingStartAt,
        scenesTotal: job.scenesTotal,
        scenesDone: job.scenesDone,
        voicesTotal: job.voicesTotal,
        voicesDone: job.voicesDone,
        script: job.script,
      },
      now
    )
  );
  job.progressPct = pct;
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
    script: job.stats.watchableMs !== null ? job.script : null,
    error: job.error,
    stats: job.stats,
    progressPct: pct,
  };
}

/* ---------------------------- LLM helpers --------------------------- */

/* lets the job report "studio busy" instead of a misleading parse error
   when the upstream API is rate-limiting the account */
let lastChatWas429 = false;
/* REAL pressure: the fallback provider itself is throttling. Gemini
   429s are routine (that is what the ladder hops over) and must NOT
   starve the reviewer — only Groq 429s mean the whole ladder is
   squeezed (found live 2026-09-30: reviews collapsed to a 30% sample
   during a pure-Gemini outage while Groq was healthy). */
let lastGroq429 = false;

async function chatJson(
  system: string,
  user: string,
  tier: "reason" | "fast" = "reason",
  hopSink?: { providerHops: number },
  thinkingBudget?: number,
  complete = chatComplete
): Promise<string> {
  /* the ladder inside chatComplete retries 429/5xx briefly then hops
     provider — long sleeps are gone; callers keep their JSON-attempt
     loops (a bad parse is not a provider failure) */
  const r = await complete(system, user, {
    tier,
    thinkingBudget,
    on429: (entry) => {
      lastChatWas429 = true;
      if (entry.kind === "groq") lastGroq429 = true;
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

async function callDirector(job: Job, complete = chatComplete): Promise<Outline | null> {
  const user = `Make a solve video for this question:\n\n${job.question}`;
  const stageT0 = Date.now(); // the WHOLE stage, failed attempts included
  for (let attempt = 0; attempt < DIRECTOR_ATTEMPTS; attempt++) {
    if (attempt) await sleep(1500);
    try {
      const raw = await chatJson(
        DIRECTOR_PROMPT +
          (attempt
            ? "\n\nIMPORTANT REMINDER: Reply with the raw JSON object ONLY. No prose, no code fences. Start with { and end with }."
            : ""),
        user,
        "reason",
        job.stats, undefined, complete
      );
      const outline = normalizeOutline(extractJson(raw));
      job.directorMs = Date.now() - stageT0;
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
  sceneCount: number,
  complete = chatComplete
): Promise<TranscriptScene[] | null> {
  const stageT0 = Date.now(); // the WHOLE stage, failed attempts included
  for (let attempt = 0; attempt < PLANNER_ATTEMPTS; attempt++) {
    if (attempt) await sleep(1500);
    try {
      const raw = await chatJson(
        TRANSCRIPT_PROMPT +
          (attempt
            ? "\n\nIMPORTANT REMINDER: Reply with the raw JSON object ONLY. No prose, no code fences. Exactly one scenes entry per outline scene, same order."
            : ""),
        plannerUserPrompt(outlineJson),
        "reason",
        job.stats,
        /* spec §7 demotion order: the PLANNER caps thinking before the
           director does — its words are reviewable, structure errors are
           not. Probed 2026-10-01: 1024 accepted, full 9KB transcript in
           ~5s (dynamic took 30-55s when the model wasn't 503ing). */
        1024, complete
      );
      const transcript = normalizeTranscript(extractJson(raw), sceneCount);
      job.plannerMs = Date.now() - stageT0;
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
  opts?: { note?: string; hops?: { providerHops: number }; complete?: typeof chatComplete }
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
          planned?.analogy,
          opts?.note
        ),
        "fast",
        opts?.hops, undefined, opts?.complete
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

export interface EngineProviders {
  complete: typeof chatComplete;
  synthesize: typeof speak;
}

class SliceExpiredError extends Error {}

export async function runClaimedJob(
  claim: { id: string; token: string },
  store: DurableJobStore = jobStore,
  providers: EngineProviders = { complete: chatComplete, synthesize: speak },
  options: { sliceMs?: number } = {},
): Promise<"complete" | "yielded"> {
  const job = await store.read<Job>(claim.id);
  if (!job || job.phase === "ready" || job.phase === "error") {
    await store.release(claim.id, claim.token);
    return "complete";
  }
  let leaseLost = false;
  let acceptingWrites = true;
  let persistError: unknown;
  let writes: Promise<void> = Promise.resolve();
  const save = (): Promise<void> => {
    if (leaseLost || !acceptingWrites) return Promise.reject(new LeaseLostError());
    if (persistError) return Promise.reject(persistError);
    const state = JSON.parse(JSON.stringify(job)) as Job;
    const next = writes.then(() => store.save(job.id, claim.token, state));
    // Observe rejection immediately even for a concurrently running reviewer.
    writes = next.catch(error => { persistError = error; });
    return next;
  };
  const heartbeat = setInterval(() => {
    void store.renew(job.id, claim.token).then(renewed => {
      if (!renewed) leaseLost = true;
    }).catch(() => { leaseLost = true; });
  }, 10_000);
  let executionTimer: ReturnType<typeof setTimeout> | undefined;
  let yielded = false;
  const assertActive = () => {
    if (leaseLost || !acceptingWrites) throw new LeaseLostError();
  };
  const guardedProviders: EngineProviders = {
    complete: async (...args) => {
      assertActive();
      const result = await providers.complete(...args);
      assertActive();
      return result;
    },
    synthesize: async (...args) => {
      assertActive();
      const result = await providers.synthesize(...args);
      assertActive();
      return result;
    },
  };
  try {
    await Promise.race([
      runJob(job, save, store, guardedProviders),
      new Promise<never>((_, reject) => {
        executionTimer = setTimeout(() => reject(options.sliceMs !== undefined
          ? new SliceExpiredError("Execution slice finished")
          : new Error("Video worker execution exceeded 15 minutes")), options.sliceMs ?? 15 * 60_000);
      }),
    ]);
    await writes;
    if (persistError) throw persistError;
  } catch (error) {
    if (!(error instanceof SliceExpiredError)) throw error;
    yielded = true;
  } finally {
    acceptingWrites = false;
    clearTimeout(executionTimer);
    clearInterval(heartbeat);
    await writes;
    if (yielded && !leaseLost && !persistError) await store.yieldClaim(job.id, claim.token);
    else await store.release(job.id, claim.token);
  }
  if (persistError) throw persistError;
  return yielded ? "yielded" : "complete";
}

async function runJob(
  job: Job, save: () => Promise<void>, store: DurableJobStore, providers: EngineProviders,
): Promise<void> {
  let acceptingReviews = true;
  const cp = job.checkpoint;
  const voiceKeys = (cp.voiceKeys ??= {});
  const markWatchable = () => {
    const first = job.script?.scenes.find(scene => !!scene.narration);
    if (job.script && (!first || Object.values(cp.voices).includes(storedAudioKey(first) ?? audioKey(first.narration)))) {
      job.stats.watchableMs ??= Date.now() - job.createdAt;
    }
  };
  job.voiceFailures = [];
  job.voicesDone = Object.keys(cp.voices).length;
  try {
    /* 0 ─ BLIND SOLVER (Phase C): one parallel call from t0, from the
       question ALONE — never sees the outline/script. Compared at merge;
       never blocks delivery beyond a bounded wait. */
    const SOLVER_WAIT_MS = 8000;
    const solverPromise = (async (): Promise<SolverAnswer | null> => {
      if (cp.solverDone) return cp.solver ?? null;
      let result: SolverAnswer | null = null;
      try {
        const raw = await chatJson(SOLVER_SYSTEM, solverUser(job.question), "reason", job.stats, undefined, providers.complete);
        result = normalizeSolver(extractJson(raw));
      } catch {
        // No verdict; retain the attempted result across recovery.
      }
      cp.solver = result;
      cp.solverDone = true;
      await save();
      return result;
    })();
    solverPromise.catch(() => undefined);

    /* 1 ─ the director plans the lesson */
    lastChatWas429 = false;
    const outline = cp.outline ?? await callDirector(job, providers.complete);
    if (!outline) {
      job.phase = "error";
      job.error = lastChatWas429
        ? "The AI studio is busy right now — wait a minute and try again."
        : "The tutor couldn't storyboard that one — try rephrasing the question.";
      await save();
      return;
    }
    cp.outline = outline;
    job.title = outline.title;
    job.scenesTotal = outline.scenes.length;
    job.voicesTotal = outline.scenes.length; // optimistic — trimmed for silent scenes
    await save();

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
    if (!cp.plannerDone && !job.script) job.phase = "scripting";
    job.scriptStartAt ??= Date.now();
    await save();
    const transcript = cp.plannerDone ? cp.transcript ?? null : await callPlanner(
      job,
      outlineJson,
      outline.scenes.length, providers.complete
    );
    cp.transcript = transcript;
    cp.plannerDone = true;
    job.phase = job.script ? "voicing" : "boarding";
    job.boardingStartAt ??= Date.now();
    job.scenesDone = cp.results.filter(Boolean).length;
    await save();

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
          const matchingScene = job.script?.scenes.find(scene => scene.narration === text);
          const expectedKey = (voiceKeys[idx] ??= storedAudioKey(matchingScene) ?? audioKey(text));
          if (cp.voices[idx] === expectedKey && await store.readAudio(expectedKey)) return;
          try {
            const { ms, cached, key } = await ensureRecordedAudio(text, "jam", store, providers.synthesize, expectedKey);
            cp.voices[idx] = key;
            job.voicesDone = Object.keys(cp.voices).length;
            if (job.stats.firstVoiceReadyMs === null) {
              job.stats.firstVoiceReadyMs = Date.now() - job.createdAt;
            }
            if (!cached) {
              job.voiceEwma = ewma(job.voiceEwma, ms);
              job.stats.voiceMs.push(ms);
            }
          } catch (e) {
            if (e instanceof LeaseLostError) throw e;
            recordVoiceResult(job, idx, false);
            console.error(
              "voice prewarm failed:",
              e instanceof Error ? e.message : e
            );
          }
          markWatchable();
          await save();
        });
        voiceChain.catch(() => undefined);
      }
    };

    /* 2b — REVIEWER (Phase B): dispatched the moment a writer lands,
       async — voice NEVER waits for review (narration is canonical;
       the reviewer only ever replaces beats). Collected at merge with
       a bounded wait; anything unresolved ships as the writer left it. */
    const REVIEW_COLLECT_MS = 8000;
    const reviewPromises: Array<Promise<void>> = [];
    const reviewCounters = {
      reviewed: Object.values(cp.reviews).filter(value => value !== "skipped").length,
      unreviewed: Object.values(cp.reviews).filter(value => value === "skipped").length,
      fixed: Object.values(cp.reviews).filter(value => value === "fixed").length,
    };
    /* per-scene original checker-flag counts — a reviewer fix may not
       introduce NEW numeric errors (spec: fix passes the Checker) */
    const checkerFlagsOf: number[] = [];
    const dispatchReview = (
      idx: number,
      chapter: string,
      narration: string,
      beats: unknown[],
      forceFlagged = false,
      checkerFlagged = false
    ) => {
      if (cp.reviews[idx] || job.script) return;
      const proseFlagged =
        forceFlagged ||
        checkerFlagged ||
        beats.some(
          (b) =>
            (b as { type?: unknown })?.type === "write" &&
            isBoardProse(String((b as { text?: unknown }).text ?? ""))
        );
      if (!shouldReview(lastGroq429, proseFlagged, Math.random())) {
        reviewCounters.unreviewed++; // cost-control skip, not a failure
        cp.reviews[idx] = "skipped";
        return;
      }
      /* a fix may not make the board WORSE: compile the scene alone and
         count layout violations — a fix that adds collisions is rejected
         (found live 2026-09-30: reviewer repositioning caused them) */
      const sceneViolations = (clean: unknown[]): number => {
        try {
          return auditTimeline(
            compileTimeline({
              title: outline.title,
              question: outline.question,
              scenes: [{ chapter, narration, beats: clean }],
            } as never)
          ).length;
        } catch {
          return Infinity; // a fix that crashes compile is rejected too
        }
      };
      reviewPromises.push(
        (async () => {
          try {
            const raw = await chatJson(
              REVIEWER_SYSTEM,
              reviewerUser(chapter, narration, JSON.stringify(beats)),
              "fast",
              job.stats, undefined, providers.complete
            );
            if (!acceptingReviews) return;
            const outcome = normalizeReviewFix(extractJson(raw));
            if (!outcome) {
              reviewCounters.unreviewed++; // invalid/failed → original ships
              cp.reviews[idx] = "skipped";
              await save();
              return;
            }
            reviewCounters.reviewed++;
            cp.reviews[idx] = "pass";
            if (outcome.verdict === "fixed") {
              const cleaned = sanitizeSceneBeats(
                outcome.beats,
                narration,
                job.stats,
                `reviewer fix, scene ${idx + 1}`
              );
              const origClean = sanitizeSceneBeats(beats, narration);
              if (
                cleaned.length &&
                sceneViolations(cleaned) <= sceneViolations(origClean) &&
                checkSceneLines(idx, outcome.beats).flags.length <=
                  (checkerFlagsOf[idx] ?? 0)
              ) {
                results[idx] = { narration: results[idx]?.narration, beats: outcome.beats };
                cp.results[idx] = results[idx];
                cp.reviews[idx] = "fixed";
                reviewCounters.fixed++;
              }
            }
            await save();
          } catch {
            if (acceptingReviews && !cp.reviews[idx]) {
              cp.reviews[idx] = "skipped";
              reviewCounters.unreviewed++;
            }
          }
        })()
      );
    };

    /* 3 ─ scene writers, 3 in flight, staggered to be gentle. Each
       choreographs the board for its slice of the planned transcript. */
    const results = cp.results;
    let launched = 0;
    const workers = Array.from(
      { length: Math.min(WRITER_CONCURRENCY, outline.scenes.length) },
      async () => {
        for (;;) {
          const i = launched++;
          if (i >= outline.scenes.length) break;
          const myIndex = i;
          if (results[myIndex]) {
            const stored = results[myIndex]!;
            narrations[myIndex] = stored.narration ? cleanNarration(stored.narration) : "";
            checkerFlagsOf[myIndex] = checkSceneLines(myIndex, stored.beats).flags.length;
            dispatchReview(myIndex, outline.scenes[myIndex].chapter, narrations[myIndex] ?? "", stored.beats);
            flushVoices();
            continue;
          }
          if (myIndex > 0) await sleep(STAGGER_MS * (myIndex % WRITER_CONCURRENCY));
          /* if the API has been rate-limiting, space the writers out */
          if (myIndex > 0 && lastChatWas429) await sleep(1500);
          const t0 = Date.now();
          const planned = transcript ? transcript[myIndex] : null;
          const r =
            (await writeScene(outlineJson, myIndex, planned, { hops: job.stats, complete: providers.complete })) ?? {
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
          /* the dev-only planted defect: a wrong beat the reviewer must
             catch (checklist 4). It enters the REAL result (so the merge
             would ship it if the reviewer failed) — active only while
             scripts/plant-bad-beat.flag exists (touch/rm it; no server
             restart needed, and scripts/ is gitignored). */
          const planted = myIndex === 1 && existsSync(PLANT_BAD_BEAT_FLAG);
          const stored = planted
            ? { ...r, beats: [...r.beats, { type: "write", text: "2 + 2 = 5", color: "white" }] }
            : r;
          results[myIndex] = stored;
          /* cleaned EXACTLY like the script sanitizer cleans it, so the
             pre-warmed voice and the player's fetch are the same cache key */
          narrations[myIndex] = stored.narration ? cleanNarration(stored.narration) : "";
          if (narrations[myIndex]) voiceKeys[myIndex] ??= audioKey(narrations[myIndex]!);
          /* CHECKER (Phase C): pure-Node numeric spot-check, ms — runs
             the instant the writer lands; flags feed the reviewer's
             pressure sampling and the fix-acceptance test. */
          const sceneCheck = checkSceneLines(myIndex, stored.beats);
          job.stats.checkerChecked += sceneCheck.checked;
          job.stats.checkerFlags += sceneCheck.flags.length;
          cp.checkerScenes.push(myIndex);
          checkerFlagsOf[myIndex] = sceneCheck.flags.length;
          if (sceneCheck.flags.length) {
            console.warn(
              `[checker] scene ${myIndex + 1}: ${sceneCheck.flags
                .map((f) => `${f.text} (${f.detail})`)
                .join("; ")}`
            );
          }
          job.scenesDone += 1;
          await save();
          dispatchReview(
            myIndex,
            outline.scenes[myIndex].chapter,
            narrations[myIndex] ?? "",
            stored.beats,
            planted, // the drill must reach the reviewer, sample or not
            sceneCheck.flags.length > 0
          );
          flushVoices();
        }
      }
    );
    await Promise.all(workers);

    /* 3b — collect reviews: bounded. Reviews dispatched with the last
       writer wave add ~one small call of tail; anything slower ships
       unreviewed (counted). */
    let reviewTimer: ReturnType<typeof setTimeout> | undefined;
    await Promise.race([
      Promise.allSettled(reviewPromises),
      new Promise<void>(resolve => {
        reviewTimer = setTimeout(resolve, REVIEW_COLLECT_MS);
      }),
    ]);
    clearTimeout(reviewTimer);
    acceptingReviews = false;
    const pendingReviews = outline.scenes.length - reviewCounters.reviewed - reviewCounters.unreviewed;
    job.stats.reviewedScenes = reviewCounters.reviewed;
    job.stats.fixedScenes = reviewCounters.fixed;
    job.stats.unreviewedScenes =
      reviewCounters.unreviewed + Math.max(0, pendingReviews);

    /* A merged artifact is immutable across worker recovery. */
    if (!job.script) {
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
      let script = sanitizeScript(rawScript, job.stats);
      if (!script || script.scenes.length < 2) {
        job.phase = "error";
        job.error = "The storyboard came back incomplete — try again in a moment.";
        await save();
        return;
      }
      let tl = compileTimeline(script); // server-side smoke test — must never crash a client
      job.stats.overlapPct = Math.round(scriptOverlap(script) * 100);
      let violations = auditTimeline(tl);
      job.stats.layoutViolations = violations.length;
      if (violations.length) {
        console.warn(
          `[layout-audit] ${violations.length} violation(s): ` +
            violations
              .map((v) => `${v.scene}:${v.kind}(${v.a}${v.b ? "×" + v.b : ""})`)
              .join(", ")
        );
      }

      /* 4b — VERIFICATION (Phase C): bounded wait for the blind solver,
         compare against the script's extracted final answer, and on a
         high-confidence disagreement re-write the solve-chain scenes ONCE
         with the discrepancy note. Never blocks delivery longer than the
         caps; a still-wrong answer ships flagged. */
      let solver: SolverAnswer | null = null;
      try {
        let solverTimer: ReturnType<typeof setTimeout> | undefined;
        try {
          solver = await Promise.race([
            solverPromise,
            new Promise<null>(resolve => { solverTimer = setTimeout(() => resolve(null), SOLVER_WAIT_MS); }),
          ]);
        } finally { clearTimeout(solverTimer); }
      } catch {
        solver = null;
      }
      let scriptAnswer = extractScriptAnswer(script);
      let verdict: VerifyVerdict | "unresolved" =
        solver?.answer && scriptAnswer
          ? compareAnswers(solver.answer, scriptAnswer.answer)
          : "unresolved";
      let rerun = !!cp.repaired;

      if (verdict === "mismatch" && solver?.answer && scriptAnswer && !cp.repaired) {
        rerun = true;
        const from = Math.min(2, scriptAnswer.scene);
        const to = scriptAnswer.scene; // solve-chain: scenes 3..answer, inclusive
        const note = `an independent solver got "${solver.answer}" but this lesson's final answer reads "${scriptAnswer.answer}"`;
        console.warn(
          `[verify] mismatch — rerunning scenes ${from + 1}..${to + 1}: ${note}`
        );
        await Promise.all(
          Array.from({ length: to - from + 1 }, async (_, k) => {
            const i = from + k;
            if (cp.repairScenes?.includes(i)) return;
            const t0 = Date.now();
            const planned = transcript ? transcript[i] : null;
            /* narration is NEVER reassigned — voices already flushed from
               the original narration and the cache key must not drift */
            const r = await writeScene(outlineJson, i, planned, {
              note,
              hops: job.stats,
              complete: providers.complete,
            });
            if (r) {
              job.stats.writerMs.push(Date.now() - t0);
              results[i] = { narration: results[i]?.narration, beats: r.beats };
            }
            (cp.repairScenes ??= []).push(i);
            await save();
          })
        );
        cp.repaired = true;
        await save();
        const rawScript2 = {
          title: outline.title,
          subject: outline.subject,
          question: outline.question,
          scenes: outline.scenes.map((scene, i) => ({
            chapter: scene.chapter,
            narration: results[i]?.narration ?? "",
            beats: results[i]?.beats ?? [],
          })),
        };
        const script2 = sanitizeScript(rawScript2, job.stats);
        if (script2 && script2.scenes.length >= 2) {
          script = script2;
          tl = compileTimeline(script);
          job.stats.overlapPct = Math.round(scriptOverlap(script) * 100);
          violations = auditTimeline(tl);
          job.stats.layoutViolations = violations.length;
          scriptAnswer = extractScriptAnswer(script);
          if (solver.answer && scriptAnswer) {
            verdict = compareAnswers(solver.answer, scriptAnswer.answer);
          }
        }
      }

      job.stats.verification = {
        verdict,
        solverAnswer: solver?.answer ?? null,
        scriptAnswer: scriptAnswer?.answer ?? null,
        rerun,
      };
      /* a late solver still lands honestly in the stats (no rerun then) */
      void solverPromise.then((s) => {
        if (
          s?.answer &&
          job.stats.verification &&
          !job.stats.verification.solverAnswer
        ) {
          job.stats.verification.solverAnswer = s.answer;
        }
      }).catch(() => undefined);

      job.script = script;
      for (const scene of script.scenes) {
        if (scene.narration) {
          const index = cp.results.findIndex(result => cleanNarration(result?.narration) === scene.narration);
          Object.assign(scene, { audio: { key: voiceKeys[index] ?? audioKey(scene.narration), narration: scene.narration } });
        }
      }
      job.mergedAt = Date.now();
      markWatchable();
      job.phase = "voicing";
      await save();
    }

    /* 5 ─ let the remaining voices land, then the job is complete */
    await voiceChain;
    /* reviews that settled after the merge cap still count — refresh
       so ready-time snapshots are exact */
    job.stats.reviewedScenes = reviewCounters.reviewed;
    job.stats.fixedScenes = reviewCounters.fixed;
    job.stats.unreviewedScenes = outline.scenes.length - reviewCounters.reviewed;
    finishVoicing(job, Date.now());
    markWatchable();
    await save();
  } catch (err) {
    if (err instanceof LeaseLostError) throw err;
    console.error("video job crashed:", err);
    job.phase = "error";
    job.error = "Video generation hit a snag. Please try again.";
    await save();
  } finally {
    acceptingReviews = false;
  }
}
