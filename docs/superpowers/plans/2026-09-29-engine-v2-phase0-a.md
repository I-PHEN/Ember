# Ember Engine v2 — Phase 0 + Phase A Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Probe the SDK's model surface (Phase 0), then harden board discipline, restructure prompts for prefix caching, and stand up the measurement layer + eval harness (Phase A).

**Architecture:** No pipeline-shape changes. All work is inside existing files plus three new modules (overlap metric, probe script, eval runner). Deterministic checks only — no new LLM agents in this phase.

**Tech Stack:** TypeScript (Next.js 16), z-ai-web-dev-sdk, `bun test` for unit tests (bun is already the runtime used by `npm start`), plain fetch for the eval runner.

## Global Constraints

- Zero new npm dependencies in Phase A.
- No UI/visual changes — the rebrand palette and layout are frozen.
- Every user-visible string stays on-brand (Ember, Professor Ember; no "Chalkcast"/"Ada" in anything new).
- The streaming contract is untouched: no stage may serialize behind another.
- Sanitizer behavior changes must be conservative: when unsure whether a line is prose, keep it (the Reviewer in Phase B is the real judge).
- Commits end with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.

---

### Task 1: Phase 0 — model capability probe

**Files:**
- Create: `scripts/probe-models.mjs`

**Interfaces:**
- Produces: `docs/research/phase0-model-probe.json` (consumed later by Phase B/C routing-table work; no code imports it).

- [ ] **Step 1: Write the probe script**

```js
/* Phase 0 capability probe — which models can this account call, how fast,
   and does thinking toggle work? Costs ~12 tiny calls. Usage: node scripts/probe-models.mjs */
import ZAI from "z-ai-web-dev-sdk";

const CANDIDATES = [
  undefined,            // server default (what the app uses today)
  "glm-4.6",
  "glm-4.5",
  "glm-4.5-air",
  "glm-4.5-flash",
  "glm-4-flash",
];

const zai = await ZAI.create();
const results = [];
for (const model of CANDIDATES) {
  for (const thinking of ["disabled", "enabled"]) {
    const t0 = Date.now();
    try {
      const body = {
        messages: [
          { role: "user", content: "Reply with exactly: OK" },
        ],
        thinking: { type: thinking },
      };
      if (model) body.model = model;
      const r = await zai.chat.completions.create(body);
      const text = r?.choices?.[0]?.message?.content ?? "";
      results.push({
        model: model ?? "(default)",
        thinking,
        ok: /ok/i.test(text),
        ms: Date.now() - t0,
        reply: text.slice(0, 40),
      });
    } catch (e) {
      results.push({
        model: model ?? "(default)",
        thinking,
        ok: false,
        ms: Date.now() - t0,
        error: (e instanceof Error ? e.message : String(e)).slice(0, 120),
      });
    }
  }
}
console.table(results);
const fs = await import("node:fs");
fs.mkdirSync("docs/research", { recursive: true });
fs.writeFileSync(
  "docs/research/phase0-model-probe.json",
  JSON.stringify({ probedAt: new Date().toISOString(), results }, null, 2)
);
console.log("written docs/research/phase0-model-probe.json");
```

- [ ] **Step 2: Run it and verify output**

Run: `node scripts/probe-models.mjs`
Expected: a results table where at least the `(default)` rows show `ok: true`; JSON artifact written. Errors on unavailable models are *findings*, not failures.

- [ ] **Step 3: Record the routing implications**

Append a short "Phase 0 findings" block to `docs/research/phase0-model-probe.json` by editing it (or a sibling `phase0-notes.md` in the same folder): which models are usable, which were fastest, whether thinking changed latency. One paragraph is enough — Phase B will read it.

- [ ] **Step 4: Commit**

```bash
git add scripts/probe-models.mjs docs/research/phase0-model-probe.json docs/research/phase0-notes.md
git commit -m "Phase 0: SDK model capability probe

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 2: Test bootstrap + `isBoardProse` hardening

**Files:**
- Modify: `.gitignore` (remove the `/tests/` ignore line)
- Modify: `tsconfig.json` (exclude `tests` from type-checking)
- Create: `tests/board-discipline.test.ts`
- Modify: `src/lib/solve-schema.ts:189-209`

**Interfaces:**
- Consumes: existing `isBoardProse(text: string): boolean` export.
- Produces: same signature, hardened behavior — later tasks and the eval harness rely on it unchanged in name.

- [ ] **Step 1: Verify bun is available (test runner)**

Run: `bun --version`
Expected: a version number (≥1.0). If missing, stop and report — do not install a different framework.

- [ ] **Step 2: Un-ignore `tests/` and exclude it from tsc**

In `.gitignore`, delete the line `/tests/` (it sits under the "local dev / research artifacts" block).
In `tsconfig.json`, add `"exclude": ["node_modules", "tests"]` (keep any existing exclude entries merged into one array). Tests import `bun:test`, which `tsc` must not type-check.

- [ ] **Step 3: Write the failing tests**

`tests/board-discipline.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { isBoardProse } from "../src/lib/solve-schema";

describe("isBoardProse — prose that must be dropped", () => {
  test("6-word claim, no math, no connective", () => {
    expect(isBoardProse("Energy is conserved in this system")).toBe(true);
  });
  test("prose with an equals sign no longer bypasses", () => {
    expect(isBoardProse("because a = F/m the block speeds up")).toBe(true);
    expect(isBoardProse("notice that x = 4 is a solution")).toBe(true);
  });
  test("article-heavy medium lines are prose", () => {
    expect(isBoardProse("The total mechanical energy stays constant")).toBe(true);
  });
  test("classic explanation sentences", () => {
    expect(isBoardProse("We subtract 5 because we want x alone")).toBe(true);
    expect(isBoardProse("Notice that the twos cancel out")).toBe(true);
  });
});

describe("isBoardProse — board work that must survive", () => {
  test("equations and values", () => {
    expect(isBoardProse("2x + 5 = 13")).toBe(false);
    expect(isBoardProse("v₀ = 0, a = 3 m/s²")).toBe(false);
    expect(isBoardProse("KE = ½mv²")).toBe(false);
    expect(isBoardProse("Check: 2(4) + 5")).toBe(false);
  });
  test("short labels and operation tags", () => {
    expect(isBoardProse("− 5 both sides")).toBe(false);
    expect(isBoardProse("GIVEN")).toBe(false);
    expect(isBoardProse("Find: acceleration")).toBe(false);
  });
  test("audience-facing pause-and-predict questions", () => {
    expect(isBoardProse("Your turn: what's next?")).toBe(false);
    expect(isBoardProse("Quick check: what is v at t = 2?")).toBe(false);
  });
  test("mathy multi-part lines", () => {
    expect(isBoardProse("x = 4 and y = 7")).toBe(false);
    expect(isBoardProse("W = F·d·cosφ = 12 J")).toBe(false);
  });
});
```

- [ ] **Step 4: Run tests to verify the new prose cases fail**

Run: `bun test tests/board-discipline.test.ts`
Expected: FAIL — the "6-word claim", "equals-sign bypass", and "article-heavy" cases return `false` today.

- [ ] **Step 5: Harden `isBoardProse`**

Replace the body of `isBoardProse` in `src/lib/solve-schema.ts` (keep the export name and the doc comment above it, update the comment to describe the new order):

```ts
/** does this write beat look like spoken explanation, not board work?
    Order matters: audience questions and short labels always survive;
    prose connectives are tested BEFORE the equation-like escape so a
    sentence can't smuggle itself in with one equals sign; medium-length
    article-heavy lines with no math are prose; the Reviewer (Phase B)
    is the real judge — this stays the conservative safety net. */
export function isBoardProse(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  if (AUDIENCE_QUESTION.test(t)) return false; // pause-and-predict moments
  const words = t.split(/\s+/).filter(Boolean).length;
  if (words < 5) return false; // short labels are always fine
  // sentence connectives are prose even if the line contains math
  if (PROSE_CONNECTIVE.test(t)) return true;
  // equation-like lines are board work by definition
  const eqLike =
    /[=≤≥≠≈]/.test(t) ||
    (t.match(/[0-9+−×÷±√∫∑∆^_]/g)?.length ?? 0) / Math.max(1, t.length) > 0.15;
  if (eqLike) return false;
  // medium lines written as English (articles/linking verbs), no math → prose
  if (words >= 6 && /\b(the|a|an|is|are|was|this|that|it|stays|gets)\b/i.test(t)) {
    return true;
  }
  return words >= 10; // long wordy line with no math → it's a paragraph
}
```

- [ ] **Step 6: Run tests to verify all pass**

Run: `bun test tests/board-discipline.test.ts`
Expected: PASS (all cases).

- [ ] **Step 7: Commit**

```bash
git add .gitignore tsconfig.json tests/board-discipline.test.ts src/lib/solve-schema.ts
git commit -m "Board discipline: close isBoardProse gaps (connectives before math escape, article heuristic)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 3: Honest prose-drop logging + `proseDropped` stat

**Files:**
- Modify: `src/lib/solve-schema.ts` (`sanitizeScript` signature + log)
- Create: `tests/prose-dropped.test.ts`

**Interfaces:**
- Produces: `sanitizeScript(raw: unknown, stats?: { proseDropped: number }): SolveScript | null` — optional collector, backwards-compatible with every existing caller (`video-jobs.ts` today calls it with one arg).

- [ ] **Step 1: Write the failing test**

`tests/prose-dropped.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { sanitizeScript } from "../src/lib/solve-schema";

const ONE_SCENE = (text: string) => ({
  title: "Test lesson",
  question: "q",
  scenes: [
    { chapter: "Step", narration: "so two x equals eight", beats: [{ type: "write", text: "2x = 8", say: "so two x equals eight" }] },
    { chapter: "Why", narration: "the words explain everything here", beats: [{ type: "write", text }] },
  ],
});

describe("sanitizeScript prose collection", () => {
  test("counts dropped prose beats into the collector", () => {
    const stats = { proseDropped: 0 };
    const script = sanitizeScript(ONE_SCENE("Energy is conserved in this system"), stats);
    expect(script).not.toBeNull();
    expect(stats.proseDropped).toBe(1);
    const why = script!.scenes.find((s) => s.chapter === "Why");
    expect(why).toBeUndefined(); // scene died with its only beat
  });
  test("no collector argument still works", () => {
    const script = sanitizeScript(ONE_SCENE("2x + 5 = 13"));
    expect(script!.scenes).toHaveLength(2);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test tests/prose-dropped.test.ts`
Expected: FAIL — `stats.proseDropped` stays 0 (collector not implemented).

- [ ] **Step 3: Implement**

In `src/lib/solve-schema.ts`, change the signature and the prose block inside the scene loop:

```ts
export function sanitizeScript(
  raw: unknown,
  stats?: { proseDropped: number }
): SolveScript | null {
```

```ts
        if (beat.type === "write" && isBoardProse(beat.text)) {
          prose.push(beat.text); // explanations are SPOKEN, never written
          if (stats) stats.proseDropped += 1;
          continue;
        }
```

And fix the lying log line below it to:

```ts
    if (prose.length) {
      console.log(
        `[board-discipline] scene "${chapter}" — dropped ${prose.length} prose beat(s) (the planner's narration already carries these words): ${prose
          .map((p) => JSON.stringify(p))
          .join(", ")}`
      );
    }
```

- [ ] **Step 4: Wire the collector in `video-jobs.ts` merge step**

In `src/lib/video-jobs.ts`, Phase A only collects into the existing stats shape — add `proseDropped: number` to the `Job["stats"]` interface (init `0` in `createJob`), then at the merge:

```ts
    const script = sanitizeScript(rawScript, job.stats);
```

(The `stats` object already flows to snapshots; no other change.)

- [ ] **Step 5: Run tests**

Run: `bun test tests/prose-dropped.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add src/lib/solve-schema.ts src/lib/video-jobs.ts tests/prose-dropped.test.ts
git commit -m "Board discipline: honest prose-drop logging + stats.proseDropped

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 4: Modality-overlap metric

**Files:**
- Create: `src/lib/video/overlap.ts`
- Create: `tests/overlap.test.ts`

**Interfaces:**
- Produces (used by Task 6 and the eval harness):
  - `contentWords(text: string): string[]`
  - `contentWordOverlap(beatTexts: string[], narration: string): number` — overlap coefficient: `|shared| / |union|` over content-word sets, `0` when either side is empty.
  - `scriptOverlap(script: SolveScript): number` — scene-length-weighted average.

- [ ] **Step 1: Write the failing tests**

`tests/overlap.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { contentWords, contentWordOverlap, scriptOverlap } from "../src/lib/video/overlap";

describe("contentWords", () => {
  test("lowercases, strips stopwords and punctuation", () => {
    expect(contentWords("The quick, brown fox!")).toEqual(["quick", "brown", "fox"]);
  });
});

describe("contentWordOverlap", () => {
  test("disjoint board and narration → 0", () => {
    expect(contentWordOverlap(["2x = 8"], "so two x equals eight and we are nearly done")).toBe(0);
  });
  test("identical words → 1", () => {
    expect(contentWordOverlap(["energy conserved system"], "energy is conserved in the system")).toBe(1);
  });
  test("partial overlap is between 0 and 1", () => {
    const v = contentWordOverlap(["given mass five kg"], "the mass is five kilograms today");
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThan(1);
  });
  test("empty inputs → 0", () => {
    expect(contentWordOverlap([], "some narration")).toBe(0);
    expect(contentWordOverlap(["x = 1"], "")).toBe(0);
  });
});

describe("scriptOverlap", () => {
  test("weights scenes by length", () => {
    const script = {
      title: "t",
      question: "q",
      scenes: [
        { chapter: "a", narration: "energy is conserved in the system", beats: [{ type: "write", text: "energy conserved system" }] },
        { chapter: "b", narration: "so two x equals eight", beats: [{ type: "write", text: "2x = 8" }] },
      ],
    };
    expect(scriptOverlap(script as never)).toBe(0.5);
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test tests/overlap.test.ts`
Expected: FAIL — module does not exist.

- [ ] **Step 3: Implement**

`src/lib/video/overlap.ts`:

```ts
/* Modality adherence, measurable: how much of the board's text is
   duplicated in the narration (Mayer's redundancy principle). Target
   is a LOW number — the board is a skeleton, not a transcript. */

import type { SolveScript } from "./types";

const STOPWORDS = new Set([
  "the", "a", "an", "is", "are", "was", "were", "be", "been", "being",
  "to", "of", "in", "on", "at", "for", "with", "and", "or", "but", "so",
  "we", "our", "you", "your", "it", "its", "this", "that", "these",
  "those", "as", "by", "from", "if", "then", "than", "will", "can",
  "do", "does", "did", "have", "has", "had", "not", "no", "here",
]);

export function contentWords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOPWORDS.has(w));
}

export function contentWordOverlap(beatTexts: string[], narration: string): number {
  const board = new Set(beatTexts.flatMap(contentWords));
  const spoken = new Set(contentWords(narration));
  if (!board.size || !spoken.size) return 0;
  let shared = 0;
  for (const w of board) if (spoken.has(w)) shared += 1;
  return shared / (board.size + spoken.size - shared); // Jaccard
}

export function scriptOverlap(script: SolveScript): number {
  if (!script.scenes.length) return 0;
  let total = 0;
  let weight = 0;
  for (const scene of script.scenes) {
    const texts = scene.beats
      .filter((b) => b.type === "write" || b.type === "title" || b.type === "fraction")
      .map((b) => ("text" in b ? String(b.text) : ""))
      .filter(Boolean);
    const w = Math.max(1, texts.length);
    total += contentWordOverlap(texts, scene.narration) * w;
    weight += w;
  }
  return weight ? total / weight : 0;
}
```

(Note: with Jaccard, the "identical words → 1" test holds because stopword-stripped sets match exactly; "energy conserved system" vs "energy is conserved in the system" → spoken set {energy, conserved, system} — identical. The two-scene weighted case: scene a overlap 1 × weight 1, scene b overlap 0 × weight 1 → 0.5.)

- [ ] **Step 4: Run tests**

Run: `bun test tests/overlap.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/video/overlap.ts tests/overlap.test.ts
git commit -m "Add modality-overlap metric (board vs narration redundancy)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 5: Writer prompt — stable prefix for caching

**Files:**
- Modify: `src/lib/prompts.ts` (`writerPrompt` → `WRITER_SYSTEM` + `writerUser`)
- Modify: `src/lib/video-jobs.ts` (`writeScene` call site)
- Create: `tests/writer-prefix.test.ts`

**Interfaces:**
- Produces:
  - `export const WRITER_SYSTEM: string` — the entire static writer contract (persona, three rules, board craft, beat types, compactness).
  - `export function writerUser(outlineJson: string, sceneIndex: number, script: string | null, visualize?: string, analogy?: string): string` — all dynamic content.
- Removes: `writerPrompt` (single call site, updated in this task).

Note: `DIRECTOR_PROMPT` and `TRANSCRIPT_PROMPT` already have the right shape (static constant as system + dynamic user turn) — no changes needed there. The writer was the only prompt that wove dynamic content into the middle of its contract.

- [ ] **Step 1: Write the failing test**

`tests/writer-prefix.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { WRITER_SYSTEM, writerUser } from "../src/lib/prompts";

describe("writer prompt layout (prefix-cache friendly)", () => {
  test("system contract is stable and substantial", () => {
    expect(WRITER_SYSTEM.length).toBeGreaterThan(2000);
    expect(WRITER_SYSTEM).toContain("BEAT TYPES");
    expect(WRITER_SYSTEM).not.toContain("scene 1 of"); // no dynamic content leaked in
  });
  test("identical prefix across different scenes — dynamic content lives in the user turn", () => {
    const u1 = writerUser('{"title":"T"}', 0, "some words", "a graph", "a balance scale");
    const u2 = writerUser('{"title":"T"}', 7, null);
    expect(u1).toContain("scene 1 of");
    expect(u2).toContain("scene 8 of");
    expect(u1).toContain("some words");
    expect(u2).toContain("write the scene's narration yourself");
  });
});
```

- [ ] **Step 2: Run to verify it fails**

Run: `bun test tests/writer-prefix.test.ts`
Expected: FAIL — `WRITER_SYSTEM` is not exported.

- [ ] **Step 3: Restructure `prompts.ts`**

Take the current `writerPrompt(...)` template string and split it exactly along the static/dynamic seam. The static part becomes:

```ts
/* The scene-writer contract — STATIC PREFIX, identical for every writer
   call so provider-side prefix caching can reuse it. Dynamic content
   (outline, scene slice) is passed as the user turn, never woven in. */
export const WRITER_SYSTEM = `You are a SCENE WRITER for EMBER — hand-written solve videos taught by Professor Ember, a calm university lecturer (think Organic Chemistry Tutor): the pen writes ONLY the essential mathematics on a fixed 16:9 board while Professor Ember's VOICE carries the explanation. A transcript planner has already written EVERY word she says; your job is to choreograph the BOARD for your scene so that what is written is exactly what is being talked about, moment to moment.

You receive the director's plan (all scenes), your scene's slice of the transcript, and a "choreograph scene N now" instruction. Output ONLY valid JSON, no fences:
{"narration": string, "beats": Beat[]}

THE THREE RULES THAT MATTER MOST:
1. NARRATION = the planner's script VERBATIM when provided (you may not rewrite, shorten or reorder it) — it carries ALL reasoning: why the move works, what it means, what to watch out for. A photo of the board shows math and labels, not paragraphs. When no planner script reaches you, write the scene's narration yourself: 3-6 calm sentences (~60-90 words) that carry all the reasoning.
2. BOARD = the skeleton for THOSE words. ONLY: the problem line, GIVEN list, transformation lines, given values with units, short operation labels (max 4 words), key formulas/terms, diagrams, results. Every written line under 40 characters. FORBIDDEN: sentences of explanation (because/since/notice/remember…) — those are spoken, never ink. Exception: ONE short audience-facing question in yellow (pause-and-predict).
3. SAY TAGS = the sync. Every beat that writes ink carries "say": the EXACT words from the script that are being spoken WHILE it is written — a verbatim fragment of the narration, in order, e.g. {"type":"write","text":"2x = 8","color":"green","say":"so two x equals eight"}. The pen will slow down or wait so each line lands inside its own words. Beats that merely decorate (box/circle/crossout/underline/point) take NO say — they ride along with the words of the line they mark. Stretches of pure explanation with nothing to write need NO beat at all — the pen rests and points while the professor talks.

BOARD CRAFT:
- 2 to 5 beats of real content (plus emphasis/erase beats as needed). The board is fixed — never plan scrolling; if the scene is crowded, start it with an erase beat.
- When the narration references a term, write that term in its OWN beat so it can be targeted: e.g. write "2x", "+ 5", "= 13" as separate beats if one of them will be crossed out, pointed at, or annotated.
- The pen POINTS at what the narration discusses while you talk — {"type":"point","target":"text:2x = 8"} — but long explanations need no extra beats; the pen points automatically after it finishes writing.
- COLOR DISCIPLINE (one color = one meaning): blue = the given problem, orange = the operation being done, green = results, yellow = key formulas/emphasis/questions to the viewer, red = ONLY crossouts, white = the working.
- Scene 1 of the video starts with {"type":"title", ...} (big underlined heading). Use "below":"text:TERM" to pin small annotations directly under a term. Point at earlier work when the narration refers back to it. Mark ONLY the problem line and the final answer "keep": true.
- University notation: superscripts x^{2}, m/s^{2}, subscripts v_{0}, Greek π Δ θ μ, operators ∫ ∑ √ ± × ÷ ≤ ≥ ≠ → · — NEVER LaTeX, never backslashes, never $.

BOARD LINE EXAMPLES:
GOOD: "2x + 5 = 13" | "− 5 both sides" | "v₀ = 0, a = 3 m/s²" | "x = 4" | "Check: 2(4) + 5" | "KE = ½mv²" | "W = F·d·cosφ"
BAD (belongs in the narration, will be removed): "We subtract 5 because we want x alone" | "Notice that the twos cancel out" | "F_applied" (never underscore words — write F_{applied})

BEAT TYPES you may use:
{"type":"title","text":"...","color":"yellow","say":"..."}                         big underlined heading (scene 1 only)
{"type":"write","text":"...","color":"...","size":"lg|md|sm","x":0..1,"y":0..1,"align":"left|center|right","keep":bool,"below":"text:+ 5","say":"..."}   handwriting. Default white, md
{"type":"fraction","prefix":"x =","num":"−b + √(b²−4ac)","den":"2a","color":"green","size":"md","say":"..."}   stacked fraction; prefix/suffix optional
{"type":"box"} / {"type":"circle"} / {"type":"underline"} / {"type":"highlight"}    emphasis around the LAST beat by default, or {"target":"text:2x + 5"} to match a written line
{"type":"crossout","target":"text:+ 5"}    red X over a term
{"type":"point","target":"text:2x = 8","ms":900}    the pen travels to a written term and points at it
{"type":"graph","expr":"x^2 - 2","xMin":-4,"xMax":4,"label":"y = x² − 2","color":"yellow","say":"..."}    expr uses x, + - * / ^ ( ) and sin cos tan exp ln log sqrt abs
{"type":"freebody","angle":35,"block":"m","forces":[{"label":"mg","dir":"down"},{"label":"N","dir":"normal"},{"label":"F","dir":"upslope"},{"label":"fₖ","dir":"downslope"}],"color":"yellow","say":"..."}    a REAL drawn free-body diagram (surface, block, labeled force arrows). dirs: down up left right normal (perpendicular away from surface) upslope downslope. USE THIS whenever the script mentions forces, a free-body diagram, or a block on an incline — never write a text list of force names instead.
{"type":"numberline","min":-5,"max":5,"hops":[{"from":0,"to":3,"label":"+3"}],"points":[{"at":3,"label":"x"}]}
{"type":"table","title":"...","headers":["x","y"],"rows":[["0","1"],["1","4"]],"say":"..."}
{"type":"erase","keep":["x = 4"]}    wipe the board (keep matching text)
{"type":"newline","n":1}    move the writing cursor down
{"type":"wait","ms":500}    a beat of silence — let a key result land

COMPACTNESS: under 3KB. Raw JSON only, starting with { and ending with }.`;
```

(This also lands the Professor Ada → Professor Ember rename inside the writer contract — the deep-rename overlap noted in the spec.)

And the dynamic turn:

```ts
export function writerUser(
  outlineJson: string,
  sceneIndex: number,
  script: string | null,
  visualize?: string,
  analogy?: string
): string {
  return `THE DIRECTOR'S PLAN (all scenes, so you know what the board holds before your scene and what comes after):
${outlineJson}

YOUR SCENE: scene ${sceneIndex + 1} of the outline.
${script ? `THE WORDS (the planner's script for THIS scene — the professor says exactly this):
"""${script}"""
${visualize ? `\nVISUALIZE (the planner decided a visual helps here — include it):\n${visualize}` : ""}
${analogy ? `\nANALOGY (already woven into the words above — do not write it on the board):\n${analogy}` : ""}` : "No planner script reached you — write the scene's narration yourself per rule 1."}

Choreograph the board for scene ${sceneIndex + 1} now.`;
}
```

Delete the old `writerPrompt` function entirely.

- [ ] **Step 4: Update the call site in `video-jobs.ts`**

In `writeScene`, replace:

```ts
      const raw = await chatJson(
        writerPrompt(
          outlineJson,
          index,
          planned && planned.script.length > 40 ? planned.script : null,
          planned?.visualize,
          planned?.analogy
        ),
        `Choreograph the board for scene ${index + 1} now.`
      );
```

with:

```ts
      const raw = await chatJson(
        WRITER_SYSTEM,
        writerUser(
          outlineJson,
          index,
          planned && planned.script.length > 40 ? planned.script : null,
          planned?.visualize,
          planned?.analogy
        )
      );
```

and update the import at the top of `video-jobs.ts` from `writerPrompt` to `WRITER_SYSTEM, writerUser`.

- [ ] **Step 5: Run tests + typecheck the touched files**

Run: `bun test tests/writer-prefix.test.ts`
Expected: PASS.
Run: `grep -rn "writerPrompt" src/`
Expected: no matches.

- [ ] **Step 6: Commit**

```bash
git add src/lib/prompts.ts src/lib/video-jobs.ts tests/writer-prefix.test.ts
git commit -m "Writer prompt: stable static prefix + dynamic user turn (prefix-cache friendly); writer contract now Professor Ember

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 6: Wire overlap into job stats

**Files:**
- Modify: `src/lib/video-jobs.ts` (stats interface, `createJob` init, merge step)
- Create: `tests/script-stats.test.ts`

**Interfaces:**
- Consumes: `scriptOverlap(script: SolveScript): number` from Task 4; `stats.proseDropped` from Task 3.
- Produces: `job.stats.overlapPct: number | null` (null until merge), visible in `JobSnapshot.stats`.

- [ ] **Step 1: Write the failing test**

`tests/script-stats.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { scriptOverlap } from "../src/lib/video/overlap";

/* The stats wiring itself is inside runJob (needs live LLM calls); the
   deterministic half — the value that gets stored — is what we test. */
describe("the value stored in stats.overlapPct", () => {
  test("disjoint boards produce 0", () => {
    const script = {
      title: "t", question: "q",
      scenes: [
        { chapter: "a", narration: "so two x equals eight", beats: [{ type: "write", text: "2x = 8" }] },
      ],
    };
    expect(Math.round(scriptOverlap(script as never) * 100)).toBe(0);
  });
});
```

- [ ] **Step 2: Run it (it passes already — this pins the contract)**

Run: `bun test tests/script-stats.test.ts`
Expected: PASS.

- [ ] **Step 3: Wire it**

In `src/lib/video-jobs.ts`:
1. Extend the `Job["stats"]` interface: add `overlapPct: number | null;` (after `firstVoiceReadyMs`).
2. In `createJob`'s stats initializer add `overlapPct: null,`.
3. After `compileTimeline(script);` in `runJob` (the server-side smoke test), add:

```ts
    job.stats.overlapPct = Math.round(scriptOverlap(script) * 100);
```

4. Add the import: `import { scriptOverlap } from "./video/overlap";`

- [ ] **Step 4: Verify dev server still compiles the route**

Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
Expected: `200` (dev server picks up the edit; if the server isn't running, start it and re-check).

- [ ] **Step 5: Commit**

```bash
git add src/lib/video-jobs.ts tests/script-stats.test.ts
git commit -m "Job stats: record modality-overlap percentage at merge

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

### Task 7: Eval harness — golden questions + runner

**Files:**
- Create: `scripts/eval/fixtures.ts`
- Create: `scripts/eval/run-eval.ts`
- Modify: `.gitignore` (the `/scripts/` ignore already excludes these — that is CORRECT, they are local tooling; do not un-ignore)

**Interfaces:**
- Consumes: `isBoardProse` (Task 2), `scriptOverlap` (Task 4) — imported directly (bun runs TS).
- Produces: `docs/research/eval-results/<ISO-date>.json` (manual artifacts, committed as findings).

- [ ] **Step 1: Write the fixtures**

`scripts/eval/fixtures.ts`:

```ts
export interface Fixture {
  id: string;
  kind: "solve" | "explain";
  question: string;
}

export const FIXTURES: Fixture[] = [
  { id: "alg-linear", kind: "solve", question: "Solve 2x + 5 = 13" },
  { id: "calc-integral", kind: "solve", question: "Evaluate ∫ x·e^(2x) dx" },
  { id: "phys-incline", kind: "solve", question: "A 5 kg block slides down a 30° incline with friction coefficient μ = 0.25. Find its acceleration." },
  { id: "ode-separable", kind: "solve", question: "Solve dy/dx = 2xy with y(0) = 1" },
  { id: "linalg-eigen", kind: "solve", question: "Find the eigenvalues of the matrix [[2,1],[1,2]]" },
  { id: "explain-blue", kind: "explain", question: "Explain why the sky is blue" },
];
```

- [ ] **Step 2: Write the runner**

`scripts/eval/run-eval.ts`:

```ts
/* Phase A eval harness — runs the real pipeline on golden questions and
   asserts the discipline invariants. Needs the dev server on :3000 and
   real API quota. Usage: bun scripts/eval/run-eval.ts [fixtureId] */
import { isBoardProse } from "../../src/lib/solve-schema";
import { scriptOverlap } from "../../src/lib/video/overlap";
import { FIXTURES } from "./fixtures";

const BASE = "http://localhost:3000";
const POLL_MS = 3000;
const TIMEOUT_MS = 8 * 60 * 1000;

interface Check {
  ok: boolean;
  detail: string;
}
interface FixtureResult {
  id: string;
  passed: boolean;
  ms: number;
  scenes: number;
  proseBeats: number;
  sayCoverage: number;
  overlapPct: number;
  stats?: Record<string, unknown>;
  checks: Check[];
}

async function runFixture(f: { id: string; question: string }): Promise<FixtureResult> {
  const t0 = Date.now();
  const checks: Check[] = [];
  const start = await fetch(`${BASE}/api/video/jobs`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ question: f.question }),
  });
  const { jobId } = (await start.json()) as { jobId?: string };
  if (!jobId) throw new Error(`job creation failed for ${f.id}`);

  let snap: any = null;
  for (;;) {
    if (Date.now() - t0 > TIMEOUT_MS) break;
    await new Promise((r) => setTimeout(r, POLL_MS));
    const r = await fetch(`${BASE}/api/video/jobs/${jobId}`, { cache: "no-store" });
    snap = await r.json();
    if (snap?.phase === "ready" || snap?.phase === "error") break;
  }

  const ms = Date.now() - t0;
  if (!snap || snap.phase !== "ready" || !snap.script) {
    return {
      id: f.id, passed: false, ms, scenes: 0, proseBeats: -1,
      sayCoverage: 0, overlapPct: 0,
      checks: [{ ok: false, detail: `pipeline did not complete: ${snap?.phase ?? "timeout"} ${snap?.error ?? ""}` }],
    };
  }

  const script = snap.script;
  const proseBeats = script.scenes.reduce(
    (n: number, s: any) =>
      n + s.beats.filter((b: any) => b.type === "write" && isBoardProse(b.text)).length,
    0
  );
  const inkBeats = script.scenes.reduce(
    (n: number, s: any) =>
      n + s.beats.filter((b: any) => ["write", "title", "fraction"].includes(b.type)).length,
    0
  );
  const sayBeats = script.scenes.reduce(
    (n: number, s: any) =>
      n + s.beats.filter((b: any) => ["write", "title", "fraction"].includes(b.type) && typeof b.say === "string" && b.say.length > 2).length,
    0
  );
  const sayCoverage = inkBeats ? sayBeats / inkBeats : 0;
  const overlapPct = Math.round(scriptOverlap(script as never) * 100);

  checks.push({ ok: script.scenes.length >= 4 && script.scenes.length <= 14, detail: `scenes=${script.scenes.length}` });
  checks.push({ ok: proseBeats === 0, detail: `proseBeats=${proseBeats}` });
  checks.push({ ok: sayCoverage >= 0.5, detail: `sayCoverage=${sayCoverage.toFixed(2)}` });
  checks.push({ ok: overlapPct <= 25, detail: `overlapPct=${overlapPct}` });

  return {
    id: f.id, passed: checks.every((c) => c.ok), ms,
    scenes: script.scenes.length, proseBeats, sayCoverage, overlapPct,
    stats: snap.stats, checks,
  };
}

const only = process.argv[2];
const list = only ? FIXTURES.filter((f) => f.id === only) : FIXTURES;
const results: FixtureResult[] = [];
for (const f of list) {
  console.log(`\n▶ ${f.id}: ${f.question}`);
  const r = await runFixture(f);
  results.push(r);
  console.log(`  ${r.passed ? "PASS" : "FAIL"} in ${(r.ms / 1000).toFixed(0)}s — ${r.checks.map((c) => `${c.ok ? "✓" : "✗"} ${c.detail}`).join(" | ")}`);
}

const fs = await import("node:fs");
fs.mkdirSync("docs/research/eval-results", { recursive: true });
const out = `docs/research/eval-results/${new Date().toISOString().slice(0, 10)}.json`;
fs.writeFileSync(out, JSON.stringify({ ranAt: new Date().toISOString(), results }, null, 2));
console.log(`\n${results.filter((r) => r.passed).length}/${results.length} passed — written ${out}`);
process.exit(results.every((r) => r.passed) ? 0 : 1);
```

- [ ] **Step 3: Smoke-run one fixture (needs dev server + quota)**

Run: `bun scripts/eval/run-eval.ts alg-linear`
Expected: a PASS or FAIL line with all four check details, JSON written. If it FAILs, that is a *finding* — capture it in the results notes before tuning anything.

- [ ] **Step 4: Full run + record**

Run: `bun scripts/eval/run-eval.ts`
Expected: 6/6 passed ideally; any failure gets a one-line root-cause note appended to the results JSON by editing the file.

- [ ] **Step 5: Commit the findings (scripts stay untracked by design)**

```bash
git add docs/research/eval-results/
git commit -m "Phase A eval: baseline run on golden questions

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Acceptance (Phase A definition of done, from the spec)

- Fixtures run; transcripts show zero prose beats; overlap ≤ 25%; logs/stats honest (`proseDropped`, `overlapPct` in job stats).
- Writer calls share an identical static prefix; `writerPrompt` no longer exists.
- Dev app unchanged visually; one real lesson generated and watched as a manual check.
