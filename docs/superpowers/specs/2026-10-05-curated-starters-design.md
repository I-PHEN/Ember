# Three ready-to-play STEM starters

## Approved product choices

The user selected matrices, integration by parts, and forces on an incline.
The user selected saved scripts, audio, and timing data, rather than fresh AI
calls when a judge presses Play. These are curated lessons in the existing
starter section, not public gallery submissions or claims of flawless AI output.

## Lessons

1. **Reading matrices:** A = [[2,7,-4],[6,3,5]], dimensions 2 by 3,
   row-first indexing, a23=5, why a32 is undefined, and a12=7 as a practice check.
   Keep A visible and point to its rows, columns, and cells.
2. **Integration by parts:** integrate x exp(2x). Explain why differentiating x
   simplifies the remaining integral and why v=exp(2x)/2. Derive
   exp(2x)(x/2−1/4)+C and verify by differentiation. LIATE is a heuristic, not
   a universal rule; avoid the existing sample's overgeneralizations about
   products of different function types. Include a pause to predict du and v.
3. **Forces on an incline:** a 5 kg block already sliding down a 30-degree incline,
   kinetic friction coefficient 0.20, g=9.81 m/s². Draw weight, normal force,
   and uphill friction; choose downhill positive. Derive N=mg cos(theta) and
   a=g(sin(theta)−mu cos(theta))≈3.21 m/s² downhill. State the sliding assumption
   so kinetic friction is not confused with the static-friction threshold.

Each lesson targets roughly 3–5 minutes, subject to measured audio and readable
writing pace. Do not pad a lesson merely to meet duration.

## Packaging and playback

Use the existing seekable canvas player and starter cards. Store versioned,
reviewed lesson scripts and a manifest mapping each exact narration/voice to
local audio and validated timing metadata. Serve these as app assets; starter
playback must not request an LLM, TTS, or alignment provider. No separate MP4
export is required for this checkpoint.

Select the packaged track only when the script and narration match its manifest.
Edits or newly generated lessons retain the normal narration path. Missing or
corrupt starter assets show an explicit playback error/retry, not a surprise
billable generation. Assets are lazy-loaded by lesson and scene; show loading
feedback. Source scripts, manifest, and media are committed together. Do not
embed provider keys or raw provider responses in public files.

## Release gate

- Independently check equations, assumptions, units, answers, and explanations.
- Verify every board action and speech anchor; flag duration-only alignment
  rather than calling it measured phrase alignment.
- Render and inspect beginning, worked steps, practice, and ending at desktop
  and narrow width. Check clipping, collisions, retained context, highlights,
  and chapter seeks after audio loads.
- Play each lesson end to end and perform listening review for pronunciation,
  missing words, distracting pauses, pacing, and synchronization. Do not claim
  acoustic review from screenshots or unit tests; obtain user listening review
  when the environment cannot provide audio perception.
- Provide an actual thinking pause before revealing each practice answer.
- Verify starter playback makes zero provider calls, works with provider
  credentials absent, and handles missing assets explicitly.
- Publish into the curated starter array only after the individual lesson passes
  its checklist. Record evidence and remaining limitations in a release report.

## Alternatives

Live generation keeps fewer assets but introduces latency and provider risk.
Static MP4 files are portable but lose the current board-player integration and
are a separate export workflow. Versioned local scripts/audio/timing fit the
existing product and the user's approved ready-to-play requirement.

## Scope boundaries

No new branding, subscriptions, institution API, or public gallery publication.
No guarantee of perfection. The release criterion is explicit review evidence,
and no known blocking defect in any of the three judge-facing lessons.
