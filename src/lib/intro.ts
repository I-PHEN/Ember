/* ------------------------------------------------------------------
   The Chalkcast trademark intro — a fixed brand bumper prepended to
   (almost) every video. NOT AI content: the pen hand-writes the
   mark, Professor Ada signs it, the voice says her line, then the
   board is wiped clean for the lesson — "the board writes the
   brand, then clears for you."

   Fixed narration is pre-warmed through the global TTS queue at job
   start, so after the first video ever synthesized it is an instant
   cache hit and adds no watch latency.
------------------------------------------------------------------- */

import { BRAND, INTRO_LINE } from "./brand";
import type { SolveScene } from "./video/types";

/** the exact string sent through TTS — must equal scene.narration so the
 *  player's per-scene fetch hits the same cache key as the pre-warm */
export const INTRO_NARRATION = INTRO_LINE;

/** the fixed intro scene (brand bumper) */
export const INTRO_SCENE: SolveScene = {
  chapter: "Welcome",
  intro: true,
  narration: INTRO_NARRATION,
  beats: [
    // big centered mark — the title beat writes AND underlines it
    { type: "title", text: BRAND.name, color: "yellow" },
    // tagline, centered under the mark
    {
      type: "write",
      text: BRAND.tagline,
      color: "white",
      size: "sm",
      x: 0.5,
      y: 0.36,
      align: "center",
    },
    // the professor's chalk signature, right-aligned under the tagline
    {
      type: "write",
      text: BRAND.professor.signature,
      color: "yellow",
      size: "sm",
      x: 0.68,
      y: 0.45,
      align: "right",
    },
    // the trademark: wipe the board clean for the lesson
    { type: "erase" },
  ],
};

/** fresh clone per video (compile never mutates beats, but history
 *  entries are serialized to localStorage — keep object identity safe) */
export function introScene(): SolveScene {
  return { ...INTRO_SCENE, beats: INTRO_SCENE.beats.map((b) => ({ ...b })) };
}
