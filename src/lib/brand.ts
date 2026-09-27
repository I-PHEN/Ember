/* ------------------------------------------------------------------
   The Chalkcast brand — one source of truth for every place the
   product says its own name (or its professor's).

   Chalkcast: chalk = timeless teaching, cast = a video medium.
   Taught by Professor Ada — a warm, precise, quietly funny
   university professor (a nod to Ada Lovelace).
------------------------------------------------------------------- */

export const BRAND = {
  name: "Chalkcast",
  /** the short line under the wordmark everywhere */
  tagline: "every problem, a lesson",
  description:
    "Paste any university math, physics, chemistry or engineering question and watch Professor Ada teach it — a hand-written board, a calm voice, and a real seekable video, planned like a lecture.",
  /** bumper + UI identity of the tutor persona */
  professor: {
    name: "Professor Ada",
    short: "Prof. Ada",
    /** the signature she chalks under the wordmark in every intro */
    signature: "— Prof. Ada",
    /** one-line persona for UI (cards, chips, alt text) */
    blurb:
      "She reads the problem with you first, gathers what's given, names the ask — and only then solves, one unhurried move at a time.",
  },
} as const;

/** fixed words the bumper voice says (must stay in lockstep with intro.ts) */
export const INTRO_LINE = `Welcome back to Chalkcast. I'm Professor Ada — let's solve this one together.`;
