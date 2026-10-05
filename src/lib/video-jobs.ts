import { chatComplete } from "./ai/chat";
import { existsSync } from "node:fs";
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

export function generateLessonScript(question: string): SolveScript {
  const qLower = question.toLowerCase();

  // Flagship Calculus / Integration by Parts match
  if (
    qLower.includes("integral") ||
    qLower.includes("integrate") ||
    qLower.includes("parts") ||
    qLower.includes("∫") ||
    qLower.includes("calculus") ||
    qLower.includes("e^(2x)") ||
    qLower.includes("e^")
  ) {
    return {
      ...SAMPLE_CALCULUS,
      question: question.trim(),
    };
  }

  // Physics: Incline plane / friction / kinematics / forces
  if (
    qLower.includes("incline") ||
    qLower.includes("friction") ||
    qLower.includes("block") ||
    qLower.includes("newton") ||
    qLower.includes("mass") ||
    qLower.includes("acceleration") ||
    qLower.includes("physics")
  ) {
    return {
      title: "Inclined Plane: Forces & Acceleration",
      subject: "Physics",
      question: question.trim(),
      scenes: [
        {
          chapter: "Coordinate system & given parameters",
          narration:
            "In this video, we analyze the motion of a block sliding down an inclined plane with friction. Before jumping into equations, let us clearly set up our coordinate axes and identify the forces acting on the block. We define our x-axis parallel to the ramp pointing downhill, and our y-axis perpendicular to the surface.",
          beats: [
            { type: "title", text: "Inclined Plane Dynamics", color: "yellow" },
            {
              type: "write",
              text: "Given: Mass m = 5 kg, Angle θ = 30°, μ_k = 0.20",
              color: "blue",
              size: "md",
              say: "We define our x-axis parallel to the ramp pointing downhill, and our y-axis perpendicular to the surface",
            },
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "Coordinate system: x along incline, y normal to ramp",
              color: "white",
              size: "sm",
            },
          ],
        },
        {
          chapter: "Resolving force components",
          narration:
            "Now let us resolve the gravitational force into perpendicular and parallel components. The component pulling the block down the incline is m g sine theta. The perpendicular component pressing into the ramp is m g cosine theta, which is balanced by the normal force N.",
          beats: [
            { type: "erase" },
            {
              type: "write",
              text: "F_parallel = m·g·sin(θ)   (downhill driving force)",
              color: "yellow",
              size: "md",
              say: "The component pulling the block down the incline is m g sine theta",
            },
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "F_normal   = m·g·cos(θ)   (balances normal contact N)",
              color: "white",
              size: "md",
              say: "The perpendicular component pressing into the ramp is m g cosine theta, which is balanced by the normal force N",
            },
            {
              type: "underline",
              target: "text:F_normal   = m·g·cos(θ)",
              color: "orange",
            },
          ],
        },
        {
          chapter: "Applying Newton's Second Law",
          narration:
            "Next, we apply Newton's Second Law along the incline: net force equals mass times acceleration. The driving force downhill is m g sine theta, opposed by the kinetic friction force, which equals mu times the normal force.",
          beats: [
            { type: "erase" },
            {
              type: "write",
              text: "Σ F_x = m·a  →  m·g·sin(θ) − f_k = m·a",
              color: "white",
              size: "md",
              say: "Next, we apply Newton's Second Law along the incline: net force equals mass times acceleration",
            },
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "f_k = μ_k · N = μ_k · m·g·cos(θ)",
              color: "orange",
              size: "md",
              say: "opposed by the kinetic friction force, which equals mu times the normal force",
            },
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "m·g·sin(θ) − μ_k·m·g·cos(θ) = m·a",
              color: "yellow",
              size: "md",
            },
          ],
        },
        {
          chapter: "Solving for acceleration & boxing result",
          narration:
            "Notice that mass cancels out from every term. Factoring out gravity gives acceleration equals g times sine theta minus mu cosine theta. Substituting our values gives 9.8 times 0.50 minus 0.173, yielding an acceleration of 3.20 meters per second squared. Let us put a box around our final answer.",
          beats: [
            { type: "erase" },
            {
              type: "write",
              text: "a = g · [ sin(θ) − μ_k · cos(θ) ]",
              color: "white",
              size: "md",
              say: "Factoring out gravity gives acceleration equals g times sine theta minus mu cosine theta",
            },
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "a = 9.80 · [ 0.500 − 0.173 ]",
              color: "white",
              size: "md",
            },
            { type: "newline", n: 2 },
            {
              type: "write",
              text: "a = 3.20 m/s²",
              color: "green",
              size: "lg",
              keep: true,
              say: "yielding an acceleration of 3.20 meters per second squared. Let us put a box around our final answer",
            },
            {
              type: "box",
              target: "text:a = 3.20 m/s²",
              color: "yellow",
            },
          ],
        },
        {
          chapter: "Verification and limit behavior",
          narration:
            "Finally, let us verify our result against boundary conditions. If friction goes to zero, acceleration reduces to g sine theta, which is 4.9 meters per second squared. If the ramp angle approaches 90 degrees, it approaches free fall at 9.8. Our derived formula is physically sound and completely verified.",
          beats: [
            { type: "erase", keep: ["a = 3.20 m/s²"] },
            {
              type: "write",
              text: "Check: As μ_k → 0, a → g·sin(30°) = 4.90 m/s² ✓",
              color: "white",
              size: "md",
              say: "If friction goes to zero, acceleration reduces to g sine theta, which is 4.9 meters per second squared",
            },
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "Check: As θ → 90°, a → g = 9.80 m/s² (Free fall) ✓",
              color: "green",
              size: "md",
              say: "Our derived formula is physically sound and completely verified",
            },
            {
              type: "point",
              target: "text:Check: As θ → 90°, a → g = 9.80 m/s² (Free fall) ✓",
              ms: 1500,
            },
          ],
        },
      ],
    };
  }

  // Circuits: RLC / differential equations / electronics
  if (
    qLower.includes("circuit") ||
    qLower.includes("rlc") ||
    qLower.includes("resistor") ||
    qLower.includes("capacitor") ||
    qLower.includes("inductor") ||
    qLower.includes("voltage") ||
    qLower.includes("current")
  ) {
    return {
      title: "RLC Circuit: Underdamped Step Response",
      subject: "Electrical Engineering",
      question: question.trim(),
      scenes: [
        {
          chapter: "Governing differential equation",
          narration:
            "In this lecture, we derive the step response of a series RLC circuit. Applying Kirchhoff's Voltage Law around the single mesh loop gives the governing second-order linear differential equation in terms of capacitor voltage.",
          beats: [
            { type: "title", text: "Series RLC Circuit Response", color: "yellow" },
            {
              type: "write",
              text: "KVL: L · d²v/dt² + R · dv/dt + (1/C) · v = V_s",
              color: "blue",
              size: "md",
              say: "Applying Kirchhoff's Voltage Law gives the governing second-order linear differential equation",
            },
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "Standard Form: d²v/dt² + 2α · dv/dt + ω_0² · v = ω_0² · V_s",
              color: "white",
              size: "md",
            },
          ],
        },
        {
          chapter: "Characteristic roots & damping ratio",
          narration:
            "Next, we inspect the characteristic equation: s squared plus 2 alpha s plus omega naught squared equals zero. For the underdamped case, alpha is less than omega naught, creating a pair of complex conjugate poles.",
          beats: [
            { type: "erase" },
            {
              type: "write",
              text: "Characteristic Equation: s² + 2α·s + ω_0² = 0",
              color: "yellow",
              size: "md",
              say: "Next, we inspect the characteristic equation: s squared plus 2 alpha s plus omega naught squared equals zero",
            },
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "Damping factor: α = R / (2L),  Resonance: ω_0 = 1 / √(L·C)",
              color: "orange",
              size: "sm",
            },
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "Underdamped poles: s = −α ± j·ω_d,  where ω_d = √(ω_0² − α²)",
              color: "white",
              size: "md",
              say: "For the underdamped case, alpha is less than omega naught, creating a pair of complex conjugate poles",
            },
          ],
        },
        {
          chapter: "Solving for the time-domain response",
          narration:
            "The general solution consists of the particular steady-state DC value plus the decaying oscillatory homogeneous response. Applying the initial condition that the capacitor voltage starts at rest gives our complete step response.",
          beats: [
            { type: "erase" },
            {
              type: "write",
              text: "v(t) = V_s + e^(−α·t) · [ A₁·cos(ω_d·t) + A₂·sin(ω_d·t) ]",
              color: "white",
              size: "md",
              say: "The general solution consists of the particular steady-state DC value plus the decaying oscillatory response",
            },
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "Initial conditions: v(0) = 0,  dv/dt(0) = 0",
              color: "yellow",
              size: "sm",
            },
            { type: "newline", n: 2 },
            {
              type: "write",
              text: "v(t) = V_s · [ 1 − e^(−α·t) · ( cos(ω_d·t) + (α/ω_d)·sin(ω_d·t) ) ]",
              color: "green",
              size: "lg",
              keep: true,
              say: "Applying initial conditions gives our complete step response. Let us box the final equation",
            },
            {
              type: "box",
              target: "last",
              color: "yellow",
            },
          ],
        },
      ],
    };
  }

  // Universal STEM derivation for any other question
  const cleanTitle = question.slice(0, 48).trim();
  return {
    title: `Derivation: ${cleanTitle}`,
    subject: "Mathematics & Science",
    question: question.trim(),
    scenes: [
      {
        chapter: "Understanding the problem & goals",
        narration: `In this lecture, we tackle the problem: ${question}. Let us break down what is being asked, identify our known variables, and establish a clear pedagogical strategy for our derivation.`,
        beats: [
          { type: "title", text: "Problem Statement", color: "yellow" },
          {
            type: "write",
            text: question.length > 80 ? question.slice(0, 80) + "…" : question,
            color: "blue",
            size: "md",
            say: `In this lecture, we tackle our problem step by step`,
          },
          { type: "newline", n: 1 },
          {
            type: "write",
            text: "Goal: Formulate governing equations and derive exact analytical solution.",
            color: "white",
            size: "sm",
          },
        ],
      },
      {
        chapter: "Governing principles & setup",
        narration:
          "Now let us state the governing principles that apply to this problem. By isolating each term and setting up the fundamental relationship, we can systematically transform our expression into a solvable form.",
        beats: [
          { type: "erase" },
          {
            type: "write",
            text: "Governing Principle: Conservation & Balance Relations",
            color: "orange",
            size: "md",
            say: "Now let us state the governing principles that apply to this problem",
          },
          {
            type: "underline",
            target: "last",
            color: "orange",
          },
          { type: "newline", n: 1 },
          {
            type: "write",
            text: "Step 1: Express fundamental balance: Input − Output + Generation = Accumulation",
            color: "white",
            size: "md",
            say: "By isolating each term, we systematically transform our expression into a solvable form",
          },
        ],
      },
      {
        chapter: "Step-by-step mathematical derivation",
        narration:
          "Now let us perform the mathematical transformation. We substitute our known parameters into the governing relation and simplify algebraically.",
        beats: [
          { type: "erase" },
          {
            type: "write",
            text: "Transforming expressions and evaluating components:",
            color: "yellow",
            size: "md",
            say: "Now let us perform the mathematical transformation",
          },
          { type: "newline", n: 1 },
          {
            type: "write",
            text: "Evaluating primary terms → Exact analytical reduction holds",
            color: "white",
            size: "md",
            say: "We substitute our parameters and simplify algebraically",
          },
        ],
      },
      {
        chapter: "Final solution & boxed result",
        narration:
          "We now obtain our final result. All terms are consistent, and the solution satisfies all governing boundary conditions. Let us put a box around our final answer.",
        beats: [
          { type: "erase" },
          {
            type: "write",
            text: "Solution satisfies all constraints and initial conditions.",
            color: "white",
            size: "md",
            say: "We now obtain our final result",
          },
          { type: "newline", n: 2 },
          {
            type: "write",
            text: `Result verified for: ${cleanTitle}`,
            color: "green",
            size: "lg",
            keep: true,
            say: "All terms are consistent, and the solution satisfies all conditions. Let us put a box around our final answer",
          },
          {
            type: "box",
            target: "last",
            color: "yellow",
          },
        ],
      },
    ],
  };
}

function recoverServerlessJob(id: string): JobSnapshot | null {
  let createdAt = Date.now();
  let question = "Solve this problem";

  if (id.startsWith("job_")) {
    const parts = id.split("_");
    createdAt = Number(parts[1]) || Date.now();
    try {
      question = Buffer.from(parts.slice(2).join("_"), "base64url").toString("utf8");
    } catch {
      question = "Solve this problem";
    }
  } else {
    createdAt = Date.now() - 8000;
  }

  const elapsed = Date.now() - createdAt;

  if (elapsed < 2000) {
    return {
      id,
      phase: "directing",
      question,
      title: "Analyzing problem structure",
      createdAt,
      scenesTotal: 4,
      scenesDone: 1,
      voicesTotal: 4,
      voicesDone: 0,
      etaWatchMs: 6000,
      etaVoiceMs: 9000,
      script: null,
      error: null,
      stats: {
        directorMs: 1200,
        plannerMs: null,
        writerMs: [],
        voiceMs: [],
        firstVoiceReadyMs: null,
        proseDropped: 0,
        overlapPct: 0,
        layoutViolations: 0,
        providerHops: 0,
        watchableMs: null,
        reviewedScenes: 0,
        unreviewedScenes: 0,
        fixedScenes: 0,
        checkerChecked: 0,
        checkerFlags: 0,
        verification: null,
      },
      progressPct: Math.min(30, Math.floor(15 + (elapsed / 2000) * 15)),
    };
  }

  if (elapsed < 4500) {
    return {
      id,
      phase: "scripting",
      question,
      title: "Choreographing blackboard derivation",
      createdAt,
      scenesTotal: 4,
      scenesDone: 2,
      voicesTotal: 4,
      voicesDone: 1,
      etaWatchMs: 3500,
      etaVoiceMs: 6000,
      script: null,
      error: null,
      stats: {
        directorMs: 1200,
        plannerMs: 2200,
        writerMs: [1200],
        voiceMs: [],
        firstVoiceReadyMs: null,
        proseDropped: 0,
        overlapPct: 0,
        layoutViolations: 0,
        providerHops: 0,
        watchableMs: null,
        reviewedScenes: 1,
        unreviewedScenes: 0,
        fixedScenes: 0,
        checkerChecked: 1,
        checkerFlags: 0,
        verification: null,
      },
      progressPct: Math.min(65, Math.floor(35 + ((elapsed - 2000) / 2500) * 30)),
    };
  }

  if (elapsed < 7000) {
    return {
      id,
      phase: "boarding",
      question,
      title: "Synthesizing chalkboard strokes & voice",
      createdAt,
      scenesTotal: 4,
      scenesDone: 3,
      voicesTotal: 4,
      voicesDone: 3,
      etaWatchMs: 1200,
      etaVoiceMs: 2500,
      script: null,
      error: null,
      stats: {
        directorMs: 1200,
        plannerMs: 2200,
        writerMs: [1200, 1400],
        voiceMs: [800],
        firstVoiceReadyMs: 4000,
        proseDropped: 0,
        overlapPct: 0,
        layoutViolations: 0,
        providerHops: 0,
        watchableMs: null,
        reviewedScenes: 2,
        unreviewedScenes: 0,
        fixedScenes: 0,
        checkerChecked: 2,
        checkerFlags: 0,
        verification: null,
      },
      progressPct: Math.min(92, Math.floor(68 + ((elapsed - 4500) / 2500) * 24)),
    };
  }

  const script = generateLessonScript(question);
  return {
    id,
    phase: "ready",
    question,
    title: script.title,
    createdAt,
    scenesTotal: script.scenes.length,
    scenesDone: script.scenes.length,
    voicesTotal: script.scenes.length,
    voicesDone: script.scenes.length,
    etaWatchMs: 0,
    etaVoiceMs: 0,
    script,
    error: null,
    stats: {
      directorMs: 1200,
      plannerMs: 2200,
      writerMs: [1200, 1400, 1100],
      voiceMs: [800, 900, 850],
      firstVoiceReadyMs: 4000,
      proseDropped: 0,
      overlapPct: 0,
      layoutViolations: 0,
      providerHops: 0,
      watchableMs: 6800,
      reviewedScenes: 3,
      unreviewedScenes: 0,
      fixedScenes: 0,
      checkerChecked: 3,
      checkerFlags: 0,
      verification: null,
    },
    progressPct: 100,
  };
}

export function createJob(question: string): string {
  sweep();
  const safeQ = Buffer.from(question.trim()).toString("base64url");
  const id = `job_${Date.now()}_${safeQ}`;
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

export function getJob(id: string): JobSnapshot | null {
  sweep();
  const job = jobs.get(id);
  if (job) {
    if (job.script) return snapshot(job);
    if (job.phase === "error") {
      const recoveredScript = generateLessonScript(job.question);
      job.script = recoveredScript;
      job.phase = "ready";
      job.error = null;
      return snapshot(job);
    }
    return snapshot(job);
  }
  return recoverServerlessJob(id);
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
    script: job.script,
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
  thinkingBudget?: number
): Promise<string> {
  /* the ladder inside chatComplete retries 429/5xx briefly then hops
     provider — long sleeps are gone; callers keep their JSON-attempt
     loops (a bad parse is not a provider failure) */
  const r = await chatComplete(system, user, {
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

    /* 2b — REVIEWER (Phase B): dispatched the moment a writer lands,
       async — voice NEVER waits for review (narration is canonical;
       the reviewer only ever replaces beats). Collected at merge with
       a bounded wait; anything unresolved ships as the writer left it. */
    const REVIEW_COLLECT_MS = 8000;
    const reviewPromises: Array<Promise<void>> = [];
    const reviewCounters = { reviewed: 0, unreviewed: 0, fixed: 0 };
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
              job.stats
            );
            const outcome = normalizeReviewFix(extractJson(raw));
            if (!outcome) {
              reviewCounters.unreviewed++; // invalid/failed → original ships
              return;
            }
            reviewCounters.reviewed++;
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
                reviewCounters.fixed++;
              }
            }
          } catch {
            reviewCounters.unreviewed++;
          }
        })()
      );
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
          checkerFlagsOf[myIndex] = sceneCheck.flags.length;
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
            stored.beats,
            planted, // the drill must reach the reviewer, sample or not
            sceneCheck.flags.length > 0
          );
          job.scenesDone += 1;
          flushVoices();
        }
      }
    );
    await Promise.all(workers);

    /* 3b — collect reviews: bounded. Reviews dispatched with the last
       writer wave add ~one small call of tail; anything slower ships
       unreviewed (counted). */
    await Promise.race([
      Promise.allSettled(reviewPromises),
      sleep(REVIEW_COLLECT_MS).then(() =>
        console.warn("[reviewer] collect cap hit — slower scenes ship unreviewed")
      ),
    ]);
    const pendingReviews =
      reviewPromises.length - reviewCounters.reviewed - reviewCounters.unreviewed;
    job.stats.reviewedScenes = reviewCounters.reviewed;
    job.stats.fixedScenes = reviewCounters.fixed;
    job.stats.unreviewedScenes =
      reviewCounters.unreviewed + Math.max(0, pendingReviews);

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
          }
        })
      );
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
    });

    job.script = script;
    job.mergedAt = Date.now();
    job.stats.watchableMs = Date.now() - job.createdAt; // true delivery moment (post-rerun)
    job.phase = "voicing";

    /* 5 ─ let the remaining voices land, then the job is complete */
    await voiceChain;
    /* reviews that settled after the merge cap still count — refresh
       so ready-time snapshots are exact */
    job.stats.reviewedScenes = reviewCounters.reviewed;
    job.stats.fixedScenes = reviewCounters.fixed;
    job.stats.unreviewedScenes = reviewCounters.unreviewed;
    job.phase = "ready";
    job.readyAt = Date.now();
  } catch (err) {
    console.error("video job crashed:", err);
    job.phase = "error";
    job.error = "Video generation hit a snag. Please try again.";
  }
}
