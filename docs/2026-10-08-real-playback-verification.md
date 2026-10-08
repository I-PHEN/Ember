# TypeScript and recorded playback verification

## Changes

Gallery JSON is treated as unknown input, accepted only as an object, and its
subject/question fields are checked as strings before filtering. This resolves
the three `never` errors without substituting `any` or disabling type checking.
The production build now performs TypeScript validation.

Paused seeking now updates audio position. Muting keeps the audio decoder and
playback clock running while silencing its output.

The player previously discarded elapsed frame time above 0.1 seconds, while
speech continued running. Slow frames could therefore cause backwards seeks.
The new frame clock retains elapsed time across consecutive runnable frames,
excludes loading/paused intervals, and starts each scene's audio only after its
clock has started. Review identified and resolved both loading-to-ready jumps
and a scene-boundary rewind edge case.

## Browser evidence

Tested the actual `SolvePlayer` with the existing local matrix/equation WAVs and
their saved `base.en` word recognition results. The local harness intercepts
only narration requests with those recordings and rejects unexpected requests;
no new speech generation, model downloads, or authentication changes were used.

- Matrix audio: 11.966375 seconds; scene duration: 12.466375 seconds.
- Equation audio: 14.606375 seconds; scene duration: 15.106375 seconds.
- Both plans reported measured (`aligned`) timing and `fits`, with no issues.
- Paused seek to five seconds set the real audio element's current time to five.
- Muted speech continued playing at 1.25 times speed; scene handoff activated
  the equation recording and paused the matrix recording.
- After the final clock refinement, a deliberate 650 ms main-thread stall
  advanced real audio from 7.087796 to 7.9361 seconds, rather than rewinding it.
- Inspected progressive drawing and the completed two-by-three matrix in the
  browser. Backward seeking reconstructed the board from its timeline.

This establishes real media playback and scheduling behavior. It does not
establish expert approval of narration quality or the teaching quality of the
three planned starter lessons. Those recordings remain a separate deliverable.

## Reproduce locally

Requires the existing ignored `scratch/alignment/{matrix,equation}.wav` and
`base.en.benchmark.json`, plus production CSS from a completed Next.js build.

```powershell
bun build tests/real-playback.tsx --target browser --outfile scratch/real-playback.js
node tests/real-playback-server.mjs
```

Open `http://localhost:3020/`. This runs the production player in a local QA
shell with play, seek, speed, mute and slow-frame controls. Recordings are not
committed by this change. Stop/restart the QA server after rebuilding Next.js
if its CSS changes; do not start it while the build is replacing `.next`.

## Verification

- Full Bun suite: 199 passed, 0 failed, 2043 assertions.
- Focused ESLint and whitespace checks passed.
- Production webpack build passed with TypeScript validation enabled and no
  TypeScript errors; `ignoreBuildErrors` has been removed.
- Independent review approved the final clock/audio handshake.
