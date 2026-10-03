"""One-time explicit download. Runtime worker always uses local_files_only=True."""
import os
import stable_whisper

model = stable_whisper.load_faster_whisper(
    os.environ.get("EMBER_ALIGNMENT_MODEL", "base.en"),
    device="cpu", compute_type="int8", cpu_threads=2,
)
print("Alignment model ready.")

