/* ------------------------------------------------------------------
   Hand-authored master script — instant flagship demo that needs no LLM.

   The flagship master sample demonstrates THE LECTURE model end to end:
   the classic Organic Chemistry Tutor pedagogical cadence:
   1. Spoken voice lead-in (~2-3s) framing the step before writing.
   2. Hand writing in steady, synchronous lockstep with spoken explanations.
   3. Closing reflection / coda (~2-3s) letting key insights land.
   4. Disciplined visual hierarchy (exactly ONE final boxed answer).
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
        "Welcome everyone. Today we are going to evaluate the indefinite integral of x times e to the 2x dx using integration by parts. Before we write down any formulas, let us take a look at our integrand. Notice that standard u-substitution fails here, because we have a product of two fundamentally different functions: an algebraic polynomial x, and an exponential function e to the 2x. Whenever you face a product of algebraic and transcendental functions, integration by parts is our primary tool.",
      beats: [
        {
          type: "title",
          text: "Integration by Parts",
          color: "yellow",
          say: "Today we are going to evaluate the indefinite integral of x times e to the 2x dx using integration by parts",
        },
        {
          type: "write",
          text: "Evaluate: ∫ x · e^(2x) dx",
          color: "blue",
          size: "lg",
          say: "Before we write down any formulas, let us take a look at our integrand",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "Product: Algebraic (x) × Exponential (e^(2x))",
          color: "white",
          size: "md",
          say: "Notice that standard u-substitution fails here, because we have a product of two fundamentally different functions",
        },
      ],
    },
    {
      chapter: "The formula & LIATE strategy",
      narration:
        "Now let us recall the governing formula for integration by parts. The formula states that the integral of u dv equals u times v minus the integral of v du. To choose our u and dv wisely, we follow the classic LIATE mnemonic: Logarithmic, Inverse trigonometric, Algebraic, Trigonometric, Exponential. Since algebraic x comes before exponential e to the 2x, we choose u to be x.",
      beats: [
        {
          type: "write",
          text: "Formula: ∫ u dv = u·v − ∫ v du",
          color: "orange",
          size: "md",
          say: "The formula states that the integral of u dv equals u times v minus the integral of v du",
        },
        {
          type: "underline",
          target: "text:Formula: ∫ u dv = u·v − ∫ v du",
          color: "orange",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "LIATE: L · I · A · T · E",
          color: "white",
          size: "md",
          say: "To choose our u and dv wisely, we follow the classic LIATE mnemonic",
        },
        {
          type: "point",
          target: "text:LIATE: L · I · A · T · E",
          ms: 1100,
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "Choose: u = x  (Algebraic before Exponential)",
          color: "yellow",
          size: "md",
          say: "Since algebraic x comes before exponential e to the 2x, we choose u to be x",
        },
      ],
    },
    {
      chapter: "Assigning u, dv and computing du, v",
      narration:
        "Now let us find all four components for our integration by parts formula. First, setting u equal to x, we differentiate both sides to get du equals dx. Next, what remains in our integrand becomes dv, so dv equals e to the 2x dx. Integrating both sides to find v gives v equals one half e to the 2x. Notice how clean this is: differentiating u reduced x to a constant, which will make the next integral trivial.",
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "u = x            →   du = dx",
          color: "white",
          size: "md",
          say: "First, setting u equal to x, we differentiate both sides to get du equals dx",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "dv = e^(2x) dx   →   v = ½ e^(2x)",
          color: "yellow",
          size: "md",
          say: "Next, what remains in our integrand becomes dv, so dv equals e to the 2x dx. Integrating both sides to find v gives v equals one half e to the 2x",
        },
      ],
    },
    {
      chapter: "Applying the integration by parts formula",
      narration:
        "With all four components ready, we assemble them into our integration by parts formula. First, we write u times v, which is x multiplied by one half e to the 2x. Next, we subtract the integral of v du, which is the integral of one half e to the 2x dx. Factoring the constant one half out in front leaves one half x e to the 2x minus one half integral of e to the 2x dx. Look at how much simpler this is: the troublesome x has completely vanished from inside the integral.",
      beats: [
        {
          type: "write",
          text: "∫ x·e^(2x) dx = (x)(½ e^(2x)) − ∫ ½ e^(2x) dx",
          color: "blue",
          size: "md",
          say: "First, we write u times v, which is x multiplied by one half e to the 2x. Next, we subtract the integral of v du, which is the integral of one half e to the 2x dx",
        },
        {
          type: "point",
          target: "text:∫ x·e^(2x) dx = (x)(½ e^(2x)) − ∫ ½ e^(2x) dx",
          ms: 1200,
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "= ½ x · e^(2x) − ½ ∫ e^(2x) dx",
          color: "white",
          size: "md",
          say: "Factoring the constant one half out in front leaves one half x e to the 2x minus one half integral of e to the 2x dx",
        },
      ],
    },
    {
      chapter: "Evaluating the final integral & boxing result",
      narration:
        "Now we evaluate the remaining integral. Integrating e to the 2x brings down another factor of one half, producing one half times one half e to the 2x, plus our constant of integration C. Multiplying the fractions gives our final answer: one half x e to the 2x minus one fourth e to the 2x plus C. We can also factor out one fourth e to the 2x if we want to write it in factored form.",
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "= ½ x · e^(2x) − ½ (½ e^(2x)) + C",
          color: "white",
          size: "md",
          say: "Integrating e to the 2x brings down another factor of one half, producing one half times one half e to the 2x, plus our constant of integration C",
        },
        { type: "newline", n: 2 },
        {
          type: "write",
          text: "= ½ x · e^(2x) − ¼ e^(2x) + C",
          color: "green",
          size: "lg",
          keep: true,
          say: "Multiplying the fractions gives our final answer: one half x e to the 2x minus one fourth e to the 2x plus C",
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
        "A great mathematician always verifies their solution by differentiating. Taking the derivative of our result with the product rule: the derivative of one half x e to the 2x gives one half e to the 2x plus x e to the 2x, and differentiating minus one fourth e to the 2x gives minus one half e to the 2x. The one half terms cancel out to zero, leaving exactly x e to the 2x. Our result matches the original integrand perfectly.",
      beats: [
        {
          type: "write",
          text: "Check: d/dx [ ½ x·e^(2x) − ¼ e^(2x) + C ]",
          color: "white",
          size: "md",
          say: "Taking the derivative of our result with the product rule",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "= ½ e^(2x) + x·e^(2x) − ½ e^(2x) = x·e^(2x) ✓",
          color: "green",
          size: "md",
          say: "The one half terms cancel out to zero, leaving exactly x e to the 2x",
        },
        {
          type: "point",
          target: "text:= ½ e^(2x) + x·e^(2x) − ½ e^(2x) = x·e^(2x) ✓",
          ms: 1300,
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

/** The showcase lesson list — empty for fresh generation */
export const SAMPLE_LESSONS: SolveScript[] = [];

export const EXAMPLE_QUESTIONS = [
  "Evaluate ∫ x · e^(2x) dx using integration by parts",
  "A 10 kg block slides on a 30° incline with friction — find its acceleration",
  "Differentiate f(x) = x³ · sin(x)",
  "Solve the differential equation dy/dx = 3x² · y",
  "Find the limit as x approaches 0 of sin(x) / x",
  "Calculate the center of mass of a semicircular wire of radius R",
];
