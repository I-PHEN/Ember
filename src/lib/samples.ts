/* ------------------------------------------------------------------
   Hand-authored master script — instant flagship demo that needs no LLM.

   The flagship master sample demonstrates THE LECTURE model end to end:
   the classic arc (understand → strategy & LIATE → assign components →
   assemble → integrate → check by differentiation), an engaging
   pedagogical transcript, exact "say" tags on every ink beat, disciplined
   visual emphasis (exactly ONE boxed final answer), and lockstep
   voice-pen synchronization.
------------------------------------------------------------------- */

import type { SolveScript } from "./video/types";

/** The flagship master lesson: Integration by Parts */
export const SAMPLE_CALCULUS: SolveScript = {
  title: "Integration by Parts: ∫ x·e^(2x) dx",
  subject: "Calculus",
  question: "Evaluate the indefinite integral ∫ x · e^(2x) dx using integration by parts.",
  scenes: [
    {
      chapter: "Understanding the integral",
      narration:
        "Welcome. Today we are tackling a foundational university calculus problem: the indefinite integral of x times e to the two x dx. Looking closely at the integrand, we see a product of two fundamentally different functions: an algebraic polynomial x, and an exponential function e to the two x. Notice that standard u-substitution fails here: substituting u equals two x gives a differential du equals two dx, which cannot eliminate the extra factor of x in front. Whenever we face a stubborn product of algebraic and transcendental functions, our primary tool is integration by parts.",
      beats: [
        {
          type: "title",
          text: "Integration by Parts",
          color: "yellow",
          say: "Welcome. Today we are tackling a foundational university calculus problem",
        },
        {
          type: "write",
          text: "Evaluate: ∫ x · e^(2x) dx",
          color: "blue",
          size: "lg",
          say: "the indefinite integral of x times e to the two x dx",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "Product: Algebraic (x) × Exponential (e^(2x))",
          color: "white",
          size: "md",
          say: "we see a product of two fundamentally different functions",
        },
      ],
    },
    {
      chapter: "The formula & LIATE strategy",
      narration:
        "Integration by parts stems directly from reversing the product rule of differentiation. The governing formula states that the integral of u dv equals u times v minus the integral of v du. To make this technique work smoothly, the new integral, integral of v du, must be simpler to evaluate than the original. We choose u using the classic LIATE mnemonic: Logarithmic, Inverse trigonometric, Algebraic, Trigonometric, Exponential. Since algebraic x comes before exponential e to the two x, we choose u equals x.",
      beats: [
        {
          type: "write",
          text: "Formula: ∫ u dv = u·v − ∫ v du",
          color: "orange",
          size: "md",
          say: "The governing formula states that the integral of u dv equals u times v minus the integral of v du",
        },
        {
          type: "underline",
          target: "text:Formula: ∫ u dv = u·v − ∫ v du",
          color: "orange",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "LIATE Strategy: Algebraic (A) before Exponential (E)",
          color: "white",
          size: "md",
          say: "We choose u using the classic LIATE mnemonic",
        },
      ],
    },
    {
      chapter: "Assigning u, dv and computing du, v",
      narration:
        "Now let us carefully assign our pieces and compute their derivatives and antiderivatives. Setting u equal to x, we differentiate to find du equals dx. What remains in our integrand becomes dv: dv equals e to the two x dx. To find v, we integrate dv. Integrating e to the two x requires a factor of one half from the chain rule, giving v equals one half e to the two x. Notice how clean this setup is: differentiating u reduced x to a constant, which will make the next integral trivial.",
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "u = x          →   du = dx",
          color: "white",
          size: "md",
          say: "Setting u equal to x, we differentiate to find du equals dx",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "dv = e^(2x) dx  →   v = ½ e^(2x)",
          color: "yellow",
          size: "md",
          say: "What remains in our integrand becomes dv",
        },
      ],
    },
    {
      chapter: "Applying the integration by parts formula",
      narration:
        "With all four components ready, we assemble them into our integration by parts formula: u times v minus the integral of v du. First, the boundary term u times v is x multiplied by one half e to the two x, which writes neatly as one half x e to the two x. Second, we subtract the new integral: the integral of one half e to the two x dx. Notice what happened: the troublesome x has completely vanished from inside the integral, leaving only a pure exponential.",
      beats: [
        {
          type: "write",
          text: "∫ x·e^(2x) dx = (x)(½ e^(2x)) − ∫ ½ e^(2x) dx",
          color: "blue",
          size: "md",
          say: "With all four components ready, we assemble them into our integration by parts formula",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "= ½ x · e^(2x) − ½ ∫ e^(2x) dx",
          color: "white",
          size: "md",
          say: "which writes neatly as one half x e to the two x",
        },
      ],
    },
    {
      chapter: "Evaluating the final integral & boxing result",
      narration:
        "Now we evaluate the remaining integral. Integrating e to the two x gives another factor of one half, producing one half times one half e to the two x, which is one fourth e to the two x. Because this is an indefinite integral, we must never forget the constant of integration, plus C. Combining our terms gives our final solution: one half x e to the two x minus one fourth e to the two x plus C. We can also factor out one fourth e to the two x to express it as one fourth e to the two x times two x minus one plus C.",
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "= ½ x · e^(2x) − ½ (½ e^(2x)) + C",
          color: "white",
          size: "md",
          say: "Integrating e to the two x gives another factor of one half",
        },
        { type: "newline", n: 2 },
        {
          type: "write",
          text: "= ½ x · e^(2x) − ¼ e^(2x) + C",
          color: "green",
          size: "lg",
          keep: true,
          say: "Combining our terms gives our final solution: one half x e to the two x minus one fourth e to the two x plus C",
        },
        {
          type: "box",
          target: "text:= ½ x · e^(2x) − ¼ e^(2x) + C",
          color: "yellow",
        },
      ],
    },
    {
      chapter: "Verifying the answer by differentiation",
      narration:
        "Let us verify our result by differentiating it. The derivative of an indefinite integral must return the original integrand. Using the product rule on one half x times e to the two x gives one half e to the two x plus x e to the two x. Next, differentiating minus one fourth e to the two x gives minus one half e to the two x, while the constant C vanishes. The one half e to the two x and minus one half e to the two x cancel to zero, leaving exactly x e to the two x. The solution is confirmed.",
      beats: [
        {
          type: "write",
          text: "Check: d/dx [ ½ x·e^(2x) − ¼ e^(2x) + C ]",
          color: "white",
          size: "md",
          say: "Let us verify our result by differentiating it",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "= ½ e^(2x) + x·e^(2x) − ½ e^(2x) = x·e^(2x) ✓",
          color: "green",
          size: "md",
          say: "The one half e to the two x and minus one half e to the two x cancel to zero, leaving exactly x e to the two x",
        },
      ],
    },
  ],
};

/** A short loop for the landing-page hero board (muted). */
export const HERO_SCRIPT: SolveScript = {
  title: "Watch AI solve it",
  subject: "Demo",
  question: "∫ x·e^(2x) dx",
  scenes: [
    {
      chapter: "Live demo",
      narration:
        "Evaluate the integral of x times e to the two x dx. Choose u equals x, dv equals e to the two x dx. Integration by parts yields one half x e to the two x minus one fourth e to the two x plus C.",
      beats: [
        { type: "title", text: "Integration by Parts", color: "yellow" },
        { type: "write", text: "∫ x · e^(2x) dx", color: "blue", size: "lg" },
        { type: "newline", n: 1 },
        { type: "write", text: "u = x,  dv = e^(2x) dx", color: "white", size: "md" },
        { type: "newline", n: 1 },
        { type: "write", text: "= ½ x·e^(2x) − ¼ e^(2x) + C", color: "green", size: "lg" },
        { type: "box", target: "last", color: "yellow" },
        { type: "wait", ms: 900 },
      ],
    },
  ],
};

/** The single master lesson showcase */
export const SAMPLE_LESSONS: SolveScript[] = [
  SAMPLE_CALCULUS,
];

export const EXAMPLE_QUESTIONS = [
  "Evaluate ∫ x · e^(2x) dx using integration by parts",
  "A 10 kg block slides on a 30° incline with friction — find its acceleration",
  "Differentiate f(x) = x³ · sin(x)",
  "Solve the differential equation dy/dx = 3x² · y",
  "Find the limit as x approaches 0 of sin(x) / x",
  "Calculate the center of mass of a semicircular wire of radius R",
];
