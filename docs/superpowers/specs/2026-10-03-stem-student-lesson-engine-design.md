# STEM student lesson engine — design

Date: 2026-10-03  
Status: approved direction; ready for written-spec review  
Audience: independent university and introductory-college STEM students. High-school adaptation and institution-facing delivery come later.

## 1. Product decision

Ember is a student learning product, not a generic video generator. A student gives it a STEM question or concept and receives a short, rigorous, interactive board lesson that makes the reasoning visible and asks the student to think at meaningful decision points.

Organic Chemistry Tutor, strong university lecturers, and MIT-style worked-example teaching are references for clarity and pacing only. Ember must develop its own voice, visual vocabulary, handwriting assets, and lesson grammar; it will not imitate a creator's identity, exact delivery, or edits.

The engine's primary contract is: **the audio timing is authoritative; board actions are compiled to the measured speech windows; no playable scene drifts after it starts.**

## 2. Scope and non-goals

### In scope

- University/intro-college STEM: mathematics, physics, chemistry, and entry-level engineering/computing concepts.
- Student-facing solve and explain lessons.
- Active micro-interactions: prediction, self-explanation, and retrieval prompts with feedback.
- A deterministic, hand-drawn board renderer with a distinct Ember stroke library.
- Correctness, pedagogy, audiovisual, and layout quality gates.
- An immutable lesson artifact model that can later be exposed by an API.

### Explicitly deferred

- High-school lesson adaptation, standards mapping, and guardian/teacher controls.
- Institution tenancy, SSO, LMS/LTI integration, billing, SLAs, and public API keys.
- Real-time collaborative classrooms and human-tutor handoff.
- General humanities, essay, language, or long-form lecture generation.
- Video-export infrastructure; the first product remains a seekable interactive web lesson.

## 3. Research commitments encoded as product behavior

The architecture makes instructional principles executable rather than leaving them as prompt suggestions.

| Evidence | Product rule |
|---|---|
| Segmenting, pretraining, and modality reduce essential overload in complex multimedia lessons (Mayer, 2012). | A lesson starts with the minimum prerequisite vocabulary/model; narration carries explanations while the board carries notation and structure; scenes are learner-paced. |
| Undergraduate STEM active learning improves assessment performance and lowers failure rates relative to traditional lecture (Freeman et al., 2014). | Every lesson has at least one decision-point prediction and a feedback/reveal; the player records attempts locally. |
| ICAP predicts deeper learning as students move from passive to active to constructive engagement (Chi & Wylie, 2014). | Prompts request a prediction or explanation, not a decorative click or a passive "continue". |
| Worked examples are efficient for early procedural learning, before students are asked to solve independently. | Each new procedure uses a subgoal-labeled example, then a faded next step or transfer check. |
| Speech marks/timepoints can provide timestamps for synthesized speech. | A production voice provider must emit phrase anchors, or a forced-aligner must create an equivalent timing track before a lesson can receive the synced-quality label. |

Sources: [Mayer](https://www.cambridge.org/core/books/abs/cambridge-handbook-of-multimedia-learning/principles-for-managing-essential-processing-in-multimedia-learning-segmenting-pretraining-and-modality-principles/4110A2275F6DCD02DAB1F8B37BA7E5CE), [Freeman et al.](https://pmc.ncbi.nlm.nih.gov/articles/PMC4060654/), [ICAP](https://education.asu.edu/sites/default/files/lcl/chiwylie2014icap_2.pdf), [Google Cloud timepoints](https://docs.cloud.google.com/text-to-speech/docs/ssml), [Amazon Polly speech marks](https://docs.aws.amazon.com/polly/latest/dg/output.html).

## 4. Core lesson grammar

The lesson director selects one of two STEM grammars. A grammar is a typed sequence of instructional functions, not a cosmetic template.

### Solve grammar

1. **Orient:** identify the target, relevant givens, and governing representation.
2. **Plan:** name the subgoals and choose a principle, equation, diagram, or algorithm.
3. **Worked move(s):** one legitimate transformation or inference per segment; say why it is allowed.
4. **Prediction:** pause immediately before a non-trivial choice.
5. **Reveal and misconception:** contrast the tempting wrong move with the correct constraint.
6. **Check:** verify units, limiting cases, substitution, sign, or physical plausibility.
7. **Transfer:** give the next-step variation the learner could attempt.

### Explain grammar

1. **Hook and goal:** state the phenomenon or question in ordinary language.
2. **Pre-train:** define at most three terms and, where valuable, draw a compact structural visual.
3. **Mental model:** analogy only when it preserves the domain constraint.
4. **Formal model:** notation, assumptions, and a structure-carrying diagram.
5. **Mini worked example:** derive one concrete consequence.
6. **Misconception:** show the tempting model, explain precisely why it fails, and replace it.
7. **Retrieval/transfer:** student predicts a nearby case, then receives feedback.

Both grammars require an explicit learning objective and prerequisite check. A lesson may not claim mastery; it may say what the student can now explain, calculate, sketch, or test.

## 5. Artifact contracts

Typed artifacts replace loose JSON that mixes teaching, timing, and drawing decisions.

```text
LessonBrief
  question, domain, learnerLevel, goal, constraints, requestedGrammar

LessonPlan
  objectives[], prerequisites[], misconceptions[], segments[]
  segment: { id, function, subgoal, narrationIntent, visualIntent, learnerAction }

NarrationScore
  segments[] → phrases[]
  phrase: { id, segmentId, exactText, purpose, boardAnchorIds[] }

VoiceTrack
  audioUrl, durationMs, phraseTimes[]
  phraseTime: { phraseId, startMs, endMs, confidence, source }

InkIntent
  actions[]
  action: { id, segmentId, anchorPhraseIds[], purpose, semanticPrimitive,
            content, importance, revealPolicy, targetRef? }

InkTimeline
  strokes[] and cues[] with immutable absolute times

LessonArtifact
  lessonVersion, schemaVersion, inputs, plan, score, voiceTrack,
  inkIntent, inkTimeline, checks, renderedAssets, provenance
```

`anchorPhraseIds` replace raw `say` string matching. The compiler can therefore reject an unmatched, duplicated, or out-of-order anchor deterministically.

## 6. Pipeline and scheduling

```text
Brief
  ├─> domain router + lesson director ─> LessonPlan
  ├─> blind subject solver ────────────> independent answer / key constraints
  └─> prerequisite lookup ─────────────> domain context

LessonPlan
  ├─> pedagogy critic ────────────────> approved/revised plan
  └─> narration scorer ───────────────> exact phrase IDs

NarrationScore
  ├─> timed TTS / forced alignment ───> VoiceTrack
  └─> board choreographer ────────────> InkIntent

VoiceTrack + InkIntent
  └─> timing compiler + kinetic ink ──> InkTimeline
       └─> render, AV audit, correctness/pedagogy gates ─> LessonArtifact
```

The director, domain solver, and prerequisite lookup run concurrently. The narration scorer and board choreographer also run concurrently after the approved plan. The timing compiler does not run until it has a measured `VoiceTrack`; this is intentional and prevents timeline mutation after playback begins.

### Streaming rule

Streaming means **the first fully verified segment is playable early**, not that an unsynced whole video appears early. The product can synthesize and compile segment 1 while later voice tracks are produced, but a segment becomes playable only when its voice, timing, layout, and gates are final. The player never silently switches to a different duration or rescales ink after a segment has begun.

## 7. Agent roles and deterministic ownership

Agents advise; deterministic services own contracts.

| Component | Responsibility | Cannot decide |
|---|---|---|
| Domain router | Choose math, physics, chemistry, or computing pack and grammar candidate. | Correctness or final learner level. |
| Lesson director | Create objective-led segment plan and select representations. | Stroke timing or final numerical answer. |
| Pedagogy critic | Score objective coverage, prerequisites, cognitive load, misconception quality, and learner action. Returns targeted revision only. | Re-author the entire lesson. |
| Narration scorer | Write natural spoken text and split it into stable, ordered phrase IDs. | Board geometry or TTS duration. |
| Board choreographer | Produce semantic ink actions tied to phrase IDs. | Exact start/end times or prose explanation on board. |
| Blind solver | Independently solve/derive the question. | See the proposed solution or teach the lesson. |
| Timing compiler | Map semantic actions to measured phrase windows and emit immutable cues. | Invent content or stretch a scene globally. |
| Render auditor | Inspect rendered frame/timeline measurements. | Repair content without a bounded retry. |

## 8. Timed voice contract

The current Gemini path returns audio bytes only. It must be wrapped behind a `TimedTtsProvider` interface:

```ts
interface TimedTtsProvider {
  synthesize(score: NarrationScore): Promise<VoiceTrack>;
}
```

Production quality accepts either:

1. **Native marks:** a provider returns exact SSML/word/phrase marks with audio; or
2. **Forced alignment:** synthesize the final WAV, then align the exact text to it and return phrase times with confidence.

Gemini TTS can remain a voice-quality experiment and supports structured style/pacing metadata, but it is preview-only until paired with alignment. Its `speech_metadata` should describe a single calm, direct, conversational university instructor; point-in-time pauses belong in the narration score, never in unstructured prompt prose.

On failed or low-confidence alignment, a segment is held and regenerated/re-aligned. It does not become a silent or loosely estimated lesson. Preview mode may expose an explicit "timing not verified" state for internal evaluation only.

## 9. Kinetic ink engine

### Ember stroke library

Create original vector trajectories by recording a consenting instructor's or designer's tablet/mouse handwriting. Store stroke order, normalized points, relative velocity, pen-up travel, optional pressure, and alternate glyph variants. Seeded selection yields consistent but non-repetitive writing.

The first library covers Latin letters, digits, arithmetic, Greek symbols, calculus notation, arrows, graph labels, chemistry bonds/rings, and diagram primitives. It is Ember-created data, not a transcription of another educator's handwriting.

### Motion policy

- Long straight strokes are brisk; letter joins, turns, and tight curves slow down.
- Pen-up travel is visibly faster than ink but not instantaneous.
- Each line has a short settle and occasional natural rest; there are no theatrical hand movements.
- The compiler fits an *ink action* into its anchored phrase window. It may choose a compact alternate glyph, split an overloaded action, or request a board revision. It cannot slow the whole scene merely because one phrase is long.
- Target initial ranges are calibrated against captured human traces: readable writing roughly 120–190 board px/s, fast diagram sweeps up to 260 px/s, and bounded slow-down near tight curvature. These are calibration hypotheses, not product constants; telemetry determines final ranges.
- A cue has explicit `inkStartMs`, `inkEndMs`, and `revealMs`. The cursor and rendered ink use the same timeline.

### Board language

The board contains equations, variables, short subgoal labels, diagrams, arrows, highlights, and boxed results. Narration carries prose. Visuals are mandatory when they carry spatial, structural, or causal information; they are prohibited when decorative.

Domain packs define the preferred primitives:

- Math: graphs, number lines, integral regions, geometry, tables.
- Physics: free-body diagrams, vectors, graphs, units and sign conventions.
- Chemistry: molecular/structural diagrams, electron/energy representations, reaction arrows, dimensional analysis.
- Computing/engineering: state traces, data-flow diagrams, tables, pseudocode fragments, circuit/block diagrams.

## 10. Quality gates

Every gate emits measurements into `LessonArtifact.checks`; failures trigger at most one targeted repair and then a transparent internal failure state.

| Gate | Deterministic measurements | Target |
|---|---|---|
| Correctness | symbolic/numeric line checks, units/range checks where possible, blind-solver agreement | no high-confidence contradiction |
| Pedagogy | objective/prerequisite/one misconception/learner-action coverage, subgoal labels | every segment has a teaching function |
| Board discipline | prose classifier, text length, action density, layout collision/overflow | no explanatory sentences; zero severe collisions |
| Timing | anchor resolution, ink-window containment, speech-to-ink lag, cue ordering | 100% required anchors resolved; ≥95% ink duration inside its phrase window |
| Audio | WAV decode, duration, clipping, alignment confidence, WPM distribution | no clipping; confidence above provider threshold |
| Render | canvas frame audit at cue boundaries and final state | no off-board ink, hidden results, or target misses |
| Student value | prediction exists before a meaningful reveal; feedback explains result | no decorative interaction |

## 11. Student experience

The player is segment-first:

- It opens with objective, prerequisites, and estimated duration—not an unexplained generated-video wait.
- The student can play, replay a phrase, slow a segment, reveal after attempting, and ask a timestamped question.
- A prediction prompt pauses only at a decision point. The student can answer, say "show me," or retry; feedback names the governing constraint.
- A recap ends with a retrieval question and a one-step transfer, not a generic motivational sign-off.
- Early learning telemetry is privacy-minimal: segment replay, prediction attempted/revealed, answer correctness where an answer is collected, and explicit "too fast/too shallow" feedback. No learner profiling is required for v1.

## 12. Evaluation and observability

Build a versioned offline benchmark before broad product changes.

### Fixture matrix

- Algebra/calculus: symbolic transformations, graph interpretation, integral area.
- Physics: kinematics, Newton's laws, unit/sign checks, free-body diagrams.
- Chemistry: stoichiometry, equilibrium, organic mechanisms/structures.
- Computing: algorithm trace, complexity, Boolean logic/state transitions.
- Adversarial cases: ambiguous prompt, missing prerequisite, incorrect premise, long formula, overloaded diagram, and multiple valid methods.

### Required evaluation outputs

- Lesson artifact and rendered cue trace.
- Objective and misconception coverage score.
- Correctness verdict with evidence source.
- Phrase-anchor resolution and sync metrics.
- Board density/prose/layout metrics.
- First fully-synced-segment latency and full-lesson latency.
- Student-playback signals once live, aggregated and de-identified.

Human review samples must score clarity, naturalness, correct visual choice, and perceived sync independently; no single model judges its own work.

## 13. API-ready boundary, deferred platform

`LessonArtifact` is immutable, schema-versioned, and replayable from a recorded input, domain-pack version, prompt version, voice configuration, and renderer seed. That enables a future API without exposing current orchestration internals.

The later API layer can offer `POST /lessons`, `GET /lessons/{id}`, timeline/segment retrieval, playback-event ingestion, and webhooks. It will require a separate design for organization tenancy, access control, rate limits, billing, data retention, regional processing, SSO/LTI, and audit logs. None belongs in the student-engine critical path now.

## 14. Migration from the current implementation

1. Preserve existing solve playback and snapshots while introducing typed artifacts behind a feature flag.
2. Separate current writer output into `NarrationScore` and `InkIntent`; retain old beat rendering as an internal fallback only.
3. Introduce `TimedTtsProvider` and capture real duration/marks before compiling any new timeline.
4. Replace raw `say` text matching with phrase IDs; make unresolved anchors a gate failure.
5. Add the timing compiler and renderer measurements before replacing handwriting assets.
6. Add the original Ember stroke library and domain primitives one domain at a time.
7. Turn on the lesson grammar and student prediction player for selected STEM fixtures.
8. Retire old estimated-audio and post-hoc global stretch logic only after benchmark and human-review thresholds pass.

The existing streaming reviewer/solver/checker can remain, but review must occur on semantic intent before TTS, and rendered AV audit must occur after compilation. Review cannot be the timing authority.

## 15. Delivery phases

### Phase 0 — Baseline and contract tests

Add timeline probes for current videos: writing speed distribution, estimated-vs-actual audio drift, anchor coverage, first-ink delay, and scene duration mutation. Freeze representative fixtures and screenshots/audio traces.

### Phase 1 — Semantic score and student grammar

Implement `LessonBrief`, `LessonPlan`, `NarrationScore`, and `InkIntent`; add solve/explain STEM grammars, learning objectives, prerequisites, misconception, and one meaningful prediction. No renderer replacement yet.

### Phase 2 — Timed audio

Implement `TimedTtsProvider`, native-mark adapter or forced-aligner, phrase-ID validation, and immutable per-segment voice tracks. Add provider quality/cost/latency comparison.

### Phase 3 — Timing compiler and AV gate

Compile ink intent against phrase windows; replace post-hoc duration scaling for flagged lessons. Add cue-trace, drift, and rendered-frame audits. Enable only for benchmark fixtures first.

### Phase 4 — Ember kinetic handwriting

Record the original vector library, introduce human kinematics, add chemistry/physics primitives, and A/B review naturalness against the old renderer. Do not claim a real handwriting style until it passes human review.

### Phase 5 — Student player and learning loop

Ship prediction/reveal/feedback, replay controls, concise feedback affordances, and privacy-minimal learning telemetry. Evaluate completion, replay, and explicit depth/pacing feedback.

### Phase 6 — Platform/API design

Only after core lesson-quality targets hold: a separate institution/API specification for tenancy, identity, auditability, billing, and integration.

## 16. Acceptance criteria for the first shippable slice

- A fixture lesson has an explicit objective, prerequisite treatment, one misconception, a worked example, a prediction, feedback, and recap.
- Every visible substantive board action resolves to an ordered phrase ID.
- A `VoiceTrack` contains measured timing for all anchored phrases; no estimated-only timing is labelled production-ready.
- The timing compiler emits immutable cue times before the player exposes the segment.
- No board prose, severe collision, out-of-bounds ink, or high-confidence correctness error is present in the fixture set.
- Human reviewers prefer or find neutral the new kinematic writing versus current writing, and independently rate audio/ink alignment as acceptable.
- The first verified segment remains available within a product-set latency budget; the budget is measured rather than assumed.

## 17. Risks and decisions to revisit

- **Voice quality vs timestamps:** benchmark native-mark TTS against Gemini-plus-alignment before selecting the production provider.
- **Alignment confidence on formula-heavy narration:** normalize spoken forms in the `NarrationScore` and test math/chemistry vocabulary early.
- **Over-agenting:** keep deterministic schemas and gates; do not add a model role unless it owns a unique uncertainty that code cannot resolve.
- **Generative handwriting quality:** start with original captured trajectories and measured human review; avoid unlicensed imitation or an opaque third-party style model.
- **Latency:** favor segment readiness over premature whole-lesson playback. Persist all timing measurements to guide concurrency decisions.
- **Business expansion:** API/platform concerns must not force telemetry, tenancy, or data-retention complexity into the student prototype prematurely.
