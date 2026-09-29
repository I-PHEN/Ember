# Ember Engine v2 — architecture design

Date: 2026-09-29
Status: approved shape — spec for phased implementation
Feeds from: docs/research/2026-09-29-multimedia-learning-distillation.md

## 1. Context & goals

The multi-agent video studio is the product's main engine. Today it produces
solve videos via director → transcript planner → scene writers → voice →
merge, with streaming delivery (watchable before voices finish). This design
extends it to:

1. **Explainer videos** on the same engine (concept lessons, not just solves)
2. **University-level rigor** — verified math, richer notation, thinking mode
   where it pays
3. **Enforced pedagogy** — the multimedia-learning research baked into agents
   and deterministic checks, not just prompts
4. **Speed** — watchable in ≤60s for a typical 8–9 scene lesson

Non-goals (unchanged): image upload wiring, accounts/URLs, persistence
(phase F at the earliest), new TTS vendors.

## 2. Design principles

1. **One engine, many lesson grammars.** Solve and explain are the same
   pipeline with different arcs. The director picks the grammar.
2. **The streaming contract is sacred.** Watchable early; every new agent
   runs per-scene in parallel or wholly off the critical path.
3. **Deterministic before LLM.** Any check that can be code, is code.
4. **Every failure has a fallback.** Failed reviewer → scene ships unreviewed.
   Failed solver → no check, video still ships. Failed planner → writers
   self-author (existing ladder).
5. **Measure everything.** EWMA ETAs extend to the new stages; every video
   logs pedagogy metrics (overlap %, prose drops, verification verdicts).

## 3. Pipeline (v2)

```
question ─► INTENT (rules, free) ──► grammar = solve | explain
        ─► DIRECTOR ── outline in grammar + visual plan (per-domain policy)
        │              + terms[] for pre-training
        ─► TRANSCRIPT PLANNER ── whole lecture, arc per grammar,
        │              exactly one misconception moment
        ─► SCENE WRITERS ×N (3 concurrent, staggered)
        │      ├─► voice flush (narration is final the moment the writer
        │      │   lands — BEFORE review; say-tags survive because the
        │      │   reviewer never changes narration)
        │      └─► REVIEWER (async, per scene): prose / density / sync /
        │                 math smell ── returns fixed beats or pass
        ─► SOLVER (from t0, parallel, BLIND: re-answers the question)
        ─► CHECKER (pure Node, ms): numeric step checks + overlap metric
        ─► MERGE → sanitize → compile → deliver at "voicing" (unchanged)
```

Key scheduling insight: narration is canonical from the planner and the
reviewer only ever fixes *beats*, so **voice recording never waits for
review**. Reviews are dispatched async per scene and collected at merge —
review adds ~one small call of tail latency, zero per-wave critical path.

## 4. Lesson grammars

**Solve (existing, refined):** understand → gather → name the ask → plan →
solve one move per scene → check → wrap.

**Explain (new):** hook → core idea in one sentence → analogy → formalize →
one or two mini worked examples → misconception (write it, strike it out) →
recap + where to practice next.

- Explainers invert the ratio: more diagrams (structural content), fewer
  transformation lines.
- `SolveScript` gains `kind?: "solve" | "explain"`; the watch page shows it
  as a chip next to subject.
- Intent routing is rule-based keywords first ("explain / what is / why /
  how does" → explain; "find / solve / evaluate / calculate / determine" →
  solve; default solve). The director may override a clearly-wrong route —
  it sees the question regardless.

## 5. Agent contracts (new/changed)

### INTENT — rules, no LLM
In: question. Out: grammar + confidence. Cost: 0.

### DIRECTOR (changed)
In: question, grammar. Out JSON: `{title, subject, question, kind, scenes:
[{chapter, summary}], terms?: string[] (≤3 unfamiliar terms → pre-training
moment)}`.
Prompt changes: grammar arcs; visual plan promoted from "at most 2, when it
genuinely helps" to a **per-domain policy** — physics → FBD/graph nearly
always; calculus → graph with marked points; algebra inequalities → number
line; explainers → structural diagram by default. Seductive-details rule
stated explicitly: no decorative visuals, ever.
Thinking mode: ON (measured; fallback to disabled if >+15s).

### TRANSCRIPT PLANNER (changed)
In: outline + grammar. Out: per-scene `{script, visualize?, analogy?}`.
Prompt changes: grammar arcs spoken; exactly ONE misconception moment per
video (solve: inside a middle scene; explain: its own scene) written as
"here's what most people try…" so the writer can choreograph
write-wrong-then-strike; pre-training line when `terms` present.
Pacing: solve 80–130 words/scene (existing); explain 70–110 (hook shorter,
recap tighter).

### SCENE WRITERS (minor)
Receive grammar craft notes. New choreography pattern for misconception
moments: write the tempting wrong move (white), red `crossout`, then the
correct line (green), say-tagged to the narration's reveal. No other changes
— they already work.

### REVIEWER (new, LLM, small)
In: chapter, narration, beats (compact JSON), grammar-specific checklist.
Out: `{verdict: "pass"|"fixed", beats?: Beat[]}` — **review-and-fix in one
call**: on flag it returns corrected beats; the fix must still pass the
sanitizer + Checker or the original ships.
Checklist: (1) no prose on board (the deterministic holes are the safety
net; the reviewer is the judge), (2) density — too many beats → erase/trim,
(3) say-tag coverage on write beats, (4) equation lines consistent with the
narration's claims, (5) misconception choreography correct.
Fallback: reviewer failure/invalid output → original beats ship; stats note
`unreviewedScenes++`.
Cost control: if 429 pressure appears, review only Checker-flagged scenes +
a 30% random sample.

### SOLVER (new, LLM, one call, blind)
In: question + subject ONLY (never the script). Out: `{answer, keySteps[]}`.
Runs from t0 in parallel with everything.
Comparison at merge (deterministic only): Nerdamer symbolic equivalence of
solver answer vs the script's final-answer scene (director marks it; boxed
results extracted); fall back to numeric extraction and tolerance compare;
if neither is reliable → `incomparable`, no verdict. Results land in
`job.stats.verification`.
Disagreement (high confidence): one rerun of the solve-chain scenes with
the discrepancy note; still disagreeing → ship + flag in stats. Never block
delivery.

### CHECKER (new, pure Node, no LLM)
Runs per scene as writers land (ms each):
1. **Numeric step check** — for write beats whose text parses as
   `lhs = rhs` on the existing expression parser (pure math only; lines
   with unit characters are skipped), evaluate both sides at 3–5 random
   sample points; mismatch beyond tolerance flags the scene.
2. **Modality-adherence metric** — word-level overlap between beat texts
   and narration per scene (target < ~10% content-word overlap), logged in
   stats and surfaced to the eval harness.
Output: flags + metrics only. Never mutates the script.

## 6. Board-discipline hardening (Phase A detail)

- `isBoardProse`: test prose connectives BEFORE the equation-like bypass;
  close the 5–9 word band conservatively (6+ words, no math, no label
  punctuation, article-heavy → prose). The reviewer is the real judge; the
  heuristic stays a conservative safety net. Tuned against the eval set.
- Fix the misleading log: dropped prose beats are DROPPED (planner words are
  canonical narration; writer-board prose is duplication) — log and count
  honestly, feed `stats.proseDropped`.
- Titles: not prose-checked (legitimate headings) but length-capped.

## 7. Speed budget (8–9 scene solve lesson)

| Stage | Budget |
|---|---|
| Director (thinking on) | 15–25s |
| Planner (thinking on) | 18–30s |
| Writer waves (3 concurrent) | ceil(N/3) × ~10s ≈ 30s |
| Review tail (async, post-wave) | +3–6s into merge, not watchability |
| Solver / Checker / voice | parallel / ms / streaming (unchanged) |
| **Watchable** | **~50–75s, target ≤60s** |

If thinking mode blows the budget, director keeps it and planner drops it
(planner words are reviewable; director structure errors are not).

## 7b. Speed & token engineering (research-grounded)

Findings that shape the implementation:

- **Prompt caching** (arXiv 2601.06007; Anthropic/Redis guides): 41–80% cost
  reduction, 13–31% faster time-to-first-token — but only when prompts keep
  **stable prefixes** with dynamic content at the end. Our SDK exposes no
  explicit cache API, but provider-side prefix caching rewards the same
  discipline. → **Restructure writer/director/planner prompts: the entire
  static contract (persona, rules, beat-type reference) FIRST, dynamic
  content (outline, scene slice) LAST.** Today `writerPrompt` interleaves
  the outline into the middle — fix in Phase A. All N writer calls then
  share an identical multi-KB prefix.
- **Model routing / cascades** (FrugalGPT 4–98× cost reduction; COREA,
  RouteLLM): route easy work to cheap/fast models, escalate on confidence.
  → Build a **per-role routing table** into the orchestrator (config, not
  hardcoded): director/planner/solver = reasoning tier (thinking on);
  writers/reviewer = speed tier. The SDK accepts a `model` param; which
  models the account exposes gets probed in Phase 0 before we rely on it.
- **Structured output reliability** (production postmortems; repair-layer
  literature): JSON mode alone doesn't guarantee schema conformance;
  **repair-before-retry beats naive retries** — we already have a strong
  repair layer (`extractJson`: fence stripping, bracket matching,
  truncation closing) plus coercion normalizers. → Formalize the ladder:
  repair → normalize → retry with reminder suffix (current behavior, now
  specified as a rule).
- **Context minimization**: every agent gets exactly what its job needs —
  writers: outline + own scene slice; reviewer: own scene ONLY (no
  outline); solver: question only. No agent ever sees another's full
  output. (Already the design; restated as a rule.)
- **Token budgets** (enforced by prompts, measured by evals): outline
  ≤3.5KB; transcript ≤9KB; scene beats ≤3KB; reviewer output ≤3KB. The
  eval harness records actual in/out tokens per stage per fixture.
- **SDK capabilities confirmed** (from the .d.ts): `model` param,
  `thinking` toggle, `stream`, **`createVision` (multimodal — the path for
  the future image-upload phase)**, built-in `web_search`/`page_reader`
  functions (noted for solver's factual lookups later — not core for
  math), TTS voice/speed.

## 8. External tools — decisions

- **Nerdamer**: in-process JS CAS for symbolic equivalence (Solver compare,
  later step verification). Adopted in Phase C.
- **mathjs / existing expr parser**: numeric spot-checks. Adopted in Phase C.
- **Eval harness** (promptfoo-style or hand-rolled fixtures): golden
  questions with assertions — pipeline completes, JSON parses, zero prose
  beats past the Checker, say-coverage ≥ threshold, overlap < threshold,
  verification verdict recorded. Built in Phase A; run manually against dev
  (live API), never in CI.
- **Zod** (already a dep): optional formalization of beat contracts later.
- **Prisma**: job persistence — Phase F only.
- **Rejected: LangChain/AutoGen/CrewAI** — the purpose-built orchestrator
  already beats generic frameworks at this scale; frameworks would add
  abstraction without adding streaming overlap, EWMA ETAs, or degradation.

## 9. Phase plan (each independently shippable, user checks after each)

**0 — Capability probe (half a day, no product change)**
One-off script: which models the account can call via `model` param (and
their speed/thinking behavior); whether any implicit prefix caching is
observable (timing repeated stable-prefix calls). Output: the routing
table's real values. Everything below degrades gracefully to
single-model if the probe finds only one.

**A — Discipline & measurement** (+A2 canvas integrity)
`isBoardProse` hardening; honest drop logging + `stats.proseDropped`;
overlap metric in Checker-lite form (no equation checks yet); eval harness
with 5 solve + 1 explain fixture questions. A2, from user-reported
defects: freebody block labels measure against their blocks (the "5 kg
bigger than the box" bug); fraction/table/numberline gain collision
clearance; a post-compile layout audit reports overlaps/overflow into
`stats.layoutViolations` (PFLP literature: measure, displace, verify).
*Done when:* fixtures run green; fixture transcripts show zero prose beats
and overlap under threshold; logs/stats honest; `layoutViolations === 0`.

**B — Reviewer**
Review-and-fix agent per scene, async dispatch, collect at merge; fallback
ladder; 429 cost-control sampling; stats `reviewedScenes/unreviewedScenes`.
*Done when:* eval fixtures show flagged scenes get fixed beats; a forced
bad beat is corrected; watchability unchanged vs A.

**C — Verification**
Solver agent + blind compare; numeric step checks; Nerdamer equivalence;
`stats.verification`; discrepancy rerun path. UI badge deliberately later.
*Done when:* a planted wrong equation is caught in fixtures; honest
incomparable cases recorded as such; no added watchability latency.

**D — Explainers**
Intent rules; director/planner grammar #2; `kind` on script + UI chip;
misconception choreography pattern; one explain sample lesson on the home
page.
*Done when:* "explain why…" fixture routes to explain grammar and produces
a coherent explainer; solve fixtures unchanged.

**E — Visualization**
Area shading under/between curves on `graph`; per-domain visual policy in
prompts (raise/replace the "at most 2" cap); geometry canvas (labeled
triangles) if time-boxed work allows; charts-from-tables after.
*Done when:* calculus fixture shades an integral region; physics fixture
draws an FBD by default; no decorative visuals appear.

**F — Persistence** (separate decision)
Prisma job records; restart survival; resume across deploys.

## 10. Risks

- **Reviewer cost under rate limits** → sampling fallback (5.4) is designed
  and waits in reserve.
- **Solver false alarms on ambiguous questions** → comparison is
  conservative; only high-confidence mismatches trigger reruns.
- **Thinking-mode latency** → per-stage budgets with a defined demotion
  order (planner first).
- **Eval harness depends on live API quota** → manual runs, small fixture
  set, results cached as JSON artifacts.
- **Prompt churn across phases** → every phase lands with its fixtures
  green before moving on; no phase changes prompts without re-running them.

## 11. Out of scope (explicit)

Image upload wiring, accounts/share URLs, TTS vendor change, video file
export (mp4), UI verification badge (follows Phase C), persistence beyond
Phase F's definition.
