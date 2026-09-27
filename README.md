<div align="center">

# Chalkcast

### every problem, a lesson

**Type a problem. Watch the lesson.**

Paste any university math, physics, chemistry or engineering question and
Professor Ada teaches it — she plans the lecture, a marker pen hand-writes the
board stroke by stroke, and a calm voice talks you through it as a real,
seekable video.

<img src="public/chalkcast.svg" width="72" alt="Chalkcast logo" />

[Next.js 16](https://nextjs.org) · [React 19](https://react.dev) · [TypeScript](https://www.typescriptlang.org) · [Tailwind CSS 4](https://tailwindcss.com) · [shadcn/ui](https://ui.shadcn.com) · [GLM via Z.ai SDK](https://z.ai)

</div>

---

## Why this exists

AI can *answer* a question in two seconds — but an answer is not an
explanation. When you're stuck at 1 a.m. with an exam in three days, you don't
want a chat bubble with the final result; you want what a good professor does
at the board: read the problem *with* you, point out what's given, name what's
actually being asked, draw the picture, and then solve it one unhurried move
at a time — something you can rewatch at 1.5×, jump around in, and pause to
think.

Chalkcast generates **that** experience on demand: a YouTube-style solve video
with a real lecture structure, hand-written ink, and a voice that says exactly
what the pen is writing.

> The benchmark wasn't "AI answers correctly." It was: *would a student rather
> watch this video than ask a chatbot?*

---

## The lecture arc

Every video follows the arc of a well-taught university problem session —
not a solution dump:

| Stage | What Professor Ada does |
| --- | --- |
| **01 · Understand** | Reads the problem aloud in plain words, explains what kind of beast it is |
| **02 · Gather** | Collects what's *given* onto the board — every parameter, named and unit-ed |
| **03 · Name the ask** | Writes precisely what the question demands before touching any algebra |
| **04 · Plan** | Sells the route: which principles apply, and *why* — with a diagram or an analogy when it genuinely helps |
| **05 · Solve** | One move per scene. Slowly. The pen says what the voice says |
| **06 · Check** | Sanity-checks the result before boxing it |

---

## How a video is made

One job = one video, assembled by a **crew of AI agents** in a pipeline —
the client polls a job and shows a live, honest ETA per stage:

```
 ┌────────────┐   ┌──────────────┐   ┌───────────────┐   ┌────────────┐
 │  DIRECTOR  │ → │  TRANSCRIPT  │ → │ SCENE        │ → │   MERGE    │
 │  1 call    │   │  PLANNER     │   │ WRITERS ×N   │   │  sanitize  │
 │            │   │  1 call      │   │ (3 in flight)│   │  compile   │
 └────────────┘   └──────────────┘   └──────┬───────┘   └─────┬──────┘
   question →        outline → the        board           script → client
   chaptered         COMPLETE spoken      choreography     (watch starts
   outline           lecture, scene        for exactly     while the last
   along the         by scene              those words     voices record)
   lecture arc
                                                ↓
                                       ┌──────────────────┐
                                       │  VOICE (queued)  │
                                       │  TTS in playback │
                                       │  order — scene 1 │
                                       │  is always first │
                                       └──────────────────┘
```

**Director** (`directing`) turns the raw question into a chaptered lesson
outline laid out along the lecture arc. Small JSON, no narration — fast.

**Transcript planner** (`scripting`) is the heart of the pedagogy: *one* call
writes the entire spoken lecture as a whole, scene by scene — unhurried,
signposted, in Professor Ada's "we" voice, with exactly one pause-and-predict
moment and at most two analogies or visualizations, used only where they
genuinely earn their place. Because the words are planned as one piece, the
lecture flows instead of stitching scenes together.

**Scene writers** (`boarding`) each receive the outline plus *their slice* of
the transcript, and choreograph the board for exactly those words. Their
contract: copy the script verbatim into the narration, and tag every line of
ink with the `say` — the exact words being spoken while it's written. If a
writer fails, the planner's words survive; a scene never loses its voice.

**Voice** (`voicing`) starts the moment scene 1's writer lands: narrations
enter a global TTS queue *in playback order*, so the opening seconds of the
video are always recorded first and playback starts before the job finishes.

### Say/write sync — structural, not statistical

Every ink beat (a written line, a fraction, a graph, a free-body diagram…)
carries its own `say` tag. At compile time the narration is split into ordered
speech segments, each segment gets a time window proportional to its share of
the audio, and the pen is **stretched or paused to land each line inside its
own speech window** — writing slows while much is said about one line, and
rests during pure explanation. When the real TTS audio resolves, the whole
schedule is re-scaled to its true duration. Typical measured drift: a few
tenths of a second.

---

## The board

A deterministic, frame-accurate rendering engine — not a screen recording:

- **Live handwriting** — text is drawn as jittered single-stroke polylines
  (seeded RNG, so seeking is perfectly stable), with a visible pen that
  travels, presses, lifts and wobbles like a real marker
- **Purpose-built beats** — `write`, `fraction`, `title`, `graph`,
  `numberline`, `table`, `box`, `circle`, `underline`, `highlight`,
  `crossout`, `arrow`, `point`, `erase`, … each compiled into timed strokes
- **Free-body diagrams** — a curated parametric beat: ground, ramp with θ
  arc, rotated block, and labeled force arrows added one at a time, so
  physics problems get a *real* FBD instead of a text list
- **A teacher's board discipline** — fixed 16:9 board that never scrolls:
  when space runs out the engine erases and reflows like a professor wiping
  a corner clean; label placement is collision-aware and verified by an
  overlap sampler
- **Trademark bumper** — every video opens with the pen hand-writing
  *Chalkcast*, underlining it, chalking the tagline, and signing
  *— Prof. Ada* before the board wipes clean for the lesson

## The player

YouTube-standard controls, nothing invented:

- Instant, frame-accurate seeking (the timeline is a pure function of time)
- Chapter bar with hover previews and a chapter list
- ±10 s, playback speed, mute, fullscreen, captions (CC), keyboard shortcuts
- Switchable board themes (chalk blackboard / whiteboard)
- Your **library** of generated videos, saved locally

---

## Engineering notes

- **Deterministic timeline** — the script compiles to a timeline where every
  stroke has a time; rendering is `(timeline, t, theme) → board state`.
  Seeking is trivially exact, and thumbnails/captions/chapters all fall out
  of the same source of truth
- **Resilient TTS chain** — client-side single-flight cache with persistent
  retries that honor `Retry-After`, a server-side serial queue with adaptive
  spacing, and a player that buffers at scene entry instead of failing —
  upstream rate limits degrade to "the video pauses politely," never
  "the video is silent forever"
- **Script sanitizer** — every AI-produced script passes through clamps and
  whitelists (sizes, angles, force directions, colors…); `say` tags are kept
  only if they fuzzy-match the scene's narration, so a lying timing anchor is
  dropped instead of corrupting the pacing
- **Honest ETAs** — every stage's latency is measured and fed back, so the
  progress overlay estimates from reality, not vibes

---

## Tech stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS 4, shadcn/ui, Radix primitives |
| AI | GLM family (chat, TTS, vision audits) via `z-ai-web-dev-sdk` |
| Rendering | Custom SVG board engine + single-stroke Hershey font (`futural` via [hersheytext](https://github.com/techninja/hersheytext), MIT) with custom math/Greek glyphs |
| UI handwriting | LXGW WenKai subset (woff2) for chrome text |
| State | In-memory job studio + `localStorage` library (no DB required) |

## Getting started

**Prerequisites**

- Node.js 20+ (or [Bun](https://bun.sh) 1.1+)
- A running environment for the [Z.ai web-dev SDK](https://www.npmjs.com/package/z-ai-web-dev-sdk) —
  the director, transcript planner, scene writers and voice all call GLM
  models server-side through it

**Run it**

```bash
git clone https://github.com/I-PHEN/Whiteboard.git
cd Whiteboard
bun install          # or: npm install

cp .env.example .env # only DATABASE_URL (scaffold); the studio itself is in-memory

bun run dev          # or: npm run dev
```

Open <http://localhost:3000>, try the built-in sample, then paste your own
problem and meet Professor Ada.

## Project structure

```
src/
├── app/
│   ├── page.tsx                  # home: problem input, library, watch view
│   ├── layout.tsx                # metadata + brand
│   └── api/
│       ├── narrate/route.ts      # TTS endpoint (queued, cached, 429-aware)
│       └── video/jobs/[id]/      # create jobs + poll status
├── components/
│   ├── player/SolvePlayer.tsx    # the YouTube-style player
│   ├── GenerateOverlay.tsx       # crew progress + honest ETA
│   ├── ChalkAvatar.tsx           # Prof. Ada's chalk portrait
│   ├── ResumeCard.tsx            # return to an in-flight video
│   └── Wordmark.tsx              # chalk-drawing wordmark
└── lib/
    ├── video-jobs.ts             # the multi-agent studio (this is the brain)
    ├── prompts.ts                # every agent's brief — Ada's persona lives here
    ├── solve-schema.ts           # script sanitizer: clamps + fuzzy say-matching
    ├── brand.ts                  # single source of brand truth
    ├── intro.ts                  # the trademark bumper
    ├── tts-queue.ts              # server-side serial TTS queue
    ├── narration-store.ts        # client single-flight narration cache
    ├── use-video-job.ts          # job polling + phase state
    ├── samples.ts                # the built-in sample lesson
    └── video/
        ├── types.ts              # scene + beat vocabulary
        ├── compile.ts            # script → deterministic timeline (say-pacer)
        ├── render.ts             # (timeline, t, theme) → board state
        ├── text.ts               # text → hand-jittered strokes
        ├── font-data.ts          # single-stroke glyph data (auto-generated)
        ├── hand.ts               # seeded rough-path helpers
        └── audio.ts              # per-scene audio sync
```

## Roadmap

- More curated diagram beats (circuits, geometry, chemistry)
- Export to MP4 / shareable links
- Accounts + cloud library across devices
- Explain-a-concept videos (vs. solve-a-problem)
- Student-paced difficulty: same problem, remedial or exam-speed variants

## Credits

- Single-stroke font engine built on [hersheytext](https://github.com/techninja/hersheytext) (MIT)
- UI handwriting font: [LXGW WenKai](https://github.com/lxgw/LxgwWenKai) (subset)
- Board aesthetic inspired by the great chalkboard lecturers of the internet

## License

[MIT](LICENSE) — do send a pull request if you make the pen write faster.
