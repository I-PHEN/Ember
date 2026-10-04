# Local speech alignment

Keeps the synthesized voice unchanged. Stable-ts aligns the exact audio bytes
against the exact narration text and returns measured word intervals. The first
supported language is English. This is forced alignment, not an independent
check that the speaker pronounced every mathematical expression correctly.

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

Word timestamps must cover the entire normalized transcript, remain ordered and
fit inside the audio. Invalid intervals and low-probability results are rejected.
The player maps authored phrase anchors to measured word boundaries and scales
them for playback speed. It does not fabricate missing word timestamps.

## Verification

`bun test` includes process-protocol, validation and response/cache tests using
fixtures. `TEST_ALIGNED_AUDIO=1` enables the measured-timestamp scenario in
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
removed in newer PyAV releases. The October 4 real Gemini sample decoded after
this fix, but base.en produced invalid word spans and the live acceptance test
failed. Local installation alone does not establish production alignment quality.
