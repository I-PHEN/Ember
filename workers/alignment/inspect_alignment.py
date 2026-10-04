"""Offline diagnostic only: retains rejected spans for inspection, never serving them.

Usage: python workers/alignment/inspect_alignment.py small.en scratch/alignment [transcribe]
This intentionally has no production deadline so model quality and deployment
latency can be diagnosed separately. Models must already be installed.
"""
import json
from pathlib import Path
import sys
import time

started = time.perf_counter()
import stable_whisper
from faster_whisper import WhisperModel
from faster_whisper.audio import decode_audio

model_name, audio_directory = sys.argv[1:3]
transcribe = len(sys.argv) > 3 and sys.argv[3] == "transcribe"
directory = Path(audio_directory)
samples = json.loads((Path(__file__).resolve().parents[2] / "tests/fixtures/alignment-stem.json").read_text(encoding="utf-8"))
loader = WhisperModel if transcribe else stable_whisper.load_faster_whisper
model = loader(
    model_name, device="cpu", compute_type="int8", cpu_threads=2,
    local_files_only=True,
)
load_ms = round((time.perf_counter() - started) * 1000)
results = []
for sample in samples:
    audio = decode_audio(str(directory / (sample["id"] + ".wav")), sampling_rate=16000)
    started = time.perf_counter()
    if transcribe:
        segments, _ = model.transcribe(audio, language="en", word_timestamps=True)
        segments = list(segments)
    else:
        aligned = model.align(audio, sample["text"], language="en", verbose=None, vad=False)
        segments = aligned.segments if aligned else []
    elapsed_ms = round((time.perf_counter() - started) * 1000)
    words = [dict(text=w.word, start=float(w.start), end=float(w.end), probability=w.probability)
             for segment in segments for w in segment.words]
    suspect = [w for w in words if w["end"] <= w["start"] or
               (w["probability"] is not None and w["probability"] < 0.15)]
    result = dict(sample=sample["id"], text="".join(segment.text for segment in segments), elapsedMs=elapsed_ms, duration=len(audio) / 16000,
                  words=words, suspect=suspect)
    results.append(result)
    print(json.dumps(dict(model=model_name, sample=sample["id"], loadMs=load_ms,
                          elapsedMs=elapsed_ms, suspect=suspect)), flush=True)
mode = "transcribe" if transcribe else "align"
(directory / (model_name + (".transcribe" if transcribe else "") + ".inspection.json")).write_text(
    json.dumps(dict(model=model_name, mode=mode, loadMs=load_ms, results=results), indent=2), encoding="utf-8")
