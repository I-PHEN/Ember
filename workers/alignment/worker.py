"""Persistent, local-only forced alignment. One JSON request/response per line.
stdout is exclusively the protocol; logs go to stderr. No transcript logging.
"""
import base64
import contextlib
import io
import json
import os
import sys

MAX_REQUEST = 24 * 1024 * 1024
MODEL = os.environ.get("EMBER_ALIGNMENT_MODEL", "base.en")
model = None


def align(request):
    global model
    import numpy as np
    from faster_whisper.audio import decode_audio
    import stable_whisper

    text = request["text"]
    if not isinstance(text, str) or not 0 < len(text) <= 1020:
        raise ValueError("invalid transcript")
    audio_bytes = base64.b64decode(request["audio"], validate=True)
    if not audio_bytes or len(audio_bytes) > 16 * 1024 * 1024:
        raise ValueError("invalid audio")
    audio = decode_audio(io.BytesIO(audio_bytes), sampling_rate=16000)
    duration = len(audio) / 16000
    if not 0 < duration <= 1800 or not np.isfinite(audio).all():
        raise ValueError("invalid duration")
    if float(np.sqrt(np.mean(audio ** 2))) < 0.0001:
        return {"status": "invalid", "words": [], "duration": duration}
    if model is None:
        model = stable_whisper.load_faster_whisper(
            MODEL, device="cpu", compute_type="int8", cpu_threads=2,
            local_files_only=True,
        )
    result = model.align(audio, text, language="en", verbose=None, vad=False)
    if result is None:
        return {"status": "invalid", "words": [], "duration": duration}
    words = []
    for segment in result.to_dict()["segments"]:
        for word in segment.get("words", []):
            probability = word.get("probability")
            if probability is not None and probability < 0.15:
                return {"status": "invalid", "words": [], "duration": duration}
            words.append({"text": word["word"], "start": word["start"], "end": word["end"]})
    return {"status": "aligned", "words": words, "duration": duration,
            "engine": "stable-ts-2.19.1/" + MODEL}


def main():
    while True:
        line = sys.stdin.buffer.readline(MAX_REQUEST + 1)
        if not line:
            return
        if len(line) > MAX_REQUEST:
            return
        request = None
        try:
            request = json.loads(line)
            with contextlib.redirect_stdout(sys.stderr):
                result = align(request)
        except Exception:
            # Protocol consumers get a bounded failure status, not local paths,
            # transcripts, model internals or arbitrary exception output.
            result = {"status": "unavailable", "words": []}
        result["id"] = request.get("id") if isinstance(request, dict) else None
        sys.stdout.write(json.dumps(result, ensure_ascii=True) + "\n")
        sys.stdout.flush()


if __name__ == "__main__":
    main()

