# Lesson Engine Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (- [ ]) syntax for tracking.

**Goal:** Establish the measurable, typed foundation for an audio-first STEM lesson engine: validated semantic lesson/board artifacts, deterministic board-ownership auditing, and trustworthy planned/actual timing telemetry. This slice does not change the renderer, prompts, TTS provider, or learner-facing behavior.

**Architecture:** Keep the current solve pipeline live while adding pure contracts beside it. A future Lesson Director will produce LessonPlan → NarrationScore → BoardScore; this phase makes those artifacts validatable and auditable before LLM outputs use them. The existing timeline is measured after server compilation and when the browser knows each real audio duration. The browser submits only bounded numeric timing values to the existing ephemeral job store—never transcript, prompt, audio URL, or student data.

**Tech Stack:** TypeScript, Next.js 16 route handlers, React 19, existing timeline compiler, bun:test; no new dependency.

## Global Constraints

- Preserve streaming: director → planner → writers → merge → client playback. This work must not delay voice production or watchability.
- Contracts are additive and isolated. Do not add BoardScore to SolveScript or change existing LLM prompts in this slice.
- Existing timeline units are seconds; telemetry/public metrics use milliseconds. Convert only at module boundaries.
- Board ownership is semantic (purpose, landmark, hierarchy, persistence). Rendering/layout continues to own pixels and collision repair.
- No UI/brand redesign. Existing board/player behavior stays intact.
- Do not alter unrelated dirty files. The sole permitted overlap is adding the scoped jobId prop to src/app/page.tsx.
- Run targeted tests before and after each task, then bun test, lint, build and a manual browser check.
- Every commit ends with Co-Authored-By: Claude Code <noreply@anthropic.com>.

## File Map

Create:

- src/lib/lesson/contracts.ts — semantic lesson/BoardScore types and strict normalizers.
- src/lib/video/board-audit.ts — pure semantic ownership audit.
- src/lib/video/timeline-metrics.ts — planned/actual timing and pace metrics.
- src/lib/video/timing-report.ts — safe client payload parser and reducer.
- src/app/api/video/jobs/[id]/timing/route.ts — receives one validated timing report.
- tests/lesson-contracts.test.ts, tests/board-audit.test.ts, tests/timeline-metrics.test.ts, tests/timing-report.test.ts.

Modify:

- src/lib/video-jobs.ts — retain planned metrics and bounded actual scene reports in job stats.
- src/components/player/SolvePlayer.tsx — report only after its audio metadata resolves.
- src/app/page.tsx — pass the current watched job ID to the player.

---

### Task 1: Semantic lesson and board contracts

**Files:**

- Create: src/lib/lesson/contracts.ts
- Create: tests/lesson-contracts.test.ts

**Produces:**

    export type LessonKind = "solve" | "explain";
    export type LessonDomain = "math" | "physics" | "chemistry" | "computing";
    export type SegmentFunction =
      | "hook" | "orient" | "pretrain" | "plan" | "work" | "predict"
      | "reveal" | "check" | "formalize" | "misconception" | "transfer" | "recap";

    export interface LessonPlan {
      id: string; kind: LessonKind; domain: LessonDomain; title: string;
      learnerLevel: "university-intro"; segments: LessonSegment[];
    }
    export interface NarrationScore { lessonId: string; phrases: PhraseAnchor[]; }
    export interface BoardScore {
      lessonId: string; boardZones: BoardZones; landmarks: BoardLandmark[];
      states: BoardState[]; visualGrammar: BoardVisualGrammar;
    }

    export function normalizeLessonPlan(raw: unknown): LessonPlan | null;
    export function normalizeNarrationScore(raw: unknown, lesson: LessonPlan): NarrationScore | null;
    export function normalizeBoardScore(raw: unknown, lesson: LessonPlan, narration: NarrationScore): BoardScore | null;

- [ ] **Step 1: Write failing tests**

Create a screenshot-inspired matrix fixture. Its lesson has orient and read-a23 segments. Its board has a matrix-a representation with lesson persistence, a row-index and a column-index landmark with until-replaced persistence. The read-a23 state keeps all three visible and its phrase points to that segment.

Assert all normalizers return values and retain IDs. Assert null for: duplicate segment ID; phrase with unknown segment; duplicate landmark ID; state with unknown landmark; emphasis not visible in the same state; blank purpose; and BoardScore whose lesson ID differs from the LessonPlan.

Run: bun test tests/lesson-contracts.test.ts

Expected: FAIL — the module is missing.

- [ ] **Step 2: Implement contracts and fail-closed normalizers**

In src/lib/lesson/contracts.ts, add:

    export type BoardZoneName = "context" | "activeWork" | "visualModel" | "conclusion";
    export type BoardPrimitive =
      | "text" | "equation" | "matrix" | "graph" | "freebody"
      | "structure" | "table" | "numberline" | "trace";
    export type LandmarkRole =
      | "given" | "definition" | "representation" | "index"
      | "operation" | "result" | "check" | "annotation";
    export type Persistence = "scene" | "lesson" | "until-replaced";

    export interface BoardLandmark {
      id: string; primitive: BoardPrimitive; role: LandmarkRole; purpose: string;
      zone: BoardZoneName; persistence: Persistence; relationTo: string[];
    }
    export interface BoardState {
      id: string; segmentId: string; visibleIds: string[]; add: string[];
      emphasize: string[]; remove: string[]; learnerFocus: string; phraseIds: string[];
    }
    export interface BoardZones {
      context: { purpose: string }; activeWork: { purpose: string };
      visualModel: { purpose: string }; conclusion: { purpose: string };
    }
    export interface BoardVisualGrammar {
      colorRoles: Record<string, string>; alignmentRules: string[];
      erasePolicy: "preserve-context" | "clear-active-work" | "replace-representation";
      whitespaceBudget: "compact" | "balanced" | "generous";
    }

Use small runtime helpers (record, requiredString, stringArray, oneOf, uniqueIds) rather than unchecked casts. Validate cross references: all segment/phrase/landmark/state IDs unique; phrase segment IDs exist; score lesson ID matches; relationTo is a distinct known landmark; state segment/phrase/board references exist; add and remove do not overlap; each emphasize item is visible; purposes, focus, objectives and phrase text are trimmed and nonempty. Allow descriptive unknown fields, but never silently repair an invalid reference.

- [ ] **Step 3: Verify**

Run: bun test tests/lesson-contracts.test.ts

Expected: PASS. Valid matrix semantics survive; malformed relationships fail closed.

- [ ] **Step 4: Commit**

    git add src/lib/lesson/contracts.ts tests/lesson-contracts.test.ts
    git commit -m "Add validated semantic lesson and board contracts

    Co-Authored-By: Claude Code <noreply@anthropic.com>"

---

### Task 2: Board ownership audit

**Files:**

- Create: src/lib/video/board-audit.ts
- Create: tests/board-audit.test.ts

**Produces:**

    export interface BoardOwnershipViolation {
      kind: "missing-context" | "state-transition" | "persistence" | "color-role";
      stateId?: string; landmarkId?: string; detail: string;
    }
    export function auditBoardScore(score: BoardScore): BoardOwnershipViolation[];

- [ ] **Step 1: Write failing tests**

Reuse the valid matrix BoardScore. It must produce an empty violation list when its matrix uses lesson persistence, its indices persist until replacement, and visualGrammar.colorRoles includes distinct mappings for row-index: blue and column-index: red.

Independently mutate a copied score to make:

1. read-a23 drop matrix-a from visibleIds — expect persistence.
2. add include an item already visible in the immediately previous state — expect state-transition.
3. only one of the two index color roles mapped — expect color-role.
4. an operation/result visible with no given, definition, or representation visible — expect missing-context.

Run: bun test tests/board-audit.test.ts

Expected: FAIL — the module is missing.

- [ ] **Step 2: Implement the invariant audit**

The audit must return all issues and never throw. Traverse states in authored order:

    const previous = new Set(previousState?.visibleIds ?? []);
    const current = new Set(state.visibleIds);

Report state-transition when an addition was already visible, a removal was not previously visible, or a previous non-scene item disappears without appearing in remove. After a lesson-persistent landmark first appears, report persistence if a later state omits it. For missing-context, a state with a visible operation/result needs a visible given, definition, or representation. First state has no removal history.

For color semantics, require row-index and column-index only when either role exists; both values must be nonempty and distinct. This supports chemistry/physics boards that do not use matrix indices.

- [ ] **Step 3: Verify**

Run: bun test tests/board-audit.test.ts

Expected: PASS, especially continuity: the matrix remains on the board while A₂₃ is read.

- [ ] **Step 4: Commit**

    git add src/lib/video/board-audit.ts tests/board-audit.test.ts
    git commit -m "Audit board ownership, continuity and semantic color roles

    Co-Authored-By: Claude Code <noreply@anthropic.com>"

---

### Task 3: Deterministic timeline metrics

**Files:**

- Create: src/lib/video/timeline-metrics.ts
- Create: tests/timeline-metrics.test.ts

**Produces:**

    export interface SceneTimingMetric {
      sceneIndex: number; scheduledDurationMs: number; writeEndMs: number;
      audioDurationMs: number | null; writeVsAudioMs: number | null;
      strokeCount: number; medianInkPxPerSec: number | null;
    }
    export interface TimelineMetrics {
      scenes: SceneTimingMetric[]; totalInkStrokes: number;
      medianInkPxPerSec: number | null; pendingAudioScenes: number;
    }
    export function measureTimeline(timeline: Timeline): TimelineMetrics;

- [ ] **Step 1: Write failing tests**

Hand-build a two-scene Timeline with structural PathStroke values. Scene 0: a 100px path over one second, writeEnd 1.5, dur 2, audioDur 2. Scene 1: a 200px path over two seconds, writeEnd 2, dur 2.5, no audio. Add a zero-duration highlight stroke.

Assert: two counted ink strokes; scene 0 pace 100px/sec; scene 0 writeVsAudioMs equals -500; scene 1 audioDurationMs equals null; one pending audio scene; global median equals 100; no NaN or Infinity.

Run: bun test tests/timeline-metrics.test.ts

Expected: FAIL — module missing.

- [ ] **Step 2: Implement pure metrics**

Measure only non-highlight path strokes with finite positive duration: len divided by (end minus start). Exclude erases, non-paths and zero-time strokes. Use a deterministic median (sort copy; average central pair when even). Convert with:

    const secondsToMs = (seconds: number) => Math.round(seconds * 1000);
    const audioDurationMs = scene.audioDur === undefined ? null : secondsToMs(scene.audioDur);
    const writeVsAudioMs = audioDurationMs === null ? null : writeEndMs - audioDurationMs;

Round exposed px/sec to one decimal and ms to integer. Positive drift means scheduled ink ends after audio; do not impose quality thresholds here.

- [ ] **Step 3: Verify**

Run: bun test tests/timeline-metrics.test.ts

Expected: PASS with a genuine distinction between unresolved audio (null) and zero (invalid) duration.

- [ ] **Step 4: Commit**

    git add src/lib/video/timeline-metrics.ts tests/timeline-metrics.test.ts
    git commit -m "Measure planned timeline pace and audio drift deterministically

    Co-Authored-By: Claude Code <noreply@anthropic.com>"

---

### Task 4: Safe actual-audio timing report contract

**Files:**

- Create: src/lib/video/timing-report.ts
- Create: tests/timing-report.test.ts

**Produces:**

    export interface MeasuredSceneTiming {
      sceneIndex: number; audioDurationMs: number; writeEndMs: number;
    }
    export function parseMeasuredSceneTiming(raw: unknown, sceneCount: number): MeasuredSceneTiming | null;
    export function upsertMeasuredSceneTiming(
      existing: MeasuredSceneTiming[], next: MeasuredSceneTiming
    ): MeasuredSceneTiming[];

- [ ] **Step 1: Write failing safety tests**

Accept { sceneIndex: 1, audioDurationMs: 4200, writeEndMs: 3900 } for three scenes. Reject string index, negative/non-finite durations, index outside [0, sceneCount), a body containing audioUrl, and a body with other surplus keys. Assert update replaces a report for the same scene, is sorted by scene index, and does not mutate its input.

Run: bun test tests/timing-report.test.ts

Expected: FAIL — module missing.

- [ ] **Step 2: Implement parser and reducer**

A valid body is a plain object whose exact key set is the three allowed keys. Require nonnegative integer scene index and 0 < duration <= 1,800,000. Implementation:

    return [...existing.filter((item) => item.sceneIndex !== next.sceneIndex), next]
      .sort((a, b) => a.sceneIndex - b.sceneIndex);

This deliberate schema boundary prevents product telemetry from accidentally accepting student data or URLs.

- [ ] **Step 3: Verify and commit**

Run: bun test tests/timing-report.test.ts

Expected: PASS.

    git add src/lib/video/timing-report.ts tests/timing-report.test.ts
    git commit -m "Add bounded client timing-report contract

    Co-Authored-By: Claude Code <noreply@anthropic.com>"

---

### Task 5: Wire timing through job store and player

**Files:**

- Modify: src/lib/video-jobs.ts
- Create: src/app/api/video/jobs/[id]/timing/route.ts
- Modify: src/components/player/SolvePlayer.tsx
- Modify: src/app/page.tsx

**Produces:**

    export function recordSceneTiming(
      jobId: string, raw: unknown
    ): "recorded" | "invalid" | "missing";

    // Job.stats addition
    timing: {
      planned: TimelineMetrics | null;
      measuredScenes: MeasuredSceneTiming[];
    }

- [ ] **Step 1: Add store behavior without provider-dependent tests**

Use the pure Task 4 parser/reducer tests as the unit proof. Do not create a job from a test: createJob invokes providers asynchronously and makes tests nondeterministic.

In video-jobs.ts, import measureTimeline, TimelineMetrics, parseMeasuredSceneTiming, upsertMeasuredSceneTiming, and MeasuredSceneTiming. Initialize:

    timing: {
      planned: null as TimelineMetrics | null,
      measuredScenes: [] as MeasuredSceneTiming[],
    },

At both successful post-merge compile paths (normal merge and verification-rerun merge), immediately after compileTimeline(script), set job.stats.timing.planned = measureTimeline(tl).

Export recordSceneTiming(jobId, raw): call sweep, return missing if job/script absent; parse using job.script.scenes.length; return invalid if rejected; otherwise replace the item in job.stats.timing.measuredScenes and return recorded. It never logs bodies or throws.

- [ ] **Step 2: Add narrow API handler**

Create src/app/api/video/jobs/[id]/timing/route.ts using the current [id] route params convention:

    import { NextRequest, NextResponse } from "next/server";
    import { recordSceneTiming } from "@/lib/video-jobs";

    export const maxDuration = 60;

    export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
      const { id } = await ctx.params;
      const body = await req.json().catch(() => null);
      const result = recordSceneTiming(id, body);
      if (result === "recorded") return new NextResponse(null, { status: 204 });
      if (result === "missing") {
        return NextResponse.json({ error: "Video job not found." }, { status: 404 });
      }
      return NextResponse.json({ error: "Invalid timing report." }, { status: 400 });
    }

No authentication/persistence yet: the later institution/API plan owns identities, consent, retention and rate limits.

- [ ] **Step 3: Report only after metadata resolves**

Add optional jobId to SolvePlayerProps; destructure it. After the current setSceneAudio(tl, idx, effectiveDur) call:

    const timing = {
      sceneIndex: idx,
      audioDurationMs: Math.round(effectiveDur * 1000),
      writeEndMs: Math.round(tl.scenes[idx].writeEnd * 1000),
    };
    if (jobId) {
      void fetch("/api/video/jobs/" + encodeURIComponent(jobId) + "/timing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(timing),
      }).catch(() => undefined);
    }

Include jobId and onVoiced in the effect dependencies. A 404 is intentionally ignored so saved/history/expired lessons still play normally.

Pass jobId={watchedJobId ?? undefined} to the main player in page.tsx. The current watchReady already assigns the just-created ID before loading its script. The history case can harmlessly receive a 404.

- [ ] **Step 4: Verify and commit**

Run:

    bun test tests/lesson-contracts.test.ts tests/board-audit.test.ts tests/timeline-metrics.test.ts tests/timing-report.test.ts
    npx tsc --noEmit

Expected: targeted tests PASS; no new type errors. Capture pre-existing external errors rather than masking them.

    git add src/lib/video-jobs.ts src/app/api/video/jobs/[id]/timing/route.ts src/components/player/SolvePlayer.tsx src/app/page.tsx
    git commit -m "Record planned and actual lesson timing safely

    Co-Authored-By: Claude Code <noreply@anthropic.com>"

---

### Task 6: Full verification and manual telemetry check

**Files:** no new source files; modify tests only if a real contract gap emerges.

- [ ] **Step 1: Regressions**

Run: bun test

Expected: PASS. In particular, tests/pen-pacing.test.ts must retain the pinned present behavior: this foundation does not yet change the slow timing compiler.

- [ ] **Step 2: App-boundary checks**

Run:

    npm run lint
    npm run build

Expected: both succeed. Do not fold unrelated current dirty-file failures into this task.

- [ ] **Step 3: Manual check**

Run the app with npm run dev, generate one short matrix lesson, copy the ID returned by the create-job request, wait for the player to resolve at least one narration track, then GET its /api/video/jobs/{jobId} status endpoint. Confirm:

- stats.timing.planned is non-null once the script merges;
- stats.timing.measuredScenes contains one numeric object per loaded audio scene;
- reports contain only sceneIndex, audioDurationMs, writeEndMs;
- a 404 report for a historical/expired lesson does not affect playback.

- [ ] **Step 4: Diff and status**

Run:

    git diff --check
    git status --short
    git log --oneline -5

Expected: no whitespace errors; only planned paths committed; current unrelated edits remain untouched.

## Acceptance Criteria

- A matrix lesson can represent persistent matrix, blue row index, red column index and A₂₃ reading state as validated semantic board data.
- Invalid lesson/voice/board relationships fail closed before a renderer can use them.
- Board continuity, state transitions, context and color semantics are auditable without an LLM or canvas.
- Every merged current-format SolveScript emits deterministic pace/drift metrics without changing timing.
- Each resolved audio scene can safely record only numeric actual duration and write-end timing.
- Rendering, TTS queue, streaming and student UI remain behaviorally unchanged.

## Explicitly Deferred

- Audio-first timing compiler; fixing the current post-hoc, clamped setSceneAudio schedule mutation.
- SSML/provider speech marks or forced alignment.
- Kinetic ink trajectory capture, calibration and consent flow.
- Lesson/Pedagogy/Board Director prompts consuming these contracts.
- Explain-lesson primitives, active recall UX, persistence, institution API, tenants and billing.

