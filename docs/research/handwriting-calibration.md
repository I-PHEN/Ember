# Handwriting Calibration — measured constants (M0)

Source: Organic Chemistry Tutor, "Intro to Matrices"
(`D:\Downloads\Intro to Matrices.mp4`, yt `yRwQ7A6jVLk`), measured 2026-10-16.
Raw data: `handwriting-calibration-data.json` (same folder).

Method: 640×360 grayscale @30 fps via ffmpeg rawvideo pipe, frame
differencing (|Δ| > 12, ≥ 9 changed px = writing frame — fps-scaled gate),
bursts split at ≥ 2 idle frames (66 ms pause resolution). Speeds and duty
cycle are measured at BURST level (accumulated centroid path ÷ burst wall
time) — frame-level speeds bias toward fast frames at high fps. Cap height
**anchored visually** from `frame_min_02_00s.jpg`: capitals ≈ 30 px, line
pitch ≈ 60 px at 640×360 (≈ 1/12 of frame height). The row-span proxy was
unreliable (pen-jump transition frames span multiple lines and pollute
every percentile) — one measured anchor beats a noisy estimator.

## Measured

- 20 476 frames (11:22), 4 280 writing frames, pen-down duty **25.8 %**
- stroke speed p25/p50/p75 = 119 / **186** / 379 px/s at 360p
  → **6.21 cap-heights/s** p50 (Ember equivalent ≈ 236 px/s at cap 38)
- pauses ≥ 66 ms: 1 612 hold (same board area) + 146 line (new line)
- hold pauses: P30/P40 = **67 ms**, P50/P60 = **100 ms**, P75 = **133 ms**
- line pauses: P50 = **650 ms**

## Fitted (consumed by `src/lib/video/calibration.ts`)

| constant | fitted | was (invented) | reading |
| --- | --- | --- | --- |
| gamma0 | **43** | 100 | engine strokes were ~1.5× faster than the tutor's, but pauses were 3× heavier — net writing felt slow because of the pauses, not the ink |
| hesitation charStart | **67 ms** | 40 ms | near enough — glyph-to-glyph |
| hesitation wordStart | **100 ms** | 220 ms | 2.2× too heavy |
| hesitation operator | **150 ms** | 420 ms | **2.8× too heavy — the single biggest "hovers more than it writes" defect** |
| Fitts a / b | **0.050 / 0.131** | 0.11 / 0.09 | fitted by least squares over 1 612 real (distance, duration) pause pairs |
| settle | **80 ms** | 180 ms | pen settles in half the invented time |
| duty band | 0.258 | — | one video → one number; the band widens with future reference footage |

gamma0 is binary-searched against the real `KinematicStrokeSynthesizer`
(the synthesizer's effective speed is not a closed form). Note the engine
saturates at ~423 px/s for the reference stroke past gamma0 ≈ 300
(acceleration limit + min-jerk envelope); this target (236 px/s) sits
safely mid-range.

## Interpretation

The invented constants modeled a slow, deliberate scribe; the real tutor
writes in quick bursts with light intra-line pauses (67–150 ms) and
pauses meaningfully only at line changes (650 ms) and between thoughts.
The calibrated engine keeps stroke kinematics (two-thirds power law,
min-jerk, Fitts flights — all correct) but breathes at human timescales:
~2× lighter hesitations, ~2× faster settle, slightly slower strokes.
Pen-down duty 25.8 % confirms the 15–30 % teaching cadence the writer
prompts assume.

The 650 ms line pause validates the stitcher's between-thought gap
default (0.9 s) and the spec's mode-gap design.

Tuning rule: constants change ONLY with new measurement data (spec §10) —
the `calibration-constants` test pins the module to this JSON.
