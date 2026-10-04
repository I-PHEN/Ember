"""Dependency-boundary regression: no model, credentials or network required."""
import io
import unittest
import wave

from faster_whisper.audio import decode_audio


class AudioDecodeCompatibility(unittest.TestCase):
    def test_generated_wav_decodes_at_worker_sample_rate(self):
        # This catches incompatible av.open arguments in the installed decoder.
        source = io.BytesIO()
        with wave.open(source, "wb") as wav:
            wav.setnchannels(1)
            wav.setsampwidth(2)
            wav.setframerate(24000)
            wav.writeframes(b"\x00\x00" * 12000)
        source.seek(0)
        samples = decode_audio(source, sampling_rate=16000)
        self.assertEqual(len(samples), 8000)
        self.assertTrue((samples == 0).all())


if __name__ == "__main__":
    unittest.main()
