import { chatComplete } from "./ai/chat";
import { existsSync } from "node:fs";
import {
  extractJson,
  sanitizeScript,
  sanitizeSceneBeats,
  cleanNarration,
} from "./solve-schema";
import { compileTimeline } from "./video/compile";
import { measureTimeline, type TimelineMetrics } from "./video/timeline-metrics";
import { parseMeasuredSceneTiming, upsertMeasuredSceneTiming, type MeasuredSceneTiming } from "./video/timing-report";
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
import { normalizeReviewFix, acceptSceneReview } from "./video/review";
import { collectSceneReviews } from "./video/review-gate";
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
import { SAMPLE_CALCULUS } from "./samples";

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
  boardingStartAt: number | null;
  /* honest monotonic progress % — never 100 before ready */
  progressPct: number;
  writerEwma: number;
  voiceEwma: number;
  mergedAt: number | null;
  readyAt: number | null;
  stats: {
    timing: { planned: TimelineMetrics | null; measuredScenes: MeasuredSceneTiming[] };
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
  const id = crypto.randomUUID();
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
    boardingStartAt: null,
    progressPct: 0,
    writerEwma: PRIOR_WRITER_MS,
    voiceEwma: PRIOR_VOICE_MS,
    mergedAt: null,
    readyAt: null,
    stats: {
      timing: { planned: null, measuredScenes: [] },
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
  jobs.set(id, job);
  void runJob(job).catch((e) => {
    console.error("runJob unhandled error:", e);
  });
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

/** Numeric browser observations only; reports never influence playback or generation. */
export function recordSceneTiming(id: string, raw: unknown): "recorded" | "invalid" | "missing" {
  sweep();
  const job = jobs.get(id);
  if (!job?.script) return "missing";
  const report = parseMeasuredSceneTiming(raw, job.script.scenes.length);
  if (!report) return "invalid";
  // Existing dev-mode jobs may predate this field across a hot reload.
  job.stats.timing ??= { planned: null, measuredScenes: [] };
  job.stats.timing.measuredScenes = upsertMeasuredSceneTiming(job.stats.timing.measuredScenes, report);
  return "recorded";
}

export function getJob(id: string): JobSnapshot | null {
  sweep();
  const job = jobs.get(id);
  return job ? snapshot(job) : null;
}

function snapshot(job: Job): JobSnapshot {
  const now = Date.now();
  const deliverable = (job.phase === "voicing" || job.phase === "ready") &&
    job.scenesTotal > 0 && job.stats.reviewedScenes === job.scenesTotal &&
    job.stats.unreviewedScenes === 0 ? job.script : null;
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
        script: deliverable,
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
    script: deliverable,
    error: job.error,
    stats: job.stats,
    progressPct: pct,
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
  hopSink?: { providerHops: number },
  thinkingBudget?: number
): Promise<string> {
  /* the ladder inside chatComplete retries 429/5xx briefly then hops
     provider — long sleeps are gone; callers keep their JSON-attempt
     loops (a bad parse is not a provider failure) */
  const r = await chatComplete(system, user, {
    tier,
    thinkingBudget,
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
        job.stats
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
  sceneCount: number
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
        1024
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
  opts?: { note?: string; hops?: { providerHops: number } }
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
        opts?.hops
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
    /* 0 ─ BLIND SOLVER (Phase C): one parallel call from t0, from the
       question ALONE — never sees the outline/script. Compared at merge;
       never blocks delivery beyond a bounded wait. */
    const SOLVER_WAIT_MS = 8000;
    const solverPromise = (async (): Promise<SolverAnswer | null> => {
      try {
        const raw = await chatJson(SOLVER_SYSTEM, solverUser(job.question), "reason", job.stats);
        return normalizeSolver(extractJson(raw));
      } catch {
        return null; // no verdict — the video still ships
      }
    })();

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
    job.boardingStartAt = Date.now();

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

    /* Reviews and voices run in parallel, but delivery requires every review.
       Only the collector can apply accepted beats; late calls cannot mutate them. */
    const REVIEW_COLLECT_MS = 30_000;
    type AcceptedReview = { beats: ReturnType<typeof sanitizeSceneBeats>; fixed: boolean };
    const reviewPromises: Array<Promise<AcceptedReview | null>> = [];
    const fixedScenes = new Set<number>();
    const dispatchReview = (
      idx: number,
      chapter: string,
      narration: string,
      beats: unknown[]
    ) => {
      reviewPromises[idx] = (async (): Promise<AcceptedReview | null> => {
          try {
            const raw = await chatJson(
              REVIEWER_SYSTEM,
              reviewerUser(chapter, narration, JSON.stringify(beats)),
              "fast",
              job.stats
            );
            const outcome = normalizeReviewFix(extractJson(raw));
            return acceptSceneReview(outcome, beats, chapter, narration, idx);
          } catch {
            return null;
          }
        })();
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
            (await writeScene(outlineJson, myIndex, planned, { hops: job.stats })) ?? {
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
          /* CHECKER (Phase C): pure-Node numeric spot-check, ms — runs
             the instant the writer lands; flags feed the reviewer's
             pressure sampling and the fix-acceptance test. */
          const sceneCheck = checkSceneLines(myIndex, stored.beats);
          job.stats.checkerChecked += sceneCheck.checked;
          job.stats.checkerFlags += sceneCheck.flags.length;
          if (sceneCheck.flags.length) {
            console.warn(
              `[checker] scene ${myIndex + 1}: ${sceneCheck.flags
                .map((f) => `${f.text} (${f.detail})`)
                .join("; ")}`
            );
          }
          dispatchReview(
            myIndex,
            outline.scenes[myIndex].chapter,
            narrations[myIndex] ?? "",
            stored.beats
          );
          job.scenesDone += 1;
          flushVoices();
        }
      }
    );
    await Promise.all(workers);

    const collectRequired = async (indices: number[]): Promise<boolean> => {
      const batch = await collectSceneReviews(indices.map(i => reviewPromises[i] ?? Promise.resolve(null)), REVIEW_COLLECT_MS);
      // Count final scene outcomes, not attempts; rewritten scenes replace prior approvals.
      const failed = batch.statuses.filter(s => s !== "passed").length;
      job.stats.reviewedScenes = outline.scenes.length - failed;
      job.stats.unreviewedScenes = failed;
      for (const i of indices) fixedScenes.delete(i);
      if (!batch.passed) {
        job.script = null;
        job.phase = "error";
        job.error = "Lesson held: one or more scenes could not pass review before the deadline. Try again to regenerate the lesson.";
        job.stats.fixedScenes = fixedScenes.size;
        return false;
      }
      batch.results.forEach((accepted,k) => {
        const i = indices[k];
        results[i] = { narration:results[i]?.narration, beats:accepted!.beats };
        if (accepted!.fixed) fixedScenes.add(i);
      });
      job.stats.fixedScenes = fixedScenes.size;
      return true;
    };
    if (!await collectRequired(outline.scenes.map((_,i) => i))) return;

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
      return;
    }
    let tl = compileTimeline(script); // server-side smoke test — must never crash a client
    job.stats.timing = { planned: measureTimeline(tl), measuredScenes: [] };
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
      solver = await Promise.race([
        solverPromise,
        sleep(SOLVER_WAIT_MS).then(() => null as SolverAnswer | null),
      ]);
    } catch {
      solver = null;
    }
    let scriptAnswer = extractScriptAnswer(script);
    let verdict: VerifyVerdict | "unresolved" =
      solver?.answer && scriptAnswer
        ? compareAnswers(solver.answer, scriptAnswer.answer)
        : "unresolved";
    let rerun = false;

    if (verdict === "mismatch" && solver?.answer && scriptAnswer) {
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
          const t0 = Date.now();
          const planned = transcript ? transcript[i] : null;
          /* narration is NEVER reassigned — voices already flushed from
             the original narration and the cache key must not drift */
          const r = await writeScene(outlineJson, i, planned, {
            note,
            hops: job.stats,
          });
          if (r) {
            job.stats.writerMs.push(Date.now() - t0);
            results[i] = { narration: results[i]?.narration, beats: r.beats };
            dispatchReview(i, outline.scenes[i].chapter, narrations[i] ?? "", r.beats);
          } else {
            reviewPromises[i] = Promise.resolve(null);
          }
        })
      );
      if (!await collectRequired(Array.from({length:to-from+1},(_,k)=>from+k))) return;
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
        job.stats.timing = { planned: measureTimeline(tl), measuredScenes: [] };
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
    });

    if (violations.length || verdict === "mismatch") {
      job.phase = "error";
      job.error = "Lesson held: the final board or answer did not pass verification. Try again to regenerate the lesson.";
      return;
    }
    job.script = script;
    job.mergedAt = Date.now();
    job.stats.watchableMs = Date.now() - job.createdAt; // true delivery moment (post-rerun)
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
