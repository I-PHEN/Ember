/* ------------------------------------------------------------------
   Film tokens — mirrored 1:1 from the app (CLAUDE.md brand section,
   globals.css, studio/page.tsx). Brand is frozen: base #111315,
   ONE accent amber #e6b784, Geist Sans/Mono, BoardHand on boards.
------------------------------------------------------------------- */

export const FPS = 30;
export const W = 1920;
export const H = 1080;

/** 120 BPM → one beat every 15 frames. Every cut lands on a beat. */
export const BEAT = 15;

export const C = {
  base: "#111315", // never change (brand law)
  baseDeep: "#0e0f12",
  baseTop: "#101214",
  ink: "#f1eee7", // wordmark / headline ink
  inkHi: "#f4f4f6",
  muted: "#9aa1af",
  muted2: "#8b919e",
  faint: "#6a7180",
  amber: "#e6b784",
  amberHi: "#f2ca9e",
  amberInk: "#141619", // text on amber buttons
  panel: "#12151b",
  panel2: "#11141b",
  panel3: "#0e1015",
  overlay: "#171b1d",
  overlayRing: "#34383c",
  track: "#23262a",
  hair: "rgba(255,255,255,0.06)",
  hair2: "rgba(255,255,255,0.08)",
  hair3: "rgba(255,255,255,0.12)",
  live: "#5cdb95",
  boardBg: "#131417",
  chalkYellow: "#ffd84d",
  chalkGreen: "#7de38b",
  chalkBlue: "#58c4f4",
} as const;

export const F = {
  sans: `"Geist", -apple-system, "Segoe UI", Roboto, sans-serif`,
  mono: `"Geist Mono", ui-monospace, Consolas, monospace`,
  hand: `"BoardHand", "Segoe Print", cursive`,
} as const;

/* ---------------------------- the cut list --------------------------- */
/* frame ranges (30fps). Total = 1680f = 56s. Every boundary is on-beat. */
export const CUTS = {
  coldOpen: { from: 0, dur: 120 }, // 0:00  "1:04 AM. exam in three days."
  problem: { from: 120, dur: 135 }, // 0:04  "an answer isn't an explanation"
  reveal: { from: 255, dur: 105 }, // 0:08.5 the spark → Ember
  composer: { from: 360, dur: 180 }, // 0:12  paste any problem
  crew: { from: 540, dur: 210 }, // 0:18  plans it like a lecture
  board: { from: 750, dur: 330 }, // 0:25  the real board engine
  verify: { from: 1080, dur: 120 }, // 0:36  checked before you see it
  office: { from: 1200, dur: 210 }, // 0:40  office hours
  montage: { from: 1410, dur: 120 }, // 0:47  themes + gallery
  outro: { from: 1530, dur: 150 }, // 0:51  every problem, a lesson.
} as const;

export const TOTAL = 1680;
