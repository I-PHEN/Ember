/* ------------------------------------------------------------------
   The Ember brand — one source of truth for every place the
   product says its own name (or its professor's).

   Ember: igniting understanding, problem by problem.
   Ember is a warm, precise, quietly funny university professor.
------------------------------------------------------------------- */

export const BRAND = {
  name: "Ember",
  /** the short line under the wordmark everywhere */
  tagline: "every problem, a lesson",
  description:
    "Paste any university math, physics, chemistry or engineering question and watch Ember teach it — a hand-written board, a calm voice, and a real seekable video, planned like a lecture.",
  /** bumper + UI identity of the tutor persona */
  professor: {
    name: "Ember",
    short: "Ember",
    /** the signature she chalks under the wordmark in every intro */
    signature: "— Ember",
    /** one-line persona for UI (cards, chips, alt text) */
    blurb:
      "She reads the problem with you first, gathers what's given, names the ask — and only then solves, one unhurried move at a time.",
  },
} as const;

/** fixed words the bumper voice says (must stay in lockstep with intro.ts) */
export const INTRO_LINE = `Welcome back to Ember. Let's solve this one together.`;
