# Ember Engine v2 — Phase B + Phase C + Speed Budget Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the multi-agent architecture solid — Groq fallback + fast failover for the LLM layer (the 299s → ≤60s watchable fix), the Phase B Reviewer agent (async review-and-fix per scene), and the Phase C verification stack (deterministic Checker + blind Solver with Nerdamer compare and a one-shot discrepancy rerun).

**Architecture:** No pipeline-shape change: director → planner → writers×3 → merge → deliver stays, and voice never waits on anything new. A new `src/lib/ai/chat.ts` puts the spec's routing table behind one failover ladder (Gemini → Gemini fallback model → Groq, short delays, no 42s sleeps). The Reviewer dispatches per scene as writers land and is collected at merge under an 8s cap. The Solver runs blind from t0 and is compared at merge (bounded wait, one rerun on high-confidence mismatch, never blocks delivery). The Checker is pure Node per scene.

**Tech Stack:** TypeScript (Next.js 16), plain fetch REST (Gemini + Groq), `nerdamer` (the only new dep), existing `src/lib/expr.ts` parser, `bun test`.

## Evidence base (why the speed work is shaped this way)

From `docs/research/eval-results/2026-09-29.json` (alg-linear, first full PASS):
- Total 298.5s, `directorMs: 60475` (budget 15–25s), **`plannerMs: null` — the planner
  failed ALL attempts** (writers self-authored, still passed), one writer call at
  1886ms (clean ~1s lite call) vs 6–7s (retry pain).
- Root cause: `chatJson`'s backoff ladder `[0, 3000, 7000, 12000, 20000]` = up to 42s of
  pure sleep per call, × multiple failing calls × 3 planner/director attempts. The
  fix is failover, not patience: hop to another model/provider after ≤1 short retry.
- The eval runner polls until phase `ready`, so its `ms` includes the voice tail; true
  watchability was never measured → add `stats.watchableMs`.

## Global Constraints

- The streaming contract is sacred: voice flushes in playback order the moment a
  writer lands; NOTHING new may serialize the pipeline. Only two bounded waits may
  touch the merge: review collection ≤ 8s, solver wait ≤ 8s. The discrepancy rerun
  (one writer wave, only on high-confidence mismatch) is the only other allowed
  pre-delivery cost.
- Every failure has a fallback: reviewer fail/invalid/timeout → original beats ship;
  solver fail → no verdict recorded as such; checker → flags only, never blocks;
  provider ladder exhausted → existing degradation ladder takes over.
- Deterministic before LLM: the Checker and answer comparison are pure Node.
- Prompt discipline: every new agent prompt is a STATIC system prefix + dynamic user
  turn (prefix-cache friendly). `WRITER_SYSTEM` itself stays byte-identical.
- The Reviewer NEVER changes narration — beats only. Narration is canonical.
- Provider keys live in `.env` only (never committed). `GROQ_API_KEY` is present.
- Tests: `bun test`; `tests/` is excluded from tsc; `scripts/` stays untracked.
- npm here is SLOW and node_modules churn can kill the dev server — install
  nerdamer once, then restart the dev server and re-verify port 3000.
- No UI/visual changes. Brand frozen (Professor Ember everywhere, no Ada/Chalkcast
  in anything new). Commits end with `Co-Authored-By: Claude Code <noreply@anthropic.com>`.

## File Structure

New files:
- `src/lib/ai/groq.ts` — Groq chat over OpenAI-compatible REST (fallback provider)
- `src/lib/ai/chat.ts` — tier routing table + failover ladder (the one chat entry point)
- `src/lib/video/review.ts` — reviewer verdict parsing, fix acceptance, 429 sampling rule
- `src/lib/video/checker.ts` — numeric spot-checks of equation lines (pure Node)
- `src/lib/video/solver.ts` — solver output normalization, script-answer extraction, Nerdamer compare
- `scripts/probe-groq.mjs`, `scripts/probe-thinking.mjs` — one-off probes (untracked)
- Tests: `tests/groq-provider.test.ts`, `tests/chat-failover.test.ts`, `tests/reviewer-contract.test.ts`, `tests/scene-beats.test.ts`, `tests/checker.test.ts`, `tests/solver-verify.test.ts`

Modified:
- `src/lib/video-jobs.ts` — chatJson → failover ladder; reviewer dispatch/collect; checker wiring; solver launch/compare/rerun; new stats fields
- `src/lib/prompts.ts` — REVIEWER_SYSTEM + reviewerUser; SOLVER_SYSTEM + solverUser; writerUser gains optional note
- `src/lib/solve-schema.ts` — export `sanitizeSceneBeats` (shared by merge + reviewer fix)
- `src/lib/ai/gemini.ts` — optional explicit thinkingBudget opt (only if the probe says it pays)
- `scripts/eval/run-eval.ts` + `scripts/eval/fixtures.ts` — watchableMs gate, reviewed/verification gates, 2 harder fixtures
- `CLAUDE.md` — engine + provider paragraphs updated at the end

---

## Stream S — Provider resilience & speed

### Task 1: Groq provider module + live probe

**Files:**
- Create: `src/lib/ai/groq.ts`
- Create: `scripts/probe-groq.mjs` (untracked by project convention)
- Create: `tests/groq-provider.test.ts`

**Interfaces:**
- Produces (consumed by Task 2):
  - `export const GROQ_MODEL: string` (reason tier default `openai/gpt-oss-120b`)
  - `export const GROQ_MODEL_LITE: string` (fast tier default `llama-3.1-8b-instant`)
  - `export function groqEnabled(): boolean`
  - `export function buildGroqBody(system: string, user: string, model: string): Record<string, unknown>`
  - `export async function groqChat(system: string, user: string, model: string): Promise<string>` — throws `ProviderError` (imported from `./gemini`) with `status NNN:` message semantics on HTTP errors.

- [x] **Step 1: Write the failing test**

`tests/groq-provider.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { buildGroqBody } from "../src/lib/ai/groq";

describe("buildGroqBody", () => {
  test("system + user turns, JSON mode, deterministic shape", () => {
    const body = buildGroqBody("SYS", "USR", "model-x") as {
      model: string;
      messages: Array<{ role: string; content: string }>;
      temperature: number;
      response_format: { type: string };
    };
    expect(body.model).toBe("model-x");
    expect(body.messages).toEqual([
      { role: "system", content: "SYS" },
      { role: "user", content: "USR" },
    ]);
    expect(body.response_format).toEqual({ type: "json_object" });
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `bun test tests/groq-provider.test.ts`
Expected: FAIL — module does not exist.

- [x] **Step 3: Implement `src/lib/ai/groq.ts`**

```ts
/* ------------------------------------------------------------------
   Ember's FALLBACK chat provider — Groq (OpenAI-compatible REST).

   Gemini stays primary for every agent; when it 503s or the key is
   throttled, the engine fails over HERE fast instead of sleeping
   through long backoffs. Every engine chat call wants JSON, so
   json_object mode is on (a reliability win, not a constraint).

   Env (all optional; without a key the ladder simply skips Groq):
     GROQ_API_KEY      enables the fallback hop
     GROQ_MODEL        reason tier   (default from the 2026-09-29 probe)
     GROQ_MODEL_LITE   fast tier
------------------------------------------------------------------- */

import { ProviderError } from "./gemini";

const BASE = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_MODEL =
  process.env.GROQ_MODEL ?? "openai/gpt-oss-120b";
export const GROQ_MODEL_LITE =
  process.env.GROQ_MODEL_LITE ?? "llama-3.1-8b-instant";

export function groqEnabled(): boolean {
  return Boolean(process.env.GROQ_API_KEY);
}

/** pure request-body builder — exported so tests assert shape, no network */
export function buildGroqBody(
  system: string,
  user: string,
  model: string
): Record<string, unknown> {
  return {
    model,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
  };
}

export async function groqChat(
  system: string,
  user: string,
  model: string
): Promise<string> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    throw new ProviderError(500, "GROQ_API_KEY is not set");
  }
  const r = await fetch(BASE, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(buildGroqBody(system, user, model)),
  });
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new ProviderError(r.status, text.slice(0, 300));
  }
  const data = (await r.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  return (data.choices?.[0]?.message?.content ?? "").trim();
}
```

- [x] **Step 4: Run tests**

Run: `bun test tests/groq-provider.test.ts`
Expected: PASS.

- [x] **Step 5: Probe the account's real models (bun auto-loads .env)**

Create `scripts/probe-groq.mjs`:

```js
/* Which chat models does this Groq key expose + smoke-test the defaults?
   Usage: bun scripts/probe-groq.mjs */
const key = process.env.GROQ_API_KEY;
if (!key) { console.error("GROQ_API_KEY not set"); process.exit(1); }

const lr = await fetch("https://api.groq.com/openai/v1/models", {
  headers: { Authorization: `Bearer ${key}` },
});
if (!lr.ok) {
  console.error("models list failed", lr.status, (await lr.text()).slice(0, 300));
  process.exit(1);
}
const { data } = await lr.json();
const ids = (data ?? []).map((m) => m.id).filter(Boolean).sort();
console.table(ids.map((id) => ({ id })));

for (const model of [
  process.env.GROQ_MODEL ?? "openai/gpt-oss-120b",
  process.env.GROQ_MODEL_LITE ?? "llama-3.1-8b-instant",
]) {
  const t0 = Date.now();
  try {
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: "Reply with exactly: OK" }],
        temperature: 0,
      }),
    });
    const j = await r.json();
    console.log(
      model, r.ok ? "OK" : "FAIL", `${Date.now() - t0}ms`,
      j?.choices?.[0]?.message?.content?.slice(0, 40) ?? JSON.stringify(j).slice(0, 120)
    );
  } catch (e) {
    console.log(model, "ERROR", e.message);
  }
}
```

Run: `bun scripts/probe-groq.mjs`
Expected: a model table + two smoke lines. If a default FAILs or 404s, pick the
nearest capable model from the table (reason tier: a gpt-oss / llama flagship;
fast tier: an instant/8b-class model), update the defaults in `groq.ts`, re-run.
Record the chosen models in `docs/research/phase0-notes.md` (append a dated
"Groq fallback" paragraph).

- [x] **Step 6: Commit**

```bash
git add src/lib/ai/groq.ts tests/groq-provider.test.ts docs/research/phase0-notes.md
git commit -m "Provider: Groq fallback chat module (OpenAI-compatible REST, JSON mode)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

### Task 2: The failover ladder — `chatComplete`

**Files:**
- Create: `src/lib/ai/chat.ts`
- Create: `tests/chat-failover.test.ts`

**Interfaces:**
- Consumes: `geminiChat(system, user, { model })` (ChatOpts already supports an explicit model — no change to gemini.ts), `groqChat`, `GROQ_MODEL`, `GROQ_MODEL_LITE`, `groqEnabled` from Task 1.
- Produces (consumed by Task 3):
  - `export type ChatTier = "reason" | "fast"`
  - `export interface LadderEntry { kind: "gemini" | "groq"; model: string; attempts: number; delayMs: number }`
  - `export interface ChatResult { text: string; provider: string; hops: number }` — `hops` = how many entries failed before the one that served.
  - `export function buildLadder(tier: ChatTier, withGroq: boolean): LadderEntry[]`
  - `export async function chatComplete(system: string, user: string, opts?: { tier?: ChatTier; withGroq?: boolean; on429?: () => void; onHop?: () => void; transport?: (e: LadderEntry) => Promise<string> }): Promise<ChatResult>`
  - Retry policy: retry on 429 + 5xx + network errors; bubble immediately on any other 4xx (a bad request is bad everywhere).

- [x] **Step 1: Write the failing tests**

`tests/chat-failover.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { ProviderError } from "../src/lib/ai/gemini";
import { buildLadder, chatComplete } from "../src/lib/ai/chat";

describe("buildLadder", () => {
  test("reason tier: gemini primary → gemini fallback → groq", () => {
    const l = buildLadder("reason", true);
    expect(l.map((e) => e.kind)).toEqual(["gemini", "gemini", "groq"]);
    expect(l[0].attempts).toBe(2);
  });
  test("fast tier: gemini lite → groq lite", () => {
    const l = buildLadder("fast", true);
    expect(l.map((e) => e.kind)).toEqual(["gemini", "groq"]);
  });
  test("without groq the ladder is gemini-only", () => {
    expect(buildLadder("reason", false).every((e) => e.kind === "gemini")).toBe(true);
  });
});

describe("chatComplete failover", () => {
  test("persistent gemini 503 → hops to the groq entry and succeeds", async () => {
    const seen: string[] = [];
    let hops = 0;
    const r = await chatComplete("s", "u", {
      tier: "reason",
      withGroq: true,
      onHop: () => { hops += 1; },
      transport: async (e) => {
        seen.push(`${e.kind}:${e.model}`);
        if (e.kind === "gemini") throw new ProviderError(503, "overloaded");
        return '{"ok":true}';
      },
    });
    expect(r.text).toBe('{"ok":true}');
    expect(r.hops).toBe(2);            // two gemini entries failed first
    expect(hops).toBe(2);
    expect(seen[seen.length - 1].startsWith("groq:")).toBe(true);
  });
  test("429 fires on429 and still fails over", async () => {
    let saw429 = false;
    const r = await chatComplete("s", "u", {
      tier: "fast",
      withGroq: true,
      on429: () => { saw429 = true; },
      transport: async (e) => {
        if (e.kind === "gemini") throw new ProviderError(429, "quota");
        return "ok";
      },
    });
    expect(saw429).toBe(true);
    expect(r.text).toBe("ok");
  });
  test("non-retryable 400 bubbles without trying fallbacks", async () => {
    const seen: string[] = [];
    await expect(
      chatComplete("s", "u", {
        tier: "reason",
        withGroq: true,
        transport: async (e) => {
          seen.push(e.model);
          throw new ProviderError(400, "bad request");
        },
      })
    ).rejects.toThrow("status 400");
    expect(seen).toHaveLength(1);
  });
  test("empty completion counts as failure and fails over", async () => {
    const r = await chatComplete("s", "u", {
      tier: "fast",
      withGroq: true,
      transport: async (e) => (e.kind === "gemini" ? "  " : "real text"),
    });
    expect(r.text).toBe("real text");
    expect(r.hops).toBe(1);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `bun test tests/chat-failover.test.ts`
Expected: FAIL — module does not exist.

- [x] **Step 3: Implement `src/lib/ai/chat.ts`**

```ts
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
  hops: number;     // entries that failed before the one that served
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
    on429?: () => void;
    onHop?: () => void;
    transport?: (e: LadderEntry) => Promise<string>;
  } = {}
): Promise<ChatResult> {
  const tier = opts.tier ?? "reason";
  const transport =
    opts.transport ??
    (async (e: LadderEntry) =>
      e.kind === "gemini"
        ? geminiChat(system, user, { model: e.model })
        : groqChat(system, user, e.model));
  const ladder = buildLadder(tier, opts.withGroq ?? groqEnabled());

  let lastErr: unknown = null;
  for (let e = 0; e < ladder.length; e++) {
    const entry = ladder[e];
    for (let a = 0; a < entry.attempts; a++) {
      if (a) await sleep(entry.delayMs);
      try {
        const text = await transport(entry);
        if (!text) throw new ProviderError(502, "empty completion");
        return { text, provider: entry.model, hops: e };
      } catch (err) {
        lastErr = err;
        if (err instanceof ProviderError && err.status === 429) opts.on429?.();
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
```

- [x] **Step 4: Run tests**

Run: `bun test tests/chat-failover.test.ts tests/groq-provider.test.ts`
Expected: PASS (both).

- [x] **Step 5: Commit**

```bash
git add src/lib/ai/chat.ts tests/chat-failover.test.ts
git commit -m "Provider: failover ladder (Gemini → Gemini fallback → Groq) with short delays

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

### Task 3: Wire the ladder into the engine + measure watchability

**Files:**
- Modify: `src/lib/video-jobs.ts` (chatJson rewrite, stats fields, writeScene hop sink)
- Modify: `scripts/eval/run-eval.ts` (watchableMs capture + gate, providerHops detail)
- Create: `scripts/probe-thinking.mjs` (untracked)

**Interfaces:**
- Consumes: `chatComplete` from Task 2.
- Produces:
  - `chatJson(system, user, tier?, hopSink?)` — same name/callers, new failover behavior.
  - `writeScene(outlineJson, index, planned, hopSink?: { providerHops: number })` (Task 11 will fold this into an opts object).
  - `Job["stats"]` gains `providerHops: number` (init 0) and `watchableMs: number | null` (init null). Task 6 adds review fields, Task 9 checker fields, Task 11 verification — each task states its own additions.

- [x] **Step 1: Replace chatJson's backoff ladder with chatComplete**

In `src/lib/video-jobs.ts`, replace the whole `chatJson` function (keep `lastChatWas429` and its comment) with:

```ts
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
```

Add the import `import { chatComplete } from "./ai/chat";` and update call sites to pass the sink:
- `callDirector`: `await chatJson(DIRECTOR_PROMPT + ..., user, "reason", job.stats)`
- `callPlanner`: `await chatJson(TRANSCRIPT_PROMPT + ..., plannerUserPrompt(outlineJson), "reason", job.stats)`
- `writeScene`: add 4th param `hopSink?: { providerHops: number }`, pass it as `await chatJson(WRITER_SYSTEM, writerUser(...), "fast", hopSink)`; the worker loop in `runJob` passes `job.stats`.

- [x] **Step 2: Stats — providerHops + watchableMs**

In `Job["stats"]` add `providerHops: number;` and `watchableMs: number | null;`; init `providerHops: 0,` and `watchableMs: null,` in `createJob`. In `runJob`, immediately before `job.phase = "voicing";` add:

```ts
    job.stats.watchableMs = Date.now() - job.createdAt; // delivery moment
```

(Task 11 moves this line after the potential discrepancy rerun — that is the true delivery moment then.)

- [x] **Step 3: Full unit suite + typecheck**

Run: `bun test`
Expected: all existing suites PASS (pen-pacing, board-discipline, etc. — nothing touched them).
Run: `bunx tsc --noEmit`
Expected: no errors.

- [x] **Step 4: Eval runner — capture watchability, gate it, expose hops**

In `scripts/eval/run-eval.ts`:
1. In the poll loop, capture the watchable moment: declare `let watchableMs: number | null = null;` before the loop, and inside it after `snap = await r.json();` add:

```ts
    if (watchableMs === null && snap?.phase === "voicing") watchableMs = Date.now() - t0;
```

2. Extend `FixtureResult` with `watchableMs: number | null`.
3. After the four existing `checks.push` lines add (using `snap.stats?.watchableMs ?? watchableMs` as `w`):

```ts
  const w = (snap.stats?.watchableMs as number | null) ?? watchableMs;
  checks.push({ ok: w !== null && w <= 90000, detail: `watchableMs=${w ?? "n/a"} (target ≤60s, gate 90s)` });
  checks.push({
    ok: ((snap.stats?.providerHops as number | undefined) ?? 0) <= 8,
    detail: `providerHops=${snap.stats?.providerHops ?? 0}`,
  });
```

(The 90s gate catches disasters like today's ~200s; tighten toward 60s once stable.)
4. Include `watchableMs: w` in the returned result object.

- [x] **Step 5: Thinking-budget probe for the fast tier (go/no-go)**

Create `scripts/probe-thinking.mjs`:

```js
/* Does the lite model accept a SMALL thinking budget, and is it faster?
   Usage: bun scripts/probe-thinking.mjs */
const key = process.env.GEMINI_API_KEY;
if (!key) { console.error("GEMINI_API_KEY not set"); process.exit(1); }
const BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function call(thinkingBudget) {
  const t0 = Date.now();
  const r = await fetch(`${BASE}/gemini-3.5-flash-lite:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: "Reply with one word." }] },
      contents: [{ role: "user", parts: [{ text: "Say OK" }] }],
      generationConfig: { temperature: 0, thinkingConfig: { thinkingBudget } },
    }),
  });
  const body = await r.json().catch(() => ({}));
  return { status: r.status, ms: Date.now() - t0 };
}

for (const budget of [-1, 2048, 1024, 512, 256, 0]) {
  const runs = [];
  for (let i = 0; i < 3; i++) runs.push(await call(budget));
  const okRuns = runs.filter((x) => x.status === 200);
  const med = okRuns.length
    ? okRuns.map((x) => x.ms).sort((a, b) => a - b)[Math.floor(okRuns.length / 2)]
    : null;
  console.log(`budget ${String(budget).padStart(5)}:`, runs.map((x) => `${x.status}/${x.ms}ms`).join(" "), med !== null ? `(median ${med}ms)` : "");
}
```

Run: `bun scripts/probe-thinking.mjs`. Decision rule — append the result to
`docs/research/phase0-notes.md`:
- If some budget ≥ 256 is accepted (200s) AND its median is ≥ 30% faster than
  `-1`'s median: add `thinkingBudget?: number` to `ChatOpts` in `gemini.ts`
  (use it in `generationConfig.thinkingConfig` when set, else keep `-1`), add
  `thinkingBudget?: number` to `LadderEntry`, and set it on the fast-tier gemini
  entries in `buildLadder`.
- Otherwise: record "no win, dynamic budget stays" and change nothing.

- [x] **Step 6: One live fixture against the new ladder (needs dev server + quota)**

Run (dev server on :3000): `bun scripts/eval/run-eval.ts alg-linear`
Expected: PASS with `watchableMs` printed and `plannerMs` a NUMBER (the 2026-09-29 run had `plannerMs: null` — the planner died; with failover it must survive). If quota is exhausted, note it and re-run later — do not fake the number.

- [x] **Step 7: Commit**

```bash
git add src/lib/video-jobs.ts src/lib/ai/gemini.ts docs/research/phase0-notes.md
git commit -m "Speed: failover-wired chatJson (no long backoffs) + watchableMs/providerHops in stats

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Stream B — Phase B: the Reviewer agent

### Task 4: Reviewer prompts (static prefix + dynamic turn)

**Files:**
- Modify: `src/lib/prompts.ts` (add REVIEWER_SYSTEM + reviewerUser after the writer section)
- Create: `tests/reviewer-contract.test.ts`

**Interfaces:**
- Produces:
  - `export const REVIEWER_SYSTEM: string` — the full static reviewer contract.
  - `export function reviewerUser(chapter: string, narration: string, beatsJson: string): string`

- [x] **Step 1: Write the failing test**

`tests/reviewer-contract.test.ts` (extended again by Task 5):

```ts
import { describe, expect, test } from "bun:test";
import { REVIEWER_SYSTEM, reviewerUser } from "../src/lib/prompts";

describe("reviewer prompt layout", () => {
  test("static prefix: checklist present, no dynamic content", () => {
    expect(REVIEWER_SYSTEM).toContain("CHECKLIST");
    expect(REVIEWER_SYSTEM).toContain("verdict");
    expect(REVIEWER_SYSTEM).not.toContain("Step 3"); // no scene data leaked in
  });
  test("dynamic turn carries chapter, narration and beats", () => {
    const u = reviewerUser("Step 3", "so two x equals eight", '[{"type":"write","text":"2x = 8"}]');
    expect(u).toContain("Step 3");
    expect(u).toContain("so two x equals eight");
    expect(u).toContain('"2x = 8"');
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `bun test tests/reviewer-contract.test.ts`
Expected: FAIL — exports don't exist.

- [x] **Step 3: Add the prompts**

Append to `src/lib/prompts.ts`:

```ts
/* ------------------------------------------------------------------ */

/* The REVIEWER contract — STATIC PREFIX (Phase B). Review-and-fix in
   ONE small call: on flag it returns the corrected beats itself.
   Narration is FINAL — the reviewer may never touch it (that is what
   lets voice flush before review exists). */
export const REVIEWER_SYSTEM = `You are the SCENE REVIEWER for EMBER — hand-written solve videos taught by Professor Ember. A scene writer has choreographed ONE scene: the board beats (what the pen writes) for one piece of the professor's narration. The narration is FINAL — you may never change it. You judge the BEATS only, and when something is wrong you return the corrected beats yourself, in this same call.

You receive: the scene's chapter, its narration, and the writer's beats as compact JSON. Output ONLY valid JSON, no fences:
{"verdict": "pass"}
{"verdict": "fixed", "beats": [Beat, ...]}

The second form REPLACES the writer's beats entirely, so when you fix, return the FULL list — the writer's good beats unchanged, only the problems corrected.

CHECKLIST, in priority order:
1. NO PROSE ON THE BOARD. Sentences of explanation (because/since/notice/remember, article-heavy clauses) belong in the narration, never in ink. Remove prose beats entirely — the voice already carries those words.
2. DENSITY. 2-5 content beats. Too many fragments → merge into fewer, cleaner lines. If the scene is crowded, start with an erase beat.
3. SAY TAGS. Every beat that writes ink (write/title/fraction/graph/freebody/table) carries "say" — a VERBATIM fragment of this scene's narration, in order. Fix missing or unanchored say tags. Decoration beats (box/circle/crossout/underline/point) take NO say.
4. MATH CONSISTENCY. Equation lines must be consistent with what the narration claims. If the narration concludes x is 4, no line may show x = 5, and arithmetic on the board must actually be correct (2 + 2 = 5 is never allowed to stand). Fix the beats to match the narration and the mathematics.
5. TARGETS. box/circle/crossout/point targets must quote text that actually appears in a written line of this scene. Remove or fix dangling targets.

RULES FOR YOUR FIX:
- Keep the writer's good beats exactly as given; change only what a checklist item requires.
- Every "say" must be verbatim from the narration.
- University notation (x², m/s², v₀, ∫ ∑ √ ± × ÷ π Δ μ) — never LaTeX, never backslashes, never $.
- Same beat types you were given. Under 3KB total.

If everything passes, output {"verdict": "pass"} — never invent work.`;

export function reviewerUser(
  chapter: string,
  narration: string,
  beatsJson: string
): string {
  return `SCENE CHAPTER: ${chapter}

NARRATION (final — the professor says exactly this):
"""${narration}"""

WRITER'S BEATS (compact JSON):
${beatsJson}

Review the beats against the checklist now. Output {"verdict":"pass"} or {"verdict":"fixed","beats":[...]} only.`;
}
```

- [x] **Step 4: Run tests**

Run: `bun test tests/reviewer-contract.test.ts`
Expected: PASS.

- [x] **Step 5: Commit**

```bash
git add src/lib/prompts.ts tests/reviewer-contract.test.ts
git commit -m "Reviewer agent: review-and-fix contract (static prefix + per-scene user turn)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

### Task 5: Fix acceptance — `sanitizeSceneBeats` + `normalizeReviewFix`

**Files:**
- Modify: `src/lib/solve-schema.ts` (export the per-scene beat loop; reuse it in `sanitizeScript`)
- Create: `src/lib/video/review.ts`
- Create: `tests/scene-beats.test.ts`
- Modify: `tests/reviewer-contract.test.ts` (append normalize/sampling tests)

**Interfaces:**
- Produces:
  - In solve-schema: `export function sanitizeSceneBeats(rawBeats: unknown, narration: string, stats?: { proseDropped: number }, label?: string): Beat[]` — same cleaning as the merge applies to a scene, runnable on ONE scene's beats before they replace the writer's. Empty result = reject the fix.
  - In review.ts: `export type ReviewOutcome = { verdict: "pass" } | { verdict: "fixed"; beats: unknown[] } | null` and:
    - `export function normalizeReviewFix(raw: unknown): ReviewOutcome`
    - `export function shouldReview(pressure: boolean, flagged: boolean, roll: number): boolean` — spec §5 cost control: healthy → review everything; under 429 pressure → flagged scenes + a 30% sample.

- [x] **Step 1: Write the failing tests**

`tests/scene-beats.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { sanitizeSceneBeats } from "../src/lib/solve-schema";

const NARRATION = "so two x equals eight and we are nearly done";

describe("sanitizeSceneBeats", () => {
  test("cleans beats exactly like the merge would", () => {
    const beats = sanitizeSceneBeats(
      [
        { type: "write", text: "2x = 8", color: "green" },
        { type: "box", color: "yellow" },
      ],
      NARRATION
    );
    expect(beats).toHaveLength(2);
    expect(beats[0]).toMatchObject({ type: "write", text: "2x = 8" });
  });
  test("drops prose into the collector", () => {
    const stats = { proseDropped: 0 };
    const beats = sanitizeSceneBeats(
      [
        { type: "write", text: "Energy is conserved in this system" },
        { type: "write", text: "2x = 8" },
      ],
      NARRATION,
      stats
    );
    expect(beats).toHaveLength(1);
    expect(stats.proseDropped).toBe(1);
  });
  test("an all-prose fix returns empty (caller rejects it)", () => {
    expect(
      sanitizeSceneBeats([{ type: "write", text: "We subtract five because we want x alone" }], NARRATION)
    ).toHaveLength(0);
  });
  test("non-array input returns empty", () => {
    expect(sanitizeSceneBeats(null, NARRATION)).toHaveLength(0);
  });
});
```

Append to `tests/reviewer-contract.test.ts`:

```ts
import { normalizeReviewFix, shouldReview } from "../src/lib/video/review";

describe("normalizeReviewFix", () => {
  test("pass verdict", () => {
    expect(normalizeReviewFix({ verdict: "pass" })).toEqual({ verdict: "pass" });
  });
  test("fixed verdict returns the beats", () => {
    const out = normalizeReviewFix({ verdict: "fixed", beats: [{ type: "write", text: "x = 4" }] });
    expect(out).toEqual({ verdict: "fixed", beats: [{ type: "write", text: "x = 4" }] });
  });
  test("garbage / missing beats / wrong verdict → null (original ships)", () => {
    expect(normalizeReviewFix(null)).toBeNull();
    expect(normalizeReviewFix("pass")).toBeNull();
    expect(normalizeReviewFix({ verdict: "fixed" })).toBeNull();
    expect(normalizeReviewFix({ verdict: "fixed", beats: [] })).toBeNull();
    expect(normalizeReviewFix({ verdict: "maybe" })).toBeNull();
  });
});

describe("shouldReview (429 cost control)", () => {
  test("healthy: everything is reviewed", () => {
    expect(shouldReview(false, false, 0.99)).toBe(true);
  });
  test("pressure: flagged scenes still reviewed", () => {
    expect(shouldReview(true, true, 0.99)).toBe(true);
  });
  test("pressure: unflagged reviewed only in the 30% sample", () => {
    expect(shouldReview(true, false, 0.29)).toBe(true);
    expect(shouldReview(true, false, 0.31)).toBe(false);
  });
});
```

- [x] **Step 2: Run to verify they fail**

Run: `bun test tests/scene-beats.test.ts tests/reviewer-contract.test.ts`
Expected: FAIL — `sanitizeSceneBeats` not exported; `src/lib/video/review.ts` doesn't exist.

- [x] **Step 3: Extract `sanitizeSceneBeats` in solve-schema.ts**

Add above `sanitizeScript` (the merge's inner loop is then replaced by a call — same behavior, one implementation):

```ts
/** per-scene beat cleaning — the same rules the merge applies, runnable
    on ONE scene's beats (the Reviewer's fix, Phase B) BEFORE they are
    allowed to replace the writer's. An empty result rejects the fix. */
export function sanitizeSceneBeats(
  rawBeats: unknown,
  narration: string,
  stats?: { proseDropped: number },
  label?: string
): Beat[] {
  if (!Array.isArray(rawBeats)) return [];
  const narrationKey = normSpeechKey(narration);
  const beats: Beat[] = [];
  const prose: string[] = [];
  for (const bRaw of rawBeats.slice(0, 22)) {
    const beat = sanitizeBeat(bRaw, narrationKey);
    if (!beat) continue;
    if (beat.type === "write" && isBoardProse(beat.text)) {
      prose.push(beat.text); // explanations are SPOKEN, never written
      if (stats) stats.proseDropped += 1;
      continue;
    }
    beats.push(beat);
  }
  if (prose.length) {
    console.log(
      `[board-discipline] ${label ?? "scene"} — dropped ${prose.length} prose beat(s) (the planner's narration already carries these words): ${prose
        .map((p) => JSON.stringify(p))
        .join(", ")}`
    );
  }
  return beats;
}
```

Then inside `sanitizeScript`'s scene loop, replace the beats/prose block with:

```ts
    const beats = sanitizeSceneBeats(
      s.beats,
      narration,
      stats,
      `"${chapter}"`
    );
```

(deleting the now-dead local loop, the old `prose` array and its log; `narrationKey` stays in use for… nothing else — remove its declaration if the compiler says it is unused).

- [x] **Step 4: Create `src/lib/video/review.ts`**

```ts
/* Phase B — the REVIEWER's deterministic half: verdict parsing and the
   429 cost-control sampling rule. The LLM call itself lives in
   video-jobs (it needs the chat ladder and job state). */

export type ReviewOutcome =
  | { verdict: "pass" }
  | { verdict: "fixed"; beats: unknown[] }
  | null; // unusable output → the original beats ship

export function normalizeReviewFix(raw: unknown): ReviewOutcome {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.verdict === "pass") return { verdict: "pass" };
  if (o.verdict === "fixed" && Array.isArray(o.beats) && o.beats.length) {
    return { verdict: "fixed", beats: o.beats.slice(0, 22) };
  }
  return null;
}

/** spec §5 cost control: review everything while healthy; under 429
    pressure review only flagged scenes + a 30% random sample. */
export function shouldReview(
  pressure: boolean,
  flagged: boolean,
  roll: number
): boolean {
  if (!pressure) return true;
  return flagged || roll < 0.3;
}
```

- [x] **Step 5: Run the FULL suite (sanitizeScript refactor touches existing paths)**

Run: `bun test`
Expected: PASS — including the pre-existing `prose-dropped` and `board-discipline` suites (they pin the merge behavior this refactor must preserve).

- [x] **Step 6: Commit**

```bash
git add src/lib/solve-schema.ts src/lib/video/review.ts tests/scene-beats.test.ts tests/reviewer-contract.test.ts
git commit -m "Reviewer: fix-acceptance path (sanitizeSceneBeats + verdict normalization + 429 sampling rule)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

### Task 6: Wire the Reviewer into the pipeline

**Files:**
- Modify: `src/lib/video-jobs.ts` (dispatch at writer-land, bounded collect at merge, stats)
- Modify: `scripts/eval/run-eval.ts` (reviewedScenes gate)

**Interfaces:**
- Consumes: `REVIEWER_SYSTEM, reviewerUser` (Task 4), `normalizeReviewFix, shouldReview` (Task 5), `sanitizeSceneBeats` (Task 5), `isBoardProse` from solve-schema, `chatJson(..., "fast", job.stats)`.
- Produces: `Job["stats"]` gains `reviewedScenes: number`, `unreviewedScenes: number`, `fixedScenes: number` (all init 0). Dev-only: `EMBER_PLANT_BAD_BEAT=1` at server start injects a wrong beat into scene 2's writer output pre-review (exercises the fix path live; inert when unset).

- [x] **Step 1: Stats fields**

Add to `Job["stats"]`:

```ts
    reviewedScenes: number;
    unreviewedScenes: number;
    fixedScenes: number;
```

init in `createJob`: `reviewedScenes: 0, unreviewedScenes: 0, fixedScenes: 0,`.

- [x] **Step 2: Dispatch reviews as writers land**

In `runJob`, just before the `/* 3 ─ scene writers */` block, add:

```ts
    /* 2b — REVIEWER (Phase B): dispatched the moment a writer lands,
       async — voice NEVER waits for review (narration is canonical;
       the reviewer only ever replaces beats). Collected at merge with
       a bounded wait; anything unresolved ships as the writer left it. */
    const REVIEW_COLLECT_MS = 8000;
    const reviewPromises: Array<Promise<void>> = [];
    const reviewCounters = { reviewed: 0, unreviewed: 0, fixed: 0 };
    const dispatchReview = (
      idx: number,
      chapter: string,
      narration: string,
      beats: unknown[]
    ) => {
      const proseFlagged = beats.some(
        (b) =>
          (b as { type?: unknown })?.type === "write" &&
          isBoardProse(String((b as { text?: unknown }).text ?? ""))
      );
      if (!shouldReview(lastChatWas429, proseFlagged, Math.random())) {
        reviewCounters.unreviewed++; // cost-control skip, not a failure
        return;
      }
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
              if (cleaned.length) {
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
```

In the worker loop, right after `results[myIndex] = r;` and after `narrations[myIndex]` is set (reviews need the final narration), add:

```ts
          /* the dev-only planted defect: a wrong beat the reviewer must
             catch (checklist 4). Inert unless the server was started with
             EMBER_PLANT_BAD_BEAT=1. */
          const beatsForReview =
            process.env.EMBER_PLANT_BAD_BEAT === "1" && myIndex === 1
              ? [...r.beats, { type: "write", text: "2 + 2 = 5", color: "white" }]
              : r.beats;
          dispatchReview(
            myIndex,
            outline.scenes[myIndex].chapter,
            narrations[myIndex] ?? "",
            beatsForReview
          );
```

Note: when the planted beat is active it is also what the merge will sanitize —
the planted text must NOT survive to the delivered script (that is the manual
check below).

- [x] **Step 3: Bounded collect at merge**

In `runJob`, after `await Promise.all(workers);` and BEFORE the `/* 4 ─ merge */` rawScript build, add:

```ts
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
    job.stats.unreviewedScenes = reviewCounters.unreviewed + Math.max(0, pendingReviews);
```

(Late-settling reviews keep incrementing the counters; refresh the same three
stats fields once more right after `await voiceChain;` so `ready`-time snapshots
are exact.)

- [x] **Step 4: Full suite + typecheck + dev smoke**

Run: `bun test && bunx tsc --noEmit`
Expected: PASS, no type errors.
Run: `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
Expected: `200`.

- [x] **Step 5: Eval gate**

In `scripts/eval/run-eval.ts`, after the existing checks:

```ts
  checks.push({
    ok: ((snap.stats?.reviewedScenes as number | undefined) ?? 0) >= 1,
    detail: `reviewed=${snap.stats?.reviewedScenes ?? 0} fixed=${snap.stats?.fixedScenes ?? 0} unreviewed=${snap.stats?.unreviewedScenes ?? 0}`,
  });
```

- [x] **Step 6: Live verification, two runs (needs dev server + quota)**

1. Normal: `bun scripts/eval/run-eval.ts alg-linear` → PASS, `reviewed ≥ 1`, watchableMs not materially worse than Task 3's run (review tail ≤ ~8s by construction).
2. Forced bad beat (Phase B done-when: "a forced bad beat is corrected"): restart the dev server with the env flag — `EMBER_PLANT_BAD_BEAT=1 npm run dev` (or set it in `.env` temporarily) — then `bun scripts/eval/run-eval.ts alg-linear`. Expect `fixed ≥ 1` and the delivered script to contain NO `"2 + 2 = 5"` write beat (grep the results JSON). Restart the server WITHOUT the flag afterwards and remove any temporary `.env` line.

- [x] **Step 7: Commit**

```bash
git add src/lib/video-jobs.ts scripts/eval/run-eval.ts
git commit -m "Phase B: reviewer agent live — async per-scene dispatch, bounded collect, fallback = original beats

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Stream C — Phase C: verification (Checker + blind Solver)

### Task 7: Install Nerdamer (the only new dependency)

**Files:**
- Modify: `package.json` / `package-lock.json` (via npm)

- [x] **Step 1: Install**

Run: `npm i nerdamer`
NOTE (project gotcha): npm is slow here and node_modules churn can kill the dev server. After install completes, check `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` — restart the dev server if it died.

- [x] **Step 2: Typecheck; add ambient types only if needed**

Run: `bunx tsc --noEmit` after the next task's import exists; if `nerdamer` has no bundled types and tsc errors, create `src/types/nerdamer.d.ts`:

```ts
declare module "nerdamer" {
  interface NerdamerExpression {
    simplify(): NerdamerExpression;
    evaluate(): NerdamerExpression;
    text(): string;
    toString(): string;
  }
  function nerdamer(expr: string): NerdamerExpression;
  export default nerdamer;
}
```

- [x] **Step 3: Commit (with the first file that imports it — Task 10)**

No separate commit; nerdamer lands in package.json and is committed together with `solver.ts` in Task 10 so the repo never references a dep it doesn't have.

### Task 8: The Checker — numeric spot-checks (pure Node)

**Files:**
- Create: `src/lib/video/checker.ts`
- Create: `tests/checker.test.ts`

**Interfaces:**
- Consumes: `tryCompileExpr` from `src/lib/expr.ts`.
- Produces (consumed by Task 9's wiring and the eval harness):
  - `export interface CheckerFlag { scene: number; text: string; detail: string }`
  - `export interface CheckerTally { checked: number; skipped: number; flags: CheckerFlag[] }`
  - `export function checkSceneLines(sceneIdx: number, beats: unknown[]): CheckerTally`
  - `export function checkScriptLines(script: SolveScript): CheckerTally`

Scope decision (deliberate, vs spec §5's "sample random points"): only CONSTANT
arithmetic identities are checked — lines like `Check: 2(4) + 5 = 13` where both
sides are pure numbers. Lines with the variable `x` (`2x = 8`) are CONDITIONAL
equations (true only at the solution) — sampling would false-flag every solve
line, so they are counted `skipped`, not `checked`. Unit-bearing lines fail the
parser naturally and are skipped. Zero false positives beats broad coverage.

- [x] **Step 1: Write the failing tests**

`tests/checker.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { checkSceneLines, checkScriptLines } from "../src/lib/video/checker";

describe("checkSceneLines", () => {
  test("the planted wrong equation is caught", () => {
    const r = checkSceneLines(0, [
      { type: "write", text: "Check: 2(4) + 5 = 14", color: "green" },
    ]);
    expect(r.checked).toBe(1);
    expect(r.flags).toHaveLength(1);
    expect(r.flags[0].scene).toBe(0);
    expect(r.flags[0].text).toContain("2(4) + 5");
  });
  test("correct constant arithmetic passes", () => {
    const r = checkSceneLines(1, [{ type: "write", text: "Check: 2(4) + 5 = 13" }]);
    expect(r.checked).toBe(1);
    expect(r.flags).toHaveLength(0);
  });
  test("rounded values within tolerance pass", () => {
    const r = checkSceneLines(0, [{ type: "write", text: "1/3 = 0.333" }]);
    expect(r.checked).toBe(1);
    expect(r.flags).toHaveLength(0);
  });
  test("conditional equations (free variable x) are skipped, not flagged", () => {
    const r = checkSceneLines(0, [{ type: "write", text: "2x = 8" }]);
    expect(r.checked).toBe(0);
    expect(r.skipped).toBe(1);
    expect(r.flags).toHaveLength(0);
  });
  test("unit-bearing lines are skipped naturally", () => {
    const r = checkSceneLines(0, [{ type: "write", text: "a = 3.2 m/s²" }]);
    expect(r.checked).toBe(0);
    expect(r.skipped).toBe(1);
  });
  test("non-equation writes and non-write beats are not counted", () => {
    const r = checkSceneLines(0, [
      { type: "write", text: "GIVEN" },
      { type: "title", text: "Solving together" },
      { type: "box" },
    ]);
    expect(r.checked).toBe(0);
    expect(r.skipped).toBe(0);
  });
});

describe("checkScriptLines", () => {
  test("aggregates across scenes", () => {
    const script = {
      title: "t",
      question: "q",
      scenes: [
        { chapter: "Solve", narration: "", beats: [{ type: "write", text: "2 + 2 = 5" }] },
        { chapter: "Check", narration: "", beats: [{ type: "write", text: "2(4) + 5 = 13" }] },
      ],
    };
    const r = checkScriptLines(script as never);
    expect(r.checked).toBe(2);
    expect(r.flags).toHaveLength(1);
    expect(r.flags[0].scene).toBe(0);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `bun test tests/checker.test.ts`
Expected: FAIL — module does not exist.

- [x] **Step 3: Implement `src/lib/video/checker.ts`**

```ts
/* ------------------------------------------------------------------
   Phase C — the CHECKER: deterministic numeric spot-checks of equation
   lines (pure Node, milliseconds). Never mutates the script; flags
   only. Deliberately narrow: CONSTANT arithmetic identities — "Check:
   2(4) + 5 = 13"-class lines where both sides are pure numbers.
   Conditional equations ("2x = 8", true only at the solution) and
   unit-bearing lines are counted skipped: sampling them would
   false-flag every correct solve line. Zero false positives first.
------------------------------------------------------------------- */

import { tryCompileExpr } from "../expr";
import type { SolveScript } from "./types";

export interface CheckerFlag {
  scene: number;
  text: string;
  detail: string;
}
export interface CheckerTally {
  checked: number;
  skipped: number;
  flags: CheckerFlag[];
}

/** constant value of one side, or null when it isn't a pure constant
    (free variable x, unknown identifier/unit, parse failure) */
function evalConstant(src: string): number | null {
  if (/(^|[^a-zA-Z])x([^a-zA-Z]|$)/.test(src)) return null; // conditional
  const { fn } = tryCompileExpr(src);
  if (!fn) return null;
  const v = fn(0);
  return Number.isFinite(v) ? v : null;
}

function checkLine(
  text: string
): { status: "checked"; ok: boolean; detail?: string } | { status: "skipped" } {
  const parts = text.split("=");
  if (parts.length < 2) return { status: "skipped" };
  const vals: number[] = [];
  for (const p of parts) {
    const v = evalConstant(p.trim());
    if (v === null) return { status: "skipped" };
    vals.push(v);
  }
  for (let i = 0; i + 1 < vals.length; i++) {
    const a = vals[i];
    const b = vals[i + 1];
    const tol = Math.max(0.01, 0.005 * Math.max(Math.abs(a), Math.abs(b)));
    if (Math.abs(a - b) > tol) {
      return {
        status: "checked",
        ok: false,
        detail: `${parts[i].trim()} evaluates to ${a} but ${parts[i + 1].trim()} evaluates to ${b}`,
      };
    }
  }
  return { status: "checked", ok: true };
}

export function checkSceneLines(sceneIdx: number, beats: unknown[]): CheckerTally {
  const out: CheckerTally = { checked: 0, skipped: 0, flags: [] };
  for (const b of beats.slice(0, 22)) {
    const beat = b as { type?: unknown; text?: unknown };
    if (beat?.type !== "write" || typeof beat.text !== "string") continue;
    // strip a short leading label ("Check:", "Sub:", "LHS:")
    const text = beat.text.replace(/^[A-Za-z][A-Za-z\s]{1,12}:\s*/, "").trim();
    if (!text.includes("=")) continue; // not an equation line — not our business
    const r = checkLine(text);
    if (r.status === "skipped") {
      out.skipped++;
      continue;
    }
    out.checked++;
    if (!r.ok) out.flags.push({ scene: sceneIdx, text, detail: r.detail! });
  }
  return out;
}

export function checkScriptLines(script: SolveScript): CheckerTally {
  const out: CheckerTally = { checked: 0, skipped: 0, flags: [] };
  script.scenes.forEach((s, i) => {
    const r = checkSceneLines(i, s.beats as unknown[]);
    out.checked += r.checked;
    out.skipped += r.skipped;
    out.flags.push(...r.flags);
  });
  return out;
}
```

- [x] **Step 4: Run tests**

Run: `bun test tests/checker.test.ts`
Expected: PASS (all — this is the "planted wrong equation is caught" done-when, deterministic).

- [x] **Step 5: Commit**

```bash
git add src/lib/video/checker.ts tests/checker.test.ts
git commit -m "Phase C: checker — constant-identity numeric spot-checks of equation lines

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

### Task 9: Wire the Checker (per scene at writer-land; feeds reviewer)

**Files:**
- Modify: `src/lib/video-jobs.ts`

**Interfaces:**
- Consumes: `checkSceneLines` (Task 8), existing reviewer dispatch (Task 6).
- Produces: `Job["stats"]` gains `checkerChecked: number` and `checkerFlags: number` (init 0). Reviewer sampling treats a checker-flagged scene as flagged; a reviewer fix that introduces NEW checker flags is rejected.

- [x] **Step 1: Stats fields**

Add `checkerChecked: number; checkerFlags: number;` to `Job["stats"]`, init both to 0.

- [x] **Step 2: Run at writer-land, before the review dispatch**

In the worker loop, immediately before the `beatsForReview` computation, add:

```ts
          /* CHECKER (Phase C): pure-Node numeric spot-check, ms — runs
             the instant the writer lands; flags feed the reviewer's
             pressure sampling and the fix-acceptance test. */
          const sceneCheck = checkSceneLines(myIndex, r.beats);
          job.stats.checkerChecked += sceneCheck.checked;
          job.stats.checkerFlags += sceneCheck.flags.length;
          if (sceneCheck.flags.length) {
            console.warn(
              `[checker] scene ${myIndex + 1}: ${sceneCheck.flags
                .map((f) => `${f.text} (${f.detail})`)
                .join("; ")}`
            );
          }
```

Change `dispatchReview`'s flagged input: pass `proseFlagged || sceneCheck.flags.length > 0` — concretely, extend the `dispatchReview` signature with `checkerFlagged: boolean` and compute `const flagged = proseFlagged || checkerFlagged;` where `shouldReview` is called.

- [x] **Step 3: Fix acceptance gains the no-new-flags condition**

In `dispatchReview`, where a `fixed` outcome is accepted, tighten to:

```ts
            if (outcome.verdict === "fixed") {
              const cleaned = sanitizeSceneBeats(
                outcome.beats,
                narration,
                job.stats,
                `reviewer fix, scene ${idx + 1}`
              );
              /* the fix must not introduce NEW numeric errors — spec:
                 the fix still has to pass the Checker or original ships */
              const fixCheck = checkSceneLines(idx, outcome.beats);
              const originalFlags = checkerFlagsOf[idx] ?? 0;
              if (cleaned.length && fixCheck.flags.length <= originalFlags) {
                results[idx] = { ...results[idx], beats: outcome.beats };
                reviewCounters.fixed++;
              }
            }
```

which needs the per-scene original flag count: in the worker loop keep
`const checkerFlagsOf: number[] = [];` (declared next to `reviewPromises`) and set `checkerFlagsOf[myIndex] = sceneCheck.flags.length;`.

- [x] **Step 4: Full suite + typecheck + dev smoke**

Run: `bun test && bunx tsc --noEmit && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
Expected: PASS, no errors, `200`.

- [x] **Step 5: Commit**

```bash
git add src/lib/video-jobs.ts
git commit -m "Phase C: checker wired per-scene — flags in stats, feeds reviewer sampling + fix acceptance

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

### Task 10: The blind Solver — prompts + pure verification module

**Files:**
- Modify: `src/lib/prompts.ts` (SOLVER_SYSTEM + solverUser; writerUser gains optional note)
- Create: `src/lib/video/solver.ts`
- Create: `tests/solver-verify.test.ts`
- Create: `src/types/nerdamer.d.ts` (only if tsc demands it — Task 7 Step 2)

**Interfaces:**
- Produces:
  - `export const SOLVER_SYSTEM: string`, `export function solverUser(question: string): string`
  - `writerUser(outlineJson, sceneIndex, script, visualize?, analogy?, note?)` — `note` appends a verification discrepancy instruction AFTER the existing content (writer-prefix tests must stay green).
  - In solver.ts (all pure — the LLM call itself stays in video-jobs):
    - `export interface SolverAnswer { answer: string; keySteps: string[] }`
    - `export function normalizeSolver(raw: unknown): SolverAnswer | null`
    - `export interface ScriptAnswer { answer: string; scene: number }`
    - `export function extractScriptAnswer(script: SolveScript): ScriptAnswer | null`
    - `export type VerifyVerdict = "match" | "mismatch" | "incomparable"`
    - `export function compareAnswers(a: string, b: string): VerifyVerdict`

- [x] **Step 1: Write the failing tests**

`tests/solver-verify.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import {
  compareAnswers,
  extractScriptAnswer,
  normalizeSolver,
} from "../src/lib/video/solver";

describe("normalizeSolver", () => {
  test("keeps a clean answer and steps", () => {
    const r = normalizeSolver({ answer: "x = 4", keySteps: ["subtract 5", "divide by 2"] });
    expect(r).toEqual({ answer: "x = 4", keySteps: ["subtract 5", "divide by 2"] });
  });
  test("no answer → null", () => {
    expect(normalizeSolver({ keySteps: [] })).toBeNull();
    expect(normalizeSolver("junk")).toBeNull();
  });
});

describe("extractScriptAnswer", () => {
  const script = {
    title: "t",
    question: "q",
    scenes: [
      { chapter: "Understand", narration: "", beats: [{ type: "write", text: "2x + 5 = 13", color: "blue", keep: true }] },
      { chapter: "Answer", narration: "", beats: [{ type: "write", text: "x = 4", color: "green", keep: true }, { type: "box", target: "text:x = 4" }] },
      { chapter: "Check", narration: "", beats: [{ type: "write", text: "Check: 2(4) + 5 = 13" }] },
    ],
  };
  test("prefers the boxed line in the answer scene", () => {
    const r = extractScriptAnswer(script as never);
    expect(r).toEqual({ answer: "x = 4", scene: 1 });
  });
  test("falls back to the last keep:true write when no answer scene", () => {
    const noAnswerScene = { ...script, scenes: script.scenes.slice(0, 1) };
    expect(extractScriptAnswer(noAnswerScene as never)).toEqual({ answer: "2x + 5 = 13", scene: 0 });
  });
  test("nothing answer-like → null", () => {
    expect(extractScriptAnswer({ ...script, scenes: [{ chapter: "Solve", narration: "", beats: [{ type: "write", text: "work" }] }] } as never)).toBeNull();
  });
});

describe("compareAnswers", () => {
  test("x = 4 matches 4", () => {
    expect(compareAnswers("x = 4", "4")).toBe("match");
  });
  test("units stripped before comparing", () => {
    expect(compareAnswers("a = 3.2 m/s²", "3.2")).toBe("match");
  });
  test("symbolic equivalence: 1/e² matches e^{-2}", () => {
    expect(compareAnswers("1/e²", "e^{-2}")).toBe("match");
  });
  test("plain numeric disagreement is a mismatch", () => {
    expect(compareAnswers("x = 4", "5")).toBe("mismatch");
    expect(compareAnswers("4", "4.5")).toBe("mismatch");
  });
  test("multi-part answers compare pairwise, order-sensitive", () => {
    expect(compareAnswers("x = 4, y = 7", "x = 4, y = 7")).toBe("match");
    expect(compareAnswers("x = 4, y = 7", "x = 7, y = 4")).toBe("mismatch");
  });
  test("part counts differ → incomparable", () => {
    expect(compareAnswers("x = 4, y = 7", "4")).toBe("incomparable");
  });
  test("non-mathematical wording → incomparable", () => {
    expect(compareAnswers("the series converges", "0.135")).toBe("incomparable");
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `bun test tests/solver-verify.test.ts`
Expected: FAIL — module does not exist.

- [x] **Step 3: Add the solver prompts to `src/lib/prompts.ts`**

```ts
/* ------------------------------------------------------------------ */

/* The BLIND SOLVER contract — STATIC PREFIX (Phase C). One parallel
   call from t0: re-answers the question from the question alone, so
   the lesson's final answer can be independently verified at merge. */
export const SOLVER_SYSTEM = `You are the BLIND SOLVER for EMBER — an independent mathematician verifying a lesson engine's work. You receive ONLY a question — never any lesson outline, script, or board beats. Solve it yourself, carefully, the way a strong university mathematician would.

Output ONLY valid JSON, no fences:
{"answer": string, "keySteps": string[]}

RULES:
- "answer" = the final answer EXACTLY as a mathematician states it, minimal and canonical: "x = 4", "a = 3.2 m/s²", "(x/2 − 1/4)e^{2x} + C", "the series converges". No sentences, no working in this field.
- "keySteps" = 3-6 short strings naming the decisive moves ("integrate by parts twice", "discriminant is zero → one repeated root").
- Solve honestly — you are the check, not a rubber stamp.
- University notation (x², m/s², ∫, √, π) — never LaTeX, never backslashes, never $.

COMPACTNESS: under 2KB. Raw JSON only, starting with { and ending with }.`;

export function solverUser(question: string): string {
  return `Solve this problem independently:\n\n${question}`;
}
```

(Spec §5 says "question + subject ONLY" — subject arrives only after the director. The solver launches at t0 to stay off the critical path, so it gets the question alone; the blindness constraint — never the script — is what matters.)

Then extend `writerUser` with the optional note (append AFTER the existing template content, before the final "Choreograph…" line):

```ts
export function writerUser(
  outlineJson: string,
  sceneIndex: number,
  script: string | null,
  visualize?: string,
  analogy?: string,
  note?: string
): string {
```

and inside the returned template, after the analogy/visualize block:

```ts
${note ? `\nNOTE FROM VERIFICATION: ${note}\nRe-check this scene's mathematics and correct any error — keep the narration verbatim.\n` : ""}
```

- [x] **Step 4: Implement `src/lib/video/solver.ts`**

```ts
/* ------------------------------------------------------------------
   Phase C — the SOLVER's deterministic half: output normalization,
   script-answer extraction, and Nerdamer equivalence with a numeric
   fallback. The blind LLM call itself lives in video-jobs.
   Comparison is CONSERVATIVE (spec §10): only a clear numeric or
   symbolic-constant disagreement is a mismatch; everything murky is
   "incomparable" and never triggers a rerun.
------------------------------------------------------------------- */

import nerdamer from "nerdamer";
import { cleanMathText, cleanNarration } from "../solve-schema";
import type { Beat, SolveScript } from "./types";

export interface SolverAnswer {
  answer: string;
  keySteps: string[];
}

export function normalizeSolver(raw: unknown): SolverAnswer | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const answer = cleanNarration(o.answer).slice(0, 120);
  if (!answer) return null;
  const keySteps = Array.isArray(o.keySteps)
    ? o.keySteps
        .slice(0, 6)
        .map((s) => cleanNarration(s as unknown).slice(0, 100))
        .filter(Boolean)
    : [];
  return { answer, keySteps };
}

/* ---------- script side: find the lesson's final answer ---------- */

export interface ScriptAnswer {
  answer: string;
  scene: number;
}

function pickAnswerBeat(beats: Beat[]): string | null {
  for (let j = beats.length - 1; j >= 0; j--) {
    const b = beats[j] as Beat & { target?: string };
    if (
      (b.type === "box" || b.type === "circle") &&
      typeof b.target === "string" &&
      b.target.startsWith("text:")
    ) {
      return b.target.slice(5).trim();
    }
  }
  const writes = beats.filter((b) => b.type === "write") as Array<
    Beat & { text: string; keep?: boolean; color?: string }
  >;
  const kept = [...writes]
    .reverse()
    .find((w) => w.keep === true || w.color === "green");
  return (kept ?? writes[writes.length - 1])?.text ?? null;
}

export function extractScriptAnswer(script: SolveScript): ScriptAnswer | null {
  for (let i = script.scenes.length - 1; i >= 0; i--) {
    const s = script.scenes[i];
    if (!/answer|result/i.test(s.chapter)) continue;
    const pick = pickAnswerBeat(s.beats);
    if (pick) return { answer: pick, scene: i };
  }
  for (let i = script.scenes.length - 1; i >= 0; i--) {
    const beats = script.scenes[i].beats;
    for (let j = beats.length - 1; j >= 0; j--) {
      const b = beats[j] as Beat & { keep?: boolean; text?: string };
      if (b.type === "write" && b.keep === true && typeof b.text === "string") {
        return { answer: b.text, scene: i };
      }
    }
  }
  return null;
}

/* ---------- comparison: symbolic first, numeric fallback --------- */

export type VerifyVerdict = "match" | "mismatch" | "incomparable";

const UNITS = [
  "m/s²", "m/s", "kg", "km", "cm", "mm", "nm", "mol", "rad",
  "m", "s", "h", "N", "J", "W", "Pa", "Hz", "K", "°C", "Ω", "V", "A", "L", "g", "%",
];

function escapeRx(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\/°]/g, "\\$&");
}

function stripUnits(s: string): string {
  let out = s.trim();
  for (;;) {
    let hit = false;
    for (const u of UNITS) {
      const m = out.match(new RegExp(`\\s*${escapeRx(u)}$`));
      if (m && m.index !== undefined && out.slice(0, m.index).trim().length) {
        out = out.slice(0, m.index).trim();
        hit = true;
        break;
      }
    }
    if (!hit) return out;
  }
}

function answerCore(a: string): string {
  let s = a.trim();
  const eq = s.lastIndexOf("=");
  if (eq >= 0) s = s.slice(eq + 1);
  return stripUnits(s);
}

function toNerdamerExpr(sRaw: string): string | null {
  const s = cleanMathText(sRaw)
    .replace(/²/g, "^2")
    .replace(/³/g, "^3")
    .replace(/√\s*\(/g, "sqrt(")
    .replace(/√/g, "sqrt")
    .replace(/π/g, "pi")
    .replace(/[·×]/g, "*")
    .replace(/÷/g, "/")
    .replace(/[−–]/g, "-")
    .replace(/\s+/g, "");
  return s || null;
}

function numeric(e: string): number | null {
  try {
    const t = nerdamer(e).evaluate().text();
    const n = parseFloat(t);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

function compareOne(aRaw: string, bRaw: string): VerifyVerdict | null {
  const a = toNerdamerExpr(answerCore(aRaw));
  const b = toNerdamerExpr(answerCore(bRaw));
  if (!a || !b) return null;
  try {
    const diff = nerdamer(`(${a})-(${b})`).simplify().toString();
    if (diff === "0") return "match";
    const na = numeric(a);
    const nb = numeric(b);
    if (na !== null && nb !== null) {
      return Math.abs(na - nb) <= Math.max(0.01, 0.005 * Math.max(Math.abs(na), Math.abs(nb)))
        ? "match"
        : "mismatch";
    }
    return /^-?[\d.]+$/.test(diff) ? "mismatch" : null; // constant ≠ 0
  } catch {
    return null;
  }
}

function splitParts(s: string): string[] {
  return s
    .split(/,| and /)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function compareAnswers(a: string, b: string): VerifyVerdict {
  const pa = splitParts(a);
  const pb = splitParts(b);
  if (!pa.length || !pb.length || pa.length !== pb.length) return "incomparable";
  let sawMismatch = false;
  for (let i = 0; i < pa.length; i++) {
    const v = compareOne(pa[i], pb[i]);
    if (v === null) return "incomparable"; // any murky part → no verdict
    if (v === "mismatch") sawMismatch = true;
  }
  return sawMismatch ? "mismatch" : "match";
}
```

- [x] **Step 5: Run tests; add nerdamer ambient types if tsc complains**

Run: `bun test tests/solver-verify.test.ts`
Expected: PASS. If any comparison case fails because nerdamer's simplify doesn't
reach the expected form, do NOT loosen the test to fit — try `.expand()` before
`.simplify()` in `compareOne`; only if the case is genuinely beyond nerdamer,
change the test's expectation to `incomparable` and say so in the commit message.
Run: `bunx tsc --noEmit` → add `src/types/nerdamer.d.ts` (Task 7 Step 2) if needed.

- [x] **Step 6: Commit (nerdamer lands here)**

```bash
git add src/lib/prompts.ts src/lib/video/solver.ts tests/solver-verify.test.ts package.json package-lock.json src/types/nerdamer.d.ts
git commit -m "Phase C: blind solver contract + conservative answer comparison (Nerdamer symbolic, numeric fallback)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

### Task 11: Wire the Solver — t0 launch, merge compare, one rerun

**Files:**
- Modify: `src/lib/video-jobs.ts`
- Modify: `scripts/eval/run-eval.ts` (verification gate)

**Interfaces:**
- Consumes: `SOLVER_SYSTEM, solverUser` (Task 10), `normalizeSolver, extractScriptAnswer, compareAnswers, type VerifyVerdict` (Task 10), `writerUser(..., note)` (Task 10), `writeScene` (Task 3 signature).
- Produces: `Job["stats"]` gains:

```ts
    verification: {
      verdict: VerifyVerdict | "unresolved";
      solverAnswer: string | null;
      scriptAnswer: string | null;
      rerun: boolean;
    } | null;
```

  (init `verification: null`). `writeScene` signature becomes `writeScene(outlineJson, index, planned, opts?: { note?: string; hops?: { providerHops: number } })`.

- [x] **Step 1: writeScene opts object**

Fold the Task-3 hop sink into an opts object and thread the note into the writer turn:

```ts
async function writeScene(
  outlineJson: string,
  index: number,
  planned: TranscriptScene | null,
  opts?: { note?: string; hops?: { providerHops: number } }
): Promise<{ narration?: string; beats: unknown[] } | null> {
```

and inside, the call becomes:

```ts
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
```

The Task-3 worker call site becomes `writeScene(outlineJson, myIndex, planned, { hops: job.stats })`.

- [x] **Step 2: Launch the blind solver at t0**

At the top of `runJob`, right after `lastChatWas429 = false;`:

```ts
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
```

Add imports: `SOLVER_SYSTEM, solverUser` from prompts; `normalizeSolver, extractScriptAnswer, compareAnswers` and `type SolverAnswer, type VerifyVerdict` from `./video/solver`.

- [x] **Step 3: Compare at merge + the one discrepancy rerun**

Change `const script = sanitizeScript(...)` to `let script = ...` and `const tl = compileTimeline(script);` to `let tl = ...`, then restructure the merge tail (after the audit block, BEFORE `job.script = script;`) to:

```ts
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
      console.warn(`[verify] mismatch — rerunning scenes ${from + 1}..${to + 1}: ${note}`);
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
        const violations2 = auditTimeline(tl);
        job.stats.layoutViolations = violations2.length;
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
      if (s?.answer && job.stats.verification && !job.stats.verification.solverAnswer) {
        job.stats.verification.solverAnswer = s.answer;
      }
    });

    job.stats.watchableMs = Date.now() - job.createdAt; // true delivery moment (post-rerun)
```

(Delete the Task-3 placement of the watchableMs line — this is its final home. `job.script = script;` and everything after stays unchanged.)

- [x] **Step 4: Full suite + typecheck + dev smoke**

Run: `bun test && bunx tsc --noEmit && curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/`
Expected: PASS, no errors, `200`.

- [x] **Step 5: Eval gate**

In `scripts/eval/run-eval.ts`:

```ts
  const v = snap.stats?.verification as
    | { verdict: string; solverAnswer: string | null; rerun: boolean }
    | null
    | undefined;
  checks.push({
    ok: Boolean(v) && v!.verdict !== "mismatch",
    detail: `verify=${v ? `${v.verdict}${v.rerun ? " (after rerun)" : ""} solver=${v.solverAnswer ?? "—"}` : "not recorded"} checker=${snap.stats?.checkerFlags ?? 0} flags`,
  });
```

- [x] **Step 6: Live run (needs dev server + quota)**

Run: `bun scripts/eval/run-eval.ts alg-linear`
Expected: PASS — `verify=match` (or honestly `incomparable`), `checker=0 flags`, watchableMs not worse than Task 6's run (solver ran in parallel; no mismatch → no rerun).

- [x] **Step 7: Commit**

```bash
git add src/lib/video-jobs.ts scripts/eval/run-eval.ts
git commit -m "Phase C: blind solver verified at merge — conservative compare, one-shot rerun, never blocks delivery

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

### Task 12: Harder fixtures, full eval, docs

**Files:**
- Modify: `scripts/eval/fixtures.ts` (untracked, but the run results are tracked)
- Modify: `CLAUDE.md` (engine + provider paragraphs)
- Modify: `docs/research/phase0-notes.md` (speed findings, if not already appended by Task 3)

**Interfaces:**
- Produces: 2 new fixture IDs (`alg-system`, `calc-improper`); updated CLAUDE.md facts for the next session.

- [ ] **Step 1: Extend fixtures**

Append to `FIXTURES` in `scripts/eval/fixtures.ts`:

```ts
  { id: "alg-system", kind: "solve", question: "Solve the system: x + 2y = 7 and 3x − y = 7" },
  { id: "calc-improper", kind: "solve", question: "Evaluate the improper integral of 1/x² from 1 to infinity" },
```

(`alg-system` exercises multi-part answer comparison; `calc-improper` exercises symbol-heavy answers where `incomparable` is an honest outcome.)

- [ ] **Step 2: Full eval run (quota permitting — backgroundable)**

Run: `bun scripts/eval/run-eval.ts`
Expected: all fixtures PASS or fail with FINDINGS (a mismatch verdict on a fixture whose lesson genuinely got the math wrong is the system WORKING — note it, don't tune it away). Append one-line root causes to the results JSON, commit it.

- [ ] **Step 3: Update CLAUDE.md**

- Provider paragraph: Gemini primary, **Groq fallback** via `src/lib/ai/chat.ts` (failover ladder; short delays; `GROQ_MODEL`/`GROQ_MODEL_LITE`), TTS unchanged (voice has no fallback by design).
- Engine paragraph: add the reviewer (async per-scene review-and-fix, collected at merge ≤8s), the checker (constant-identity numeric checks per scene), the blind solver (t0, conservative Nerdamer compare, one rerun), and the new stats (`watchableMs`, `reviewedScenes/fixedScenes/unreviewedScenes`, `checkerChecked/checkerFlags`, `verification`, `providerHops`).

- [ ] **Step 4: Commit**

```bash
git add CLAUDE.md docs/research/eval-results/ docs/research/phase0-notes.md
git commit -m "Engine v2 B+C shipped: harder eval fixtures + docs; watchable ≤60s path measured

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

---

## Acceptance (definition of done, from spec §9 + handoff)

- **Speed:** `plannerMs` is a number on eval runs (no more dead-planner runs); `watchableMs ≤ 90000` gated, trending to ≤60s; `providerHops` visible; no 42s sleeps anywhere in the chat path.
- **Phase B:** eval shows `reviewedScenes ≥ 1`; the planted bad beat (`EMBER_PLANT_BAD_BEAT=1` run) is corrected — `fixedScenes ≥ 1`, no `2 + 2 = 5` in the delivered script; watchability unchanged vs Phase A (review tail ≤ 8s).
- **Phase C:** the planted wrong equation is caught by unit test (`tests/checker.test.ts`); honest `incomparable` verdicts recorded; a mismatch triggers exactly one rerun then ships flagged; no added watchability latency (solver is parallel; compare is ms).
- **Everything:** `bun test` green; `bunx tsc --noEmit` clean; dev server alive; one real lesson generated and WATCHED by the user before moving on.

---

## Stream U — UX fixes the user asked for mid-session (2026-09-30)

**Recommended execution order overall:** Task 13 → 14 (quick visible wins) →
Tasks 1–3 (speed) → Task 15 (progress % — lands best right after the server
work in Task 3) → Tasks 4–6 (Phase B) → Tasks 7–12 (Phase C).

### Task 13: Kill the horizontal page shift

**Files:**
- Create: `scripts/find-overflow.mjs` (untracked)
- Modify: `src/app/globals.css` (overflow guard) + whatever offender the probe names

The user reports the whole screen can be shifted horizontally — it should not
scroll sideways at all. Nothing in globals.css obviously overflows (the
atmosphere is background-image based), so: probe first, fix the real offender,
then guard.

- [x] **Step 1: Write the probe**

`scripts/find-overflow.mjs` (launch boilerplate copied from `scripts/drive-watch.mjs`):

```js
/* Finds horizontally-overflowing elements on home + watch. Usage: node scripts/find-overflow.mjs */
import puppeteer from "puppeteer-core";

const EXE =
  "C:/Users/Michael/AppData/Local/ms-playwright/chromium_headless_shell-1243/chrome-headless-shell-win64/chrome-headless-shell.exe";

const browser = await puppeteer.launch({
  executablePath: EXE,
  headless: "shell",
  args: ["--disable-gpu", "--mute-audio"],
  defaultViewport: { width: 1440, height: 1000 },
});

async function audit(page, label) {
  const doc = await page.evaluate(() => {
    const d = document.documentElement;
    const offenders = [...document.querySelectorAll("*")]
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className && el.className.baseVal !== undefined ? el.className.baseVal : el.className).slice(0, 90),
        right: Math.round(el.getBoundingClientRect().right),
        width: Math.round(el.getBoundingClientRect().width),
      }))
      .filter((e) => e.right > window.innerWidth + 1 && e.width > 8)
      .slice(0, 15);
    return { scrollW: d.scrollWidth, clientW: d.clientWidth, offenders };
  });
  console.log(`\n=== ${label}: scrollWidth ${doc.scrollW} vs clientWidth ${doc.clientW}`);
  for (const o of doc.offenders) console.log(`  ${o.tag}.${o.cls} right=${o.right} w=${o.width}`);
}

try {
  const page = await browser.newPage();
  await page.goto("http://localhost:3000/", { waitUntil: "networkidle2", timeout: 60000 });
  await page.waitForSelector(".ember-lesson-card", { timeout: 30000 });
  await audit(page, "HOME @1440");
  await page.setViewport({ width: 390, height: 844 });
  await new Promise((r) => setTimeout(r, 800));
  await audit(page, "HOME @390");
  await page.setViewport({ width: 1440, height: 1000 });
  await page.click(".ember-lesson-card");
  await page.waitForSelector(".ember-watch", { timeout: 30000 });
  await new Promise((r) => setTimeout(r, 4500));
  await audit(page, "WATCH @1440");
} finally {
  await browser.close();
}
```

- [x] **Step 2: Run it and fix the named offenders**

Run: `node scripts/find-overflow.mjs`
Expected: prints offenders per page. Fix each named element (usually a missing
`max-w-full`/`min-w-0`/`overflow-hidden` on it or its parent) — do NOT blanket-fix
without fixing the root cause. Then the guard, so it can never regress:

In `src/app/globals.css`, in the base `body`/root layer, add:

```css
/* the studio never scrolls sideways — overflow should be impossible,
   this clip is the guarantee layer, not the fix */
html, body { overflow-x: clip; }
```

- [x] **Step 3: Verify**

Run: `node scripts/find-overflow.mjs`
Expected: `scrollWidth ≤ clientWidth` on all three audits. Then
`node scripts/drive-watch.mjs C:/tmp/ember-shots/u13-watch.png` and a home
screenshot — eyeball nothing clipped that shouldn't be (the chapters column,
pills, footer).

- [x] **Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "UX: the page can no longer scroll horizontally (root offender fixed + clip guard)

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

### Task 14: The resume card floats — it must not push the composer down

**Files:**
- Modify: `src/app/page.tsx:431-440` (ResumeCard wrapper → fixed toast under the header)
- Modify: `src/components/ResumeCard.tsx` (floating-toast styling; show progress % once Task 15 lands)

Today the card renders in-flow above the hero copy inside the centered section,
so the hero + input box get shoved down. Fix: it becomes a floating toast docked
under the header, centered, dismissible — layout never moves.

- [x] **Step 1: Move the card out of the flow**

In `src/app/page.tsx`, replace the in-section block:

```tsx
        {jobStatus && !overlayOpen && jobStatus.id !== watchedJobId && jobStatus.phase !== "error" && (
          <div className="w-full mb-8">
            <ResumeCard
              status={jobStatus}
              onWatch={watchReady}
              onReopen={reopenJob}
              onDismiss={clearJob}
            />
          </div>
        )}
```

with a fixed toast placed right after the `</header>` (still inside `<main>`):

```tsx
      {/* running/finished job — floats under the header; NEVER pushes the page */}
      {jobStatus && !overlayOpen && jobStatus.id !== watchedJobId && jobStatus.phase !== "error" && (
        <div className="fixed left-1/2 top-24 z-40 w-[min(92vw,600px)] -translate-x-1/2 px-4">
          <ResumeCard
            status={jobStatus}
            onWatch={watchReady}
            onReopen={reopenJob}
            onDismiss={clearJob}
          />
        </div>
      )}
```

- [x] **Step 2: Style the card as a floating toast**

In `src/components/ResumeCard.tsx`, change the root div's classes from
`relative mb-6 w-full max-w-xl rounded-2xl border border-[#e6b784]/30 bg-[#e6b784]/[0.07] p-4`
to:

```tsx
    <div
      className="relative w-full rounded-2xl border border-[#e6b784]/30 bg-[#171b1d]/95 p-4 shadow-2xl shadow-black/50 backdrop-blur-xl"
      role="status"
      aria-live="polite"
    >
```

(also drop the now-duplicated `mb-6`/`max-w-xl` sizing — the wrapper owns width).

- [x] **Step 3: Verify with the running app**

Start a generation, click "Come back later" in the overlay → the home page must
show the toast WITHOUT the hero/composer moving a pixel. Screenshot both states
(puppeteer or manual) and compare the composer's Y position. Check it dismisses
via X and doesn't overlap the composer on a short (700px-high) viewport.

- [x] **Step 4: Commit**

```bash
git add src/app/page.tsx src/components/ResumeCard.tsx
git commit -m "UX: resume card floats under the header instead of pushing the composer down

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

### Task 15: Honest progress percentage

**Files:**
- Create: `src/lib/video/progress.ts`
- Create: `tests/job-progress.test.ts`
- Modify: `src/lib/video-jobs.ts` (compute + expose `progressPct`, monotonic; add `boardingStartAt`)
- Modify: `src/lib/use-video-job.ts` (`VideoJobStatus.progressPct`; the 404-expired literal gains `progressPct: 0`)
- Modify: `src/components/GenerateOverlay.tsx` (big % number + bar driven by it)
- Modify: `src/components/ResumeCard.tsx` (show the % while still making)

The user's complaint: the steps are visible but there is no direct, accurate
signal of how far along the video is — and the current bar is step-quantized
(frozen at 6% for the whole director call). Design: a **server-computed,
monotonic, milestone-gated percentage** — phase bands anchored by real events,
time-curving inside each band so it always creeps forward, and it can NEVER
show 100 before the job is `ready` (honesty contract). Pure function + unit
tests; the client just renders it.

- [x] **Step 1: Write the failing tests**

`tests/job-progress.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { advanceProgress, computeWatchProgress } from "../src/lib/video/progress";

const BASE = {
  phase: "directing" as const,
  createdAt: 0,
  scriptStartAt: null,
  boardingStartAt: null,
  scenesTotal: 6,
  scenesDone: 0,
  voicesTotal: 6,
  voicesDone: 0,
  script: null as null,
};

describe("computeWatchProgress", () => {
  test("starts near zero and always creeps forward within a phase", () => {
    const p10 = computeWatchProgress({ ...BASE }, 10_000);
    const p20 = computeWatchProgress({ ...BASE }, 20_000);
    expect(p10).toBeGreaterThanOrEqual(2);
    expect(p20).toBeGreaterThan(p10);
  });
  test("later phases never read lower than earlier bands", () => {
    expect(computeWatchProgress({ ...BASE, phase: "scripting", scriptStartAt: 25_000 }, 40_000)).toBeGreaterThanOrEqual(14);
  });
  test("boarding blends scene count with time creep", () => {
    const half = computeWatchProgress(
      { ...BASE, phase: "boarding", scriptStartAt: 25_000, boardingStartAt: 50_000, scenesDone: 3 },
      60_000
    );
    expect(half).toBeGreaterThanOrEqual(36 + 27 - 0.5); // 3/6 of the 54-point band
    expect(half).toBeLessThan(92);
  });
  test("boarding can never reach the delivered band", () => {
    const p = computeWatchProgress(
      { ...BASE, phase: "boarding", scriptStartAt: 25_000, boardingStartAt: 50_000, scenesDone: 6 },
      200_000
    );
    expect(p).toBeLessThan(92);
  });
  test("delivered (voicing) jumps past boarding and voices fill to 99", () => {
    const v = computeWatchProgress(
      { ...BASE, phase: "voicing", scriptStartAt: 25_000, boardingStartAt: 50_000, scenesDone: 6, voicesDone: 3, script: {} as never },
      120_000
    );
    expect(v).toBeGreaterThanOrEqual(92);
    expect(v).toBeLessThan(100);
  });
  test("only ready is 100", () => {
    expect(computeWatchProgress({ ...BASE, phase: "ready", scenesDone: 6, voicesDone: 6, script: {} as never }, 130_000)).toBe(100);
  });
});

describe("advanceProgress (monotonic guard)", () => {
  test("never decreases", () => {
    expect(advanceProgress(40, 38)).toBe(40);
    expect(advanceProgress(40, 55)).toBe(55);
  });
});
```

- [x] **Step 2: Run to verify it fails**

Run: `bun test tests/job-progress.test.ts`
Expected: FAIL — module does not exist.

- [x] **Step 3: Implement `src/lib/video/progress.ts`**

```ts
/* Honest progress toward "your video is ready", as ONE number.
   Contract (the user asked for honest AND alive):
   - phase bands anchored by real milestones: directing <14, scripting <36,
     boarding <92, voicing <100, ready = 100 exactly;
   - inside a band the value creeps on a decaying time curve, so it is never
     frozen even when the only news is "still working";
   - the scene/voice counters pull it up faster than time alone;
   - it can NEVER read 100 before phase === "ready". */

export interface ProgressInput {
  phase:
    | "directing"
    | "scripting"
    | "boarding"
    | "voicing"
    | "ready"
    | "error";
  createdAt: number;
  scriptStartAt: number | null;
  boardingStartAt: number | null;
  scenesTotal: number;
  scenesDone: number;
  voicesTotal: number;
  voicesDone: number;
  script: unknown;
}

/* decaying approach: ~89% of a band by its expected duration, never quite 1 */
const decay = (t: number): number => 1 - Math.exp(-2.2 * Math.max(0, t));

const EXPECTED_DIRECTOR_MS = 25_000;
const EXPECTED_PLANNER_MS = 30_000;
const EXPECTED_WAVE_MS = 12_000; // one 3-writer wave, generous

export function computeWatchProgress(j: ProgressInput, now: number): number {
  const phaseElapsed = (from: number | null): number =>
    Math.max(0, now - (from ?? j.createdAt));

  if (j.phase === "ready") return 100;
  if (j.script) {
    const voiceFrac = j.voicesTotal > 0 ? j.voicesDone / j.voicesTotal : 0;
    return Math.min(99, 92 + 7 * voiceFrac);
  }
  if (j.phase === "voicing") return 92; // delivered but script not yet on the snapshot
  if (j.phase === "boarding") {
    const sceneFrac = j.scenesTotal > 0 ? j.scenesDone / j.scenesTotal : 0;
    const waves = Math.max(1, Math.ceil(Math.max(1, j.scenesTotal) / 3));
    const timeFrac = decay(phaseElapsed(j.boardingStartAt) / (waves * EXPECTED_WAVE_MS)) * 0.9;
    return 36 + 54 * Math.min(0.999, Math.max(sceneFrac, timeFrac));
  }
  if (j.phase === "scripting") {
    return 14 + 22 * decay(phaseElapsed(j.scriptStartAt) / EXPECTED_PLANNER_MS);
  }
  return 2 + 12 * decay(phaseElapsed(j.createdAt) / EXPECTED_DIRECTOR_MS);
}

/** monotonic guard — progress only ever goes up on a given job */
export function advanceProgress(prev: number, next: number): number {
  return Math.max(prev, Math.min(100, next));
}
```

- [x] **Step 4: Run tests**

Run: `bun test tests/job-progress.test.ts`
Expected: PASS.

- [x] **Step 5: Expose it from the job snapshot**

In `src/lib/video-jobs.ts`:
1. `Job` gains `boardingStartAt: number | null;` and `progressPct: number;` — init `boardingStartAt: null, progressPct: 0,` in `createJob`.
2. Where `job.phase = "boarding"` is set (after the planner), add `job.boardingStartAt = Date.now();`.
3. In `snapshot(job)`, before building the return object:

```ts
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
```

4. `JobSnapshot` and the returned object gain `progressPct: number;`.
5. Import: `import { advanceProgress, computeWatchProgress } from "./video/progress";`

In `src/lib/use-video-job.ts`: `VideoJobStatus` gains `progressPct: number;`, and the 404-expired literal in `pollOnce` gains `progressPct: 0,`.

- [x] **Step 6: Render it — overlay number + bar, resume card**

In `src/components/GenerateOverlay.tsx`:
- Delete the local `overall`/`writerPct` progress math (keep `voicePct`).
- Replace the progress bar's width with `style={{ width: `${Math.round(status.progressPct)}%` }}` and add the number above it:

```tsx
        <div className="mb-2 flex items-end justify-between">
          <span className="font-mono text-2xl font-semibold tabular-nums text-[#f1eee7]">
            {Math.floor(status.progressPct)}%
          </span>
          <span className="text-xs text-muted-foreground">
            {status.phase === "directing"
              ? "planning the lecture"
              : status.phase === "scripting"
                ? "writing the words"
                : status.phase === "boarding"
                  ? "choreographing the board"
                  : "almost ready"}
          </span>
        </div>
```

(the bar div itself stays, now driven by `status.progressPct`).

In `src/components/ResumeCard.tsx`, in the not-ready branch, prefix the status
line with the number and add a thin bar under the card's main row:

```tsx
              <span className="mr-1.5 font-mono font-semibold tabular-nums text-[#e6b784]">
                {Math.floor(status.progressPct)}%
              </span>
```

```tsx
      {!ready && (
        <div className="mt-2.5 h-1 w-full overflow-hidden rounded-full bg-[#23262a]">
          <div
            className="h-full rounded-full bg-[#e6b784]/80 transition-all duration-700"
            style={{ width: `${Math.round(status.progressPct)}%` }}
          />
        </div>
      )}
```

- [x] **Step 7: Verify end to end**

Run: `bun test && bunx tsc --noEmit`
Then with the dev server: start a real generation and WATCH the overlay — the
number must rise continuously (never freeze for >2s during directing/scripting),
jump at milestones (planner done → ≥14, scenes landing, delivery → ≥92), and
never read 100 before playback actually opens. Screenshot for the record.

- [x] **Step 8: Commit**

```bash
git add src/lib/video/progress.ts tests/job-progress.test.ts src/lib/video-jobs.ts src/lib/use-video-job.ts src/components/GenerateOverlay.tsx src/components/ResumeCard.tsx
git commit -m "UX: honest monotonic progress percentage on the overlay + resume card

Co-Authored-By: Claude Code <noreply@anthropic.com>"
```

## Self-review notes (deviations from spec §5, deliberate)

1. **Checker scope narrowed to constant identities.** The spec's "evaluate both sides at 3–5 random sample points" would false-flag every conditional equation line (`2x = 8` is only true at x=4). Constant-only checking has zero false positives; solution-set equivalence via Nerdamer is the natural Phase C2 extension.
2. **Solver launches with the question alone at t0** (spec says "question + subject"). Subject only exists after the director; waiting for it would put the solver on the critical path. Blindness — never seeing the script — is preserved.
3. **Verification may delay delivery by one bounded rerun wave (~10–15s) on a high-confidence mismatch.** "Never blocks delivery" is honored as "never prevents or un-boundedly delays delivery"; shipping a wrong answer is the worse failure.
4. **The eval's watchable gate starts at 90s**, not 60s — today's honest budget ceiling; tighten once the ladder proves itself.

