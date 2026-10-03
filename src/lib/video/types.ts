/* ------------------------------------------------------------------
   Chalkcast video engine — shared types + board themes.

   The "video" is a deterministic timeline: every stroke has a known
   start time and duration, so any frame can be rendered instantly
   from (timeline, t). That is what makes seeking work like a real
   video player.
------------------------------------------------------------------- */

/* ------------------------- board themes --------------------------- */

export type MarkerName =
  | "white"
  | "blue"
  | "green"
  | "orange"
  | "pink"
  | "yellow"
  | "purple"
  | "red";

export type BoardThemeId = "blackboard" | "whiteboard" | "paper";

export interface BoardTheme {
  id: BoardThemeId;
  label: string;
  /** video frame background */
  bg: string;
  /** vignette rgba */
  vignette: string;
  /** paper noise strength 0..1 */
  noise: number;
  colors: Record<MarkerName, string>;
  /** highlighter fill (behind text) */
  highlight: string;
  /** default writing color + heading color */
  ink: MarkerName;
  heading: MarkerName;
  /** UI accent for this theme (chips etc.) */
  accent: string;
}

export const THEMES: Record<BoardThemeId, BoardTheme> = {
  blackboard: {
    id: "blackboard",
    label: "Blackboard",
    bg: "#131417",
    vignette: "rgba(0,0,0,0.42)",
    noise: 0.05,
    colors: {
      white: "#f2f3f5",
      blue: "#58c4f4",
      green: "#7de38b",
      orange: "#ffa657",
      pink: "#f78fb8",
      yellow: "#ffd84d",
      purple: "#b79bf8",
      red: "#ff7a76",
    },
    highlight: "rgba(255, 216, 77, 0.20)",
    ink: "white",
    heading: "yellow",
    accent: "#ffa657",
  },
  whiteboard: {
    id: "whiteboard",
    label: "Whiteboard",
    bg: "#fbfaf6",
    vignette: "rgba(120, 110, 90, 0.16)",
    noise: 0.035,
    colors: {
      white: "#2a2c33", // acts as "ink" on light boards
      blue: "#1668c9",
      green: "#1e8a4c",
      orange: "#e07818",
      pink: "#d5376e",
      yellow: "#b8860b",
      purple: "#7048c7",
      red: "#d33f3f",
    },
    highlight: "rgba(255, 205, 0, 0.35)",
    ink: "white",
    heading: "orange",
    accent: "#e07818",
  },
  paper: {
    id: "paper",
    label: "Paper",
    bg: "#f6efdd",
    vignette: "rgba(120, 96, 60, 0.14)",
    noise: 0.06,
    colors: {
      white: "#37322a",
      blue: "#2456a8",
      green: "#256b3f",
      orange: "#c2620e",
      pink: "#b33265",
      yellow: "#9a7b0a",
      purple: "#5f41a8",
      red: "#bb3531",
    },
    highlight: "rgba(255, 190, 60, 0.38)",
    ink: "white",
    heading: "red",
    accent: "#bb3531",
  },
};

export const THEME_ORDER: BoardThemeId[] = [
  "blackboard",
  "whiteboard",
  "paper",
];

export function markerColor(
  theme: BoardTheme,
  name: MarkerName | string | undefined
): string {
  if (!name) return theme.colors[theme.ink];
  return theme.colors[name as MarkerName] ?? theme.colors[theme.ink];
}

/* ------------------------- solve script --------------------------- */
/* The AI's output: a question → a list of scenes of "beats" that the
   compiler turns into a drawable timeline. */

export type BeatSize = "lg" | "md" | "sm";

export interface GraphPointSpec {
  x: number;
  y: number;
  label?: string;
}
export interface NumberLineHop {
  from: number;
  to: number;
  label?: string;
}
export interface NumberLinePoint {
  at: number;
  label?: string;
}
/** one labeled force arrow in a free-body diagram */
export interface ForceArrow {
  label?: string;
  dir:
    | "down"
    | "up"
    | "left"
    | "right"
    | "normal" // perpendicular to the surface, away from it
    | "upslope" // along the surface, uphill
    | "downslope"; // along the surface, downhill
}

export type Beat =
  | { type: "title"; text: string; color?: MarkerName; say?: string }
  | {
      type: "write";
      text: string;
      color?: MarkerName;
      size?: BeatSize;
      /** 0..1 horizontal anchor inside the content area */
      x?: number;
      /** 0..1 vertical anchor inside the content area */
      y?: number;
      align?: "left" | "center" | "right";
      /** position directly below another group ("last" or "text:…") */
      below?: string;
      /** survives board erases (the answer chain) */
      keep?: boolean;
      say?: string;
    }
  | {
      type: "fraction";
      prefix?: string;
      num: string;
      den: string;
      suffix?: string;
      color?: MarkerName;
      size?: BeatSize;
      keep?: boolean;
      say?: string;
    }
  | { type: "box"; target?: string; color?: MarkerName }
  | { type: "circle"; target?: string; color?: MarkerName }
  | { type: "underline"; target?: string; color?: MarkerName }
  | { type: "highlight"; target?: string; color?: MarkerName }
  | { type: "crossout"; target?: string }
  | {
      type: "arrow";
      from?: string;
      to?: string;
      label?: string;
      color?: MarkerName;
    }
  | { type: "point"; target?: string; ms?: number }
  | {
      type: "freebody";
      /** incline angle in degrees (0 or omitted = flat ground) */
      angle?: number;
      /** short label for the block, e.g. "m" or "2 kg" */
      block?: string;
      /** labeled force arrows radiating from the block */
      forces?: ForceArrow[];
      color?: MarkerName;
      say?: string;
    }
  | {
      type: "graph";
      expr: string;
      xMin?: number;
      xMax?: number;
      label?: string;
      color?: MarkerName;
      points?: GraphPointSpec[];
      say?: string;
    }
  | {
      type: "numberline";
      min: number;
      max: number;
      points?: NumberLinePoint[];
      hops?: NumberLineHop[];
      color?: MarkerName;
      say?: string;
    }
  | {
      type: "table";
      title?: string;
      headers?: string[];
      rows: string[][];
      color?: MarkerName;
      say?: string;
    }
  | { type: "erase"; keep?: string[] }
  | { type: "wait"; ms: number }
  | { type: "newline"; n?: number };

export type ScriptBeat = Beat; // alias used by the sanitizer

export interface SolveScene {
  chapter: string;
  narration: string;
  beats: Beat[];
  /** the fixed trademark intro (brand bumper) — not AI content; the player
   *  hides it from chapter lists and the chapter chip */
  intro?: boolean;
}

export interface SolveScript {
  title: string;
  subject?: string;
  question: string;
  scenes: SolveScene[];
}

/* --------------------------- timeline ----------------------------- */

export interface Pt {
  x: number;
  y: number;
}

export interface BBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface StrokeMove {
  /** scene that triggered the slide */
  scene: number;
  /** scene-relative trigger time */
  at: number;
  dx: number;
  dy: number;
}

export interface PathStroke {
  kind: "path";
  pts: Pt[];
  /** marker color name (theme-resolved at render → live theme switch) */
  color: MarkerName;
  width: number;
  /** seconds relative to the owning scene's start */
  t0: number;
  dur: number;
  /** cumulative polyline lengths for partial reveal */
  cum: number[];
  len: number;
  /** set when an erase beat removes this stroke */
  eraseScene?: number;
  eraseAt?: number;
  /** board erases may slide kept strokes (multiple erases accumulate) */
  moves?: StrokeMove[];
  /** soft under-glow (emphasis) */
  glow?: boolean;
}

export interface HighlightStroke {
  kind: "highlight";
  rect: BBox;
  color: MarkerName;
  t0: number;
  dur: number;
  eraseScene?: number;
  eraseAt?: number;
  moves?: StrokeMove[];
}

export type Stroke = PathStroke | HighlightStroke;

export interface Group {
  id: string;
  scene: number;
  text?: string;
  keep: boolean;
  strokes: Stroke[];
  bbox: BBox;
  born: number;
  /** for emphasis strokes: the group they decorate (kept/erased together) */
  anchor?: Group;
}

export interface EraseSweep {
  /** scene-relative */
  at: number;
  scene: number;
  region: BBox;
}

export interface SceneTime {
  /** Timing provenance and feasibility; duration-only anchoring is approximate. */
  timing?: import("./timing").TimingPlan;
  chapter: string;
  narration: string;
  /** trademark intro scene (brand bumper) */
  intro?: boolean;
  strokes: Stroke[];
  groups: Group[];
  erases: EraseSweep[];
  /** lead-in before the first stroke */
  head: number;
  /** scene-relative end of writing */
  writeEnd: number;
  /** total scene duration (grows to fit narration) */
  dur: number;
  /** known narration duration, once TTS resolves */
  audioDur?: number;
  /** All timing frozen once playback/seek commits this scene. */
  locked: boolean;
  /** Beat timing has been compiled against narration. */
  paced?: boolean;
  /** Duration used for the current plan (see timing.source for provenance). */
  pacedFor?: number;
}

export interface Timeline {
  title: string;
  subject?: string;
  question: string;
  scenes: SceneTime[];
}

/** absolute start time of a scene */
export function sceneStart(tl: Timeline, i: number): number {
  let t = 0;
  for (let k = 0; k < i; k++) t += tl.scenes[k].dur;
  return t;
}

export function totalDuration(tl: Timeline): number {
  let t = 0;
  for (const s of tl.scenes) t += s.dur;
  return t;
}

/** which scene contains global time t (-1 = before start) */
export function sceneAt(tl: Timeline, t: number): number {
  let start = 0;
  for (let i = 0; i < tl.scenes.length; i++) {
    const end = start + tl.scenes[i].dur;
    if (t < end) return i;
    start = end;
  }
  return tl.scenes.length - 1;
}

/** absolute stroke start (global video time) */
export function strokeStart(
  tl: Timeline,
  sceneIdx: number,
  s: Stroke
): number {
  return sceneStart(tl, sceneIdx) + s.t0;
}

/** absolute erase time or null */
export function eraseTime(tl: Timeline, s: Stroke): number | null {
  if (s.eraseScene === undefined || s.eraseAt === undefined) return null;
  return sceneStart(tl, s.eraseScene) + s.eraseAt;
}

/* --------------------------- geometry ----------------------------- */

export const BOARD_W = 1280;
export const BOARD_H = 720;
export const MARGIN_X = 72;
export const MARGIN_TOP = 56;
/** last usable baseline y */
export const MAX_BASELINE = 636;
/** default first baseline */
export const FIRST_BASELINE = 148;

export const CAP: Record<BeatSize | "title", number> = {
  title: 54,
  lg: 50,
  md: 38,
  sm: 30,
};

export const LINE_H: Record<BeatSize | "title", number> = {
  title: 92,
  lg: 84,
  md: 64,
  sm: 50,
};
