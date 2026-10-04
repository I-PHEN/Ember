# Local speech alignment

Keeps the synthesized voice unchanged. The installed Faster-Whisper base.en model
recognizes the exact audio bytes and returns candidate word intervals. Both Node
and the browser require full transcript equivalence before using any timings.
The first supported language is English. No larger model download is needed on
the development machine; a new deployment still needs the base model installed.

## Setup

From the repository root, with uv and Python 3.11–3.13 installed:

```powershell
uv sync --project workers/alignment --python 3.13
workers/alignment/.venv/Scripts/python.exe workers/alignment/setup_model.py
```

On Linux use `workers/alignment/.venv/bin/python` for the second command.
Setup downloads dependencies and the base.en model; allow several hundred MB
of disk space. Runtime never downloads a model. Run setup under the same user
and model-cache configuration as the application.

## Deployment

This requires a long-lived Node server capable of spawning Python, not an Edge
runtime. Include this worker directory in the deployment, install its locked
dependencies on the target OS, and pre-download the model there. Do not copy a
Windows virtual environment into Linux or assume Next standalone tracing bundles
the Python environment/model. Each Node process owns its own worker and model.

Optional environment variables:

- `EMBER_ALIGNMENT_DIR`: absolute path to this directory (default resolves from server cwd).
- `EMBER_ALIGNMENT_PYTHON`: absolute Python executable override.
- `EMBER_ALIGNMENT_MODEL`: installed Faster-Whisper model name/path (default `base.en`).
- `EMBER_ALIGNMENT_ENABLED=false`: disable alignment while preserving audio.

The worker uses CPU int8 with two threads, a 30-second request deadline and a
60-second idle shutdown. Cold model loading counts toward the deadline. Missing
dependencies/model, malformed output or timeout preserve playable audio with an
explicit failure status. That status is cached with the audio; restart the server
after installing a missing model to clear cached unavailable results.

Recognition is marked `recognized`, not whole-track `aligned`. Candidate spans
must cover the entire transcript, be finite, ordered, nonnegative and inside the
audio. Normalization supports English zero through nineteen versus digits and
compound spans such as `2x`; it does not accept homophones, fuzzy substitutions,
omissions or missing mathematical signs. Unsupported number formats fall back.

Only action phrases whose constituent spans have positive duration and probability
at least 0.15 are accepted. A suspect word outside every action phrase does not
discard otherwise usable phrases. If any authored anchor cannot be validated,
the scene uses duration-only timing. Probabilities are heuristic filters, not
calibrated accuracy guarantees. No compound span is split or missing duration
invented. Playback-speed scaling happens once, after mapping the measured phrase.

## Verification

`bun test` includes process-protocol, validation and response/cache tests using
fixtures. `TEST_RECOGNIZED_AUDIO=1` enables the recognition timing scenario in
`tests/player-timing.browser.mjs`. Neither substitutes for listening to real
generated narration and inspecting board synchronization.

For a real-audio diagnostic, synthesize this exact transcript with the configured
voice and save the WAV locally:

> A matrix is a rectangular arrangement of numbers. This matrix has two rows and
> three columns. We write its dimensions as two by three. To locate an entry,
> choose the row first, then the column.

```powershell
bun tests/speech-alignment.live.ts .next/alignment-matrix.wav
```

The diagnostic does not call a provider or regenerate audio. It checks the
production 30-second deadline, full transcript coverage, four measured phrase
anchors and reuse of the worker. It saves the measured words, phrase windows and
cold/warm latency beside the WAV as `.alignment.json`. Its ink durations are
synthetic: passing is not evidence of good board layout or natural pen movement.

Run the decoder compatibility regression separately (no model download needed):

```powershell
workers/alignment/.venv/Scripts/python.exe workers/alignment/test_audio_decode.py
```

PyAV is pinned because Faster-Whisper 1.2.1 uses the `metadata_errors` argument
removed in newer PyAV releases. The earlier forced-alignment experiment failed
on real audio. Recognition-based phrase timing passed the three-sample Gemini
benchmark (16 action phrases) and the browser playback smoke test. This does not
establish accuracy for all STEM topics or replace a human listening review.

Run all local samples with `bun tests/alignment-benchmark.live.ts scratch/alignment`.
Set `TEST_REAL_RECOGNITION_DIR=scratch/alignment` when running
`tests/player-timing.browser.mjs` to use the real WAVs and saved benchmark output.
Restart an already-running server to clear cached failed alignment artifacts after
upgrading the worker.
