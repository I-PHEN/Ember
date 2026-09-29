# Research digest — multimedia learning → Ember's agent architecture

Date: 2026-09-29
Status: living document — more research incoming; nothing here is implemented yet.
Source: user-provided research brief (Mayer's multimedia principles, cognitive
load theory, skeletal-notes framework, agent orchestration patterns) + code
audit of the current pipeline.

## 1. What the research prescribes (condensed)

- **Modality**: narration carries explanation; board shows minimal text.
  Spoken words + visuals beat on-screen text + visuals.
- **Redundancy**: duplicating narration as board prose hurts learning.
- **Skeletal notes**: board = terms, formulas, steps, diagrams — never
  sentences. Teacher speaks the elaboration.
- **Signaling**: color/arrows/verbal cues direct attention.
- **Segmenting**: 2–4 min learner-paced segments.
- **Pre-training**: define key terms before the main lesson.
- **Misconceptions**: explicitly state and debunk common wrong thinking.
- **Narrative arc**: hook → core idea → analogy → worked example (thinking
  verbalized) → misconceptions → summary + practice.
- **Review agent**: enforce the principles in code, with a draft → critique →
  revise loop.
- **Key insight**: the winning systems manage cognitive load precisely; they
  are "a digital replication of the master teacher's brain, not a video
  generation engine."

## 2. Mapping: research → current Ember

| Principle | Ember today | Verdict |
|---|---|---|
| Modality | say/write contract; planner = full lecture, board = skeleton | core, keep |
| Redundancy | say-tag sync; `isBoardProse` safety net | leaks — see §3 |
| Signaling | marker color grammar, circle/box/underline/crossout | strengthen verbal cues |
| Segmenting | scenes/chapters ≤14, pause-and-predict | compliant |
| Dual coding / sync | say tags = synchronization agent | core, keep |
| Active processing | one pause-and-predict per video | compliant |
| Pre-training | "gather what's given" scene (partial) | gap → term definitions scene 0 |
| Misconceptions | none | gap → planned wrong-move + strike-through |
| Weeding | none | gap → reviewer checks board density |
| Review loop | single-pass, no QA | main architectural addition |
| Math correctness | none | gap → open research (§6) |
| Visualization | rich primitives, conservative policy | gap is policy — see §4 |

## 3. Board discipline (the observed defect)

User observed real generations writing explanations on the board. Audit of
the three existing layers (prompt rule, `isBoardProse`, say-tags) found:

1. **5–9 word gap**: `words < 5` always passes; ≥10 wordy lines are caught;
   a 6-word connective-free math-free sentence passes.
2. **Equals-sign bypass**: any line containing `= ≤ ≥ ≠ ≈` is treated as an
   equation before the prose test — prose containing an equals sign passes.
3. **Titles are not prose-checked** (may be acceptable — headings are
   legitimate, but cap length).
4. **Dropped prose is not actually moved to narration** despite the log
   claiming it — the words vanish (prompts.ts planned them as speech or
   board; if board, they are lost). Decide: append to narration vs drop.

Enforcement ladder to design (cheapest first):
- deterministic: close the heuristic holes; add an audio-visual overlap
  metric (n-gram overlap of beat text vs narration — the research's
  "modality adherence <10% redundant text" is automatable)
- reviewer agent: per-scene LLM check (prose? density? sync?) with ONE
  targeted revision, inside the streaming wave
- evaluation: log overlap % per video as a production metric

## 4. Visualization as a core part

Existing primitives (engine already draws these): `graph` (expression
plotter, marked points), `freebody` (incline + block + labeled force
arrows), `numberline` (hops), `table`, `arrow`, `fraction`, emphasis beats.

Gaps:
- **Policy**: planner cue is optional and capped at ~2 scenes/video —
  research says spatial/temporal/causal content should DEFAULT to drawn.
  Decision framework to adopt: visualize when it reduces load or conveys
  structure words can't; never decorate (weeding).
- **Coverage**: no geometry (triangles/angles), integral area-shading on
  graphs (verify engine support), circuits, charts-from-data, chemistry
  structures, vector diagrams.
- **Pre-training visual**: term + tiny diagram in scene 0.

## 5. Architectural sketch (streaming-safe review loop)

```
writer lands scene i
   └─► REVIEWER (1 small call): prose? density? sync? math smell?
          ├─ pass  ──► voice flushes for scene i (as today)
          └─ flag ──► ONE targeted revision (writer + notes) ──► accept best
```
Per-scene, parallel, no serialization of the pipeline; watchability timing
essentially unchanged.

## 6. Research findings — math verification (2026-09-29)

Literature:
- **Self-consistency / majority voting** (Wang et al. lineage): sampling
  multiple reasoning paths and voting recovers **+5–15 accuracy points** on
  GSM8K/MATH vs single-sample decoding; newer variants (ranked voting,
  mirror-consistency) improve selection and calibration.
- **Programs as verifiers** (PAL, Gao et al. 2022; PoT, Chen et al. 2022;
  "Not All Votes Count", 2024): offloading computation to an executor beats
  chain-of-thought with the SAME model (PAL 72.0% vs CoT 65.6% on GSM8K),
  and using generated programs AS VERIFIERS beats majority voting. The
  pattern that works: don't ask the model "is this right?" — make the check
  EXECUTABLE.
- **Step-wise formal verification** (MATH-VF: Formalizer + Critic;
  agentic tool-flow with SymPy + exact rationals): formalize each step,
  verify symbolically — strongest guarantees, heaviest machinery.

JS/TS feasibility (our stack is Node, not Python):
- **Nerdamer**: most complete JS CAS (expand/factor/simplify/GCD, solve,
  diff, integrate). Equivalence = simplify(a) − simplify(b) ≡ 0.
- **Algebrite**: solid alternative CAS in TS.
- **mathjs**: weaker symbolically, excellent numeric evaluator.
- Robust hybrid: symbolic simplify-compare + **numeric spot-checks**
  (evaluate both sides at several random points — catches nearly all
  non-equivalence the symbolic path misses, fully deterministic).

### Recommendation (tiered, streaming-safe)
- **Tier 1 — deterministic, always on, ~zero cost**: numeric verification
  of equation steps. Writers (or a light post-pass) emit a machine-checkable
  payload per scene — `{lhs, rhs, samplePoints}` — evaluated in Node.
  Mismatch flags the scene.
- **Tier 2 — one independent re-solve per video**: a SOLVER agent answers
  the question from scratch (never sees the script's answer); compare final
  answers. Runs parallel to the writers — zero added critical-path latency.
  Disagreement routes scenes into the revision loop.
- **Tier 3 — escalation** (later): symbolic step verification via Nerdamer
  for algebra scenes; full formalization is out of scope for now.
- Trust story becomes honest: "every lesson is checked" = Tier 1 + 2.

## 7. Research findings — visualization (2026-09-29)

Literature:
- **Meta-analysis** (Schoenherr et al. 2024): external visualizations have
  positive and LASTING effects on math learning → structure-carrying
  visuals should be closer to DEFAULT than garnish.
- **Animation vs static** (Mayer 2005 static-media hypothesis; Berney &
  Bétrancourt 2016; Daly 2016 "illusion of understanding"): animation is
  NOT automatically superior; it wins under two conditions — segmentation
  and learner control — and when it shows transitions that statics cannot.
  **Ember's progressive hand-drawn build synced to narration is exactly
  this winning pattern**; gratuitous motion is the failure mode.
- **Seductive details effect** (González et al. 2019; Scharinger et al.
  2023/2024): decorative but irrelevant images measurably WORSEN
  comprehension, strongest for low-working-memory learners → the weeding
  rule is not taste, it is evidence.
- **Spatial reasoning ↔ math** (Bates et al. 2023; Lowrie et al. 2019):
  diagram use for concept development is the effective register.

### Recommendation — visualization policy
Draw when the content is **spatial** (FBDs, geometry, behavior graphs),
**temporal** (processes, number-line hops), or **structural** (tables,
trees, flows). Never decorate. Build progressively, synced to narration,
segmented. Domain defaults: physics → FBD/graph nearly always; calculus →
graph with marked points (and area shading once built); algebra → number
line for inequalities/operations. Raise the planner's "at most 2 scenes"
cap to a per-domain policy (e.g. physics 3–4 visuals).

### Recommendation — primitive priority
1. **Area shading under/between curves** on the existing `graph` beat
   (integral scenes — the single highest-value addition for Calc).
2. **Geometry canvas**: labeled triangles/angles/segments (trig, statics).
3. **Charts from data**: bar/line rendered from the existing `table` beat.
4. Later: slope fields/vectors (ODEs), circuits, chemistry structures.

## 8. Open research questions (remaining)

1. Misconception beats: does "write the wrong way, strike it out" read as
   teaching or noise? Needs storyboard test (`crossout` exists).
2. Pacing: pause beats (`wait` exists) — placement policy after dense
   visuals; can TTS respect pauses?
3. Persona: prompts still say Professor Ada (deep rename pending); does
   thinking-disabled mode cap narration quality enough to matter?
4. Narration length: `cleanNarration` caps at 600 chars but planner writes
   80–130 words (~up to ~800 chars) — verify truncation behavior.
5. Evaluation: modality-adherence metric is automatable now; what else can
   we measure without users in the loop?

## 9. Deliberately out of scope (for now)

Image upload wiring, job persistence (Prisma), accounts/URLs, evaluation
with real learners. Revisit after the pedagogical core lands.
