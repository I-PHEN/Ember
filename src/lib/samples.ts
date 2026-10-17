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
        "In this video, we are going to focus on integration by parts. Now, before we write down any formulas, let us take a moment to look at our problem. We want to evaluate the indefinite integral of x times e to the 2x dx. Notice that regular u-substitution does not work here, because x is an algebraic polynomial, while e to the 2x is an exponential function. Whenever you face a product of two fundamentally different functions, integration by parts is our primary method. So let us write down our integral.",
      segments: [
        {
          say: "In this video, we are going to focus on integration by parts. Now, before we write down any formulas, let us take a moment to look at our problem. We want to evaluate the indefinite integral of x times e to the 2x dx. Notice that regular u-substitution does not work here, because x is an algebraic polynomial, while e to the 2x is an exponential function. Whenever you face a product of two fundamentally different functions, integration by parts is our primary method.",
          ink: [],
        },
        {
          say: "So let us write down our integral.",
          ink: [
            {
              type: "title",
              text: "Integration by Parts",
              color: "yellow",
            },
            {
              type: "write",
              text: "Evaluate: ∫ x · e^(2x) dx",
              color: "blue",
              size: "lg",
            },
          ],
        },
      ],
      beats: [
        {
          type: "title",
          text: "Integration by Parts",
          color: "yellow",
        },
        {
          type: "write",
          text: "Evaluate: ∫ x · e^(2x) dx",
          color: "blue",
          size: "lg",
          say: "So let us write down our integral.",
        },
      ],
    },
    {
      chapter: "The formula & LIATE strategy",
      narration:
        "Now let us recall the governing formula for integration by parts. The formula states that the integral of u dv equals u times v minus the integral of v du. To choose our u and dv wisely, we follow the classic LIATE rule: Logarithmic, Inverse trigonometric, Algebraic, Trigonometric, and Exponential. Since algebraic x comes before exponential e to the 2x, we choose u to be x.",
      segments: [
        {
          say: "Now let us recall the governing formula for integration by parts.",
          ink: [],
        },
        {
          say: "The formula states that the integral of u dv equals u times v minus the integral of v du.",
          ink: [
            {
              type: "write",
              text: "Formula: ∫ u dv = u·v − ∫ v du",
              color: "orange",
              size: "md",
            },
            {
              type: "underline",
              target: "text:Formula: ∫ u dv = u·v − ∫ v du",
              color: "orange",
            },
          ],
        },
        {
          say: "To choose our u and dv wisely, we follow the classic LIATE rule: Logarithmic, Inverse trigonometric, Algebraic, Trigonometric, and Exponential.",
          ink: [],
        },
        {
          say: "Since algebraic x comes before exponential e to the 2x, we choose u to be x.",
          ink: [
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "Choose: u = x  (Algebraic before Exponential)",
              color: "yellow",
              size: "md",
            },
            {
              type: "point",
              target: "text:Choose: u = x",
              ms: 1500,
            },
          ],
        },
      ],
      beats: [
        {
          type: "write",
          text: "Formula: ∫ u dv = u·v − ∫ v du",
          color: "orange",
          size: "md",
          say: "The formula states that the integral of u dv equals u times v minus the integral of v du.",
        },
        {
          type: "underline",
          target: "text:Formula: ∫ u dv = u·v − ∫ v du",
          color: "orange",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "Choose: u = x  (Algebraic before Exponential)",
          color: "yellow",
          size: "md",
          say: "Since algebraic x comes before exponential e to the 2x, we choose u to be x.",
        },
        {
          type: "point",
          target: "text:Choose: u = x",
          ms: 1500,
        },
      ],
    },
    {
      chapter: "Assigning u, dv and computing du, v",
      narration:
        "Now let us find all four components for our formula. First, setting u equal to x, we differentiate both sides to get du equals dx. Next, what remains in our integrand becomes dv, so dv equals e to the 2x dx. Integrating both sides gives v equals one half e to the 2x. Notice how clean this is: differentiating u reduced x to a constant.",
      segments: [
        {
          say: "Now let us find all four components for our formula.",
          ink: [],
        },
        {
          say: "First, setting u equal to x, we differentiate both sides to get du equals dx.",
          ink: [
            { type: "erase" },
            {
              type: "write",
              text: "u = x            →   du = dx",
              color: "white",
              size: "md",
            },
          ],
        },
        {
          say: "Next, what remains in our integrand becomes dv, so dv equals e to the 2x dx. Integrating both sides gives v equals one half e to the 2x.",
          ink: [
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "dv = e^(2x) dx   →   v = ½ e^(2x)",
              color: "yellow",
              size: "md",
            },
          ],
        },
        {
          say: "Notice how clean this is: differentiating u reduced x to a constant.",
          ink: [
            {
              type: "point",
              target: "text:v = ½ e^(2x)",
              ms: 1400,
            },
          ],
        },
      ],
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "u = x            →   du = dx",
          color: "white",
          size: "md",
          say: "First, setting u equal to x, we differentiate both sides to get du equals dx.",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "dv = e^(2x) dx   →   v = ½ e^(2x)",
          color: "yellow",
          size: "md",
          say: "Next, what remains in our integrand becomes dv, so dv equals e to the 2x dx. Integrating both sides gives v equals one half e to the 2x.",
        },
        {
          type: "point",
          target: "text:v = ½ e^(2x)",
          ms: 1400,
        },
      ],
    },
    {
      chapter: "Applying the integration by parts formula",
      narration:
        "With all four components ready, we assemble them into our integration by parts formula. First, we write u times v, which gives one half x times e to the 2x. Next, we subtract the integral of v du, which is one half integral of e to the 2x dx. Notice how the troublesome x has completely vanished from inside the integral.",
      segments: [
        {
          say: "With all four components ready, we assemble them into our integration by parts formula.",
          ink: [],
        },
        {
          say: "First, we write u times v, which gives one half x times e to the 2x. Next, we subtract the integral of v du, which is one half integral of e to the 2x dx.",
          ink: [
            { type: "erase" },
            {
              type: "write",
              text: "∫ x·e^(2x) dx = ½ x·e^(2x) − ½ ∫ e^(2x) dx",
              color: "white",
              size: "md",
            },
          ],
        },
        {
          say: "Notice how the troublesome x has completely vanished from inside the integral.",
          ink: [
            {
              type: "point",
              target: "text:∫ x·e^(2x) dx = ½ x·e^(2x) − ½ ∫ e^(2x) dx",
              ms: 1500,
            },
          ],
        },
      ],
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "∫ x·e^(2x) dx = ½ x·e^(2x) − ½ ∫ e^(2x) dx",
          color: "white",
          size: "md",
          say: "First, we write u times v, which gives one half x times e to the 2x. Next, we subtract the integral of v du, which is one half integral of e to the 2x dx.",
        },
        {
          type: "point",
          target: "text:∫ x·e^(2x) dx = ½ x·e^(2x) − ½ ∫ e^(2x) dx",
          ms: 1500,
        },
      ],
    },
    {
      chapter: "Evaluating the final integral & boxing result",
      narration:
        "Now we evaluate the remaining integral. Integrating e to the 2x brings down another factor of one half, producing one fourth e to the 2x, plus our constant of integration C. And that is our final answer. Let us put a box around that.",
      segments: [
        {
          say: "Now we evaluate the remaining integral.",
          ink: [],
        },
        {
          say: "Integrating e to the 2x brings down another factor of one half, producing one fourth e to the 2x, plus our constant of integration C.",
          ink: [
            { type: "newline", n: 2 },
            {
              type: "write",
              text: "= ½ x·e^(2x) − ¼ e^(2x) + C",
              color: "green",
              size: "lg",
              keep: true,
            },
          ],
        },
        {
          say: "And that is our final answer. Let us put a box around that.",
          pauseAfter: 2.0,
          ink: [
            {
              type: "box",
              target: "text:= ½ x·e^(2x) − ¼ e^(2x) + C",
              color: "yellow",
            },
          ],
        },
      ],
      beats: [
        { type: "newline", n: 2 },
        {
          type: "write",
          text: "= ½ x·e^(2x) − ¼ e^(2x) + C",
          color: "green",
          size: "lg",
          keep: true,
          say: "Integrating e to the 2x brings down another factor of one half, producing one fourth e to the 2x, plus our constant of integration C.",
        },
        {
          type: "box",
          target: "text:= ½ x·e^(2x) − ¼ e^(2x) + C",
          color: "yellow",
        },
      ],
    },
    {
      chapter: "Verifying the answer by differentiation",
      narration:
        "Finally, let us verify our answer by differentiating with the product rule. The derivative of one half x e to the 2x gives one half e to the 2x plus x e to the 2x, and the derivative of minus one fourth e to the 2x gives minus one half e to the 2x. The one half terms cancel out to zero, leaving exactly x e to the 2x. Our result matches the original integrand perfectly.",
      segments: [
        {
          say: "Finally, let us verify our answer by differentiating with the product rule.",
          ink: [
            { type: "erase", keep: ["= ½ x·e^(2x) − ¼ e^(2x) + C"] },
            {
              type: "write",
              text: "Check: d/dx [ ½ x·e^(2x) − ¼ e^(2x) + C ]",
              color: "white",
              size: "md",
            },
          ],
        },
        {
          say: "The derivative of one half x e to the 2x gives one half e to the 2x plus x e to the 2x, and the derivative of minus one fourth e to the 2x gives minus one half e to the 2x.",
          ink: [],
        },
        {
          say: "The one half terms cancel out to zero, leaving exactly x e to the 2x.",
          ink: [
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "= ½ e^(2x) + x·e^(2x) − ½ e^(2x) = x·e^(2x) ✓",
              color: "green",
              size: "md",
            },
            {
              type: "point",
              target: "text:= x·e^(2x) ✓",
              ms: 1600,
            },
          ],
        },
        {
          say: "Our result matches the original integrand perfectly.",
          ink: [],
        },
      ],
      beats: [
        { type: "erase", keep: ["= ½ x·e^(2x) − ¼ e^(2x) + C"] },
        {
          type: "write",
          text: "Check: d/dx [ ½ x·e^(2x) − ¼ e^(2x) + C ]",
          color: "white",
          size: "md",
          say: "Finally, let us verify our answer by differentiating with the product rule.",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "= ½ e^(2x) + x·e^(2x) − ½ e^(2x) = x·e^(2x) ✓",
          color: "green",
          size: "md",
          say: "The one half terms cancel out to zero, leaving exactly x e to the 2x.",
        },
        {
          type: "point",
          target: "text:= x·e^(2x) ✓",
          ms: 1600,
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

/** Master Lesson: The Gaussian Integral */
export const SAMPLE_GAUSSIAN_INTEGRAL: SolveScript = {
  title: "The Gaussian Integral: ∫_{-∞}^∞ e^(-x²) dx = √π",
  subject: "Calculus",
  question: "Evaluate the Gaussian integral: I = ∫_{-∞}^∞ e^(-x²) dx by squaring and transforming to polar coordinates.",
  scenes: [
    {
      chapter: "Framing the Problem & The Squaring Trick",
      narration:
        "In this video, we want to evaluate one of the most famous and fundamental definite integrals in all of mathematics: the Gaussian integral, from negative infinity to infinity of e to the negative x squared dx. Looking at this integrand, there is no elementary antiderivative, so standard substitution or integration by parts will not work. Instead, we use a brilliant trick introduced by Poisson: we consider the square of the integral. We write I squared as the product of two independent single integrals: the integral with respect to x, times the integral with respect to y. Because x and y are dummy variables, both integrals have the exact same value I.",
      audio: {
        key: "7a5160943101ef452e1ad3115d9244a6f83688f0fa78bc0a6df77fd2e40353f1",
        narration:
          "In this video, we want to evaluate one of the most famous and fundamental definite integrals in all of mathematics: the Gaussian integral, from negative infinity to infinity of e to the negative x squared dx. Looking at this integrand, there is no elementary antiderivative, so standard substitution or integration by parts will not work. Instead, we use a brilliant trick introduced by Poisson: we consider the square of the integral. We write I squared as the product of two independent single integrals: the integral with respect to x, times the integral with respect to y. Because x and y are dummy variables, both integrals have the exact same value I.",
        dur: 40.238,
        segments: [
          { i: 0, t0: 0, t1: 23.721 },
          { i: 1, t0: 24.071, t1: 31.527 },
          { i: 2, t0: 35.527, t1: 40.238 },
        ],
      },
      segments: [
        {
          say: "In this video, we want to evaluate one of the most famous and fundamental definite integrals in all of mathematics: the Gaussian integral, from negative infinity to infinity of e to the negative x squared dx. Looking at this integrand, there is no elementary antiderivative, so standard substitution or integration by parts will not work. Instead, we use a brilliant trick introduced by Poisson: we consider the square of the integral.",
          ink: [],
        },
        {
          say: "We write I squared as the product of two independent single integrals: the integral with respect to x, times the integral with respect to y.",
          ink: [
            {
              type: "write",
              text: "I² = [∫_{-∞}^∞ e^{-x²} dx] · [∫_{-∞}^∞ e^{-y²} dy]",
              color: "white",
              size: "md",
            },
          ],
        },
        {
          say: "Because x and y are dummy variables, both integrals have the exact same value I.",
          ink: [],
        },
      ],
      beats: [
        {
          type: "write",
          text: "I² = [∫_{-∞}^∞ e^{-x²} dx] · [∫_{-∞}^∞ e^{-y²} dy]",
          color: "white",
          size: "md",
          say: "We write I squared as the product of two independent single integrals: the integral with respect to x, times the integral with respect to y.",
        },
      ],
    },
    {
      chapter: "Combining into a Double Integral Over R²",
      narration:
        "Since x and y vary independently over the entire real line from negative infinity to infinity, Fubini's theorem allows us to combine these two single integrals into one double integral over the entire two-dimensional xy-plane. This gives the double integral over the plane of e to the negative x squared plus y squared dx dy. Notice that the exponent now contains x squared plus y squared, which has perfect circular symmetry around the origin.",
      audio: {
        key: "fcff4492b5f5dd89047422de4fd67e67f9db3ee4bb5c0958f2ef723b7e7df034",
        narration:
          "Since x and y vary independently over the entire real line from negative infinity to infinity, Fubini's theorem allows us to combine these two single integrals into one double integral over the entire two-dimensional xy-plane. This gives the double integral over the plane of e to the negative x squared plus y squared dx dy. Notice that the exponent now contains x squared plus y squared, which has perfect circular symmetry around the origin.",
        dur: 33.787,
        segments: [
          { i: 0, t0: 0, t1: 15.144 },
          { i: 1, t0: 15.494, t1: 22.5 },
          { i: 2, t0: 26.5, t1: 33.787 },
        ],
      },
      segments: [
        {
          say: "Since x and y vary independently over the entire real line from negative infinity to infinity, Fubini's theorem allows us to combine these two single integrals into one double integral over the entire two-dimensional xy-plane.",
          ink: [],
        },
        {
          say: "This gives the double integral over the plane of e to the negative x squared plus y squared dx dy.",
          ink: [
            {
              type: "write",
              text: "I² = ∫_{-∞}^∞ ∫_{-∞}^∞ e^{-(x² + y²)} dx dy",
              color: "yellow",
              size: "md",
            },
          ],
        },
        {
          say: "Notice that the exponent now contains x squared plus y squared, which has perfect circular symmetry around the origin.",
          ink: [
            {
              type: "point",
              target: "text:-(x² + y²)",
              ms: 1500,
            },
          ],
        },
      ],
      beats: [
        {
          type: "write",
          text: "I² = ∫_{-∞}^∞ ∫_{-∞}^∞ e^{-(x² + y²)} dx dy",
          color: "yellow",
          size: "md",
          say: "This gives the double integral over the plane of e to the negative x squared plus y squared dx dy.",
        },
        {
          type: "point",
          target: "text:-(x² + y²)",
          ms: 1500,
        },
      ],
    },
    {
      chapter: "Converting to Polar Coordinates",
      narration:
        "That circular symmetry suggests transforming our coordinate system from Cartesian coordinates into polar coordinates. In polar coordinates, x squared plus y squared becomes r squared, the differential area element dx dy transforms into r dr dtheta, and the entire xy-plane is covered as r goes from zero to infinity, while theta goes from zero to 2pi. We substitute x squared plus y squared equals r squared, and dx dy equals r dr dtheta. Our double integral separates cleanly into the integral of dtheta from zero to 2pi, times the radial integral of r e to the negative r squared dr from zero to infinity. Notice that extra factor of r from the Jacobian determinant—that is the exact piece we needed to make the integrand analytically solvable.",
      audio: {
        key: "14c0c046476ee035b3163ea63304b8a779038146e45ca504dc6933ad2b001737",
        narration:
          "That circular symmetry suggests transforming our coordinate system from Cartesian coordinates into polar coordinates. In polar coordinates, x squared plus y squared becomes r squared, the differential area element dx dy transforms into r dr dtheta, and the entire xy-plane is covered as r goes from zero to infinity, while theta goes from zero to 2pi. We substitute x squared plus y squared equals r squared, and dx dy equals r dr dtheta. Our double integral separates cleanly into the integral of dtheta from zero to 2pi, times the radial integral of r e to the negative r squared dr from zero to infinity. Notice that extra factor of r from the Jacobian determinant—that is the exact piece we needed to make the integrand analytically solvable.",
        dur: 53.845,
        segments: [
          { i: 0, t0: 0, t1: 21.698 },
          { i: 1, t0: 22.048, t1: 28.194 },
          { i: 2, t0: 32.194, t1: 40.902 },
          { i: 3, t0: 44.902, t1: 53.845 },
        ],
      },
      segments: [
        {
          say: "That circular symmetry suggests transforming our coordinate system from Cartesian coordinates into polar coordinates. In polar coordinates, x squared plus y squared becomes r squared, the differential area element dx dy transforms into r dr dtheta, and the entire xy-plane is covered as r goes from zero to infinity, while theta goes from zero to 2pi.",
          ink: [],
        },
        {
          say: "We substitute x squared plus y squared equals r squared, and dx dy equals r dr dtheta.",
          ink: [
            { type: "erase" },
            {
              type: "write",
              text: "x² + y² = r²,   dx dy = r dr dθ",
              color: "orange",
              size: "md",
            },
          ],
        },
        {
          say: "Our double integral separates cleanly into the integral of dtheta from zero to 2pi, times the radial integral of r e to the negative r squared dr from zero to infinity.",
          ink: [
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "I² = [∫_0^{2π} dθ] · [∫_0^∞ r e^{-r²} dr]",
              color: "white",
              size: "md",
            },
          ],
        },
        {
          say: "Notice that extra factor of r from the Jacobian determinant—that is the exact piece we needed to make the integrand analytically solvable.",
          ink: [
            {
              type: "point",
              target: "text:r e^{-r²}",
              ms: 1500,
            },
          ],
        },
      ],
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "x² + y² = r²,   dx dy = r dr dθ",
          color: "orange",
          size: "md",
          say: "We substitute x squared plus y squared equals r squared, and dx dy equals r dr dtheta.",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "I² = [∫_0^{2π} dθ] · [∫_0^∞ r e^{-r²} dr]",
          color: "white",
          size: "md",
          say: "Our double integral separates cleanly into the integral of dtheta from zero to 2pi, times the radial integral of r e to the negative r squared dr from zero to infinity.",
        },
        {
          type: "point",
          target: "text:r e^{-r²}",
          ms: 1500,
        },
      ],
    },
    {
      chapter: "Evaluating the Integrals by Substitution",
      narration:
        "Now both integrals are completely straightforward to evaluate. The angular integral from zero to 2pi of dtheta is simply 2pi. For the radial integral, let us make a quick substitution: let u equal r squared, so du equals 2r dr, or r dr equals one half du. The angular integral over theta evaluates directly to 2pi. Setting u equal to r squared, the differential r dr becomes one half du. Integrating one half e to the negative u gives one half times negative e to the negative u from zero to infinity, which simplifies to one half. The negative sign cancels cleanly at the lower limit.",
      audio: {
        key: "82ec315324060dd1d483f5102f09b4fcb47bc12788f38291d62415a39e293d1f",
        narration:
          "Now both integrals are completely straightforward to evaluate. The angular integral from zero to 2pi of dtheta is simply 2pi. For the radial integral, let us make a quick substitution: let u equal r squared, so du equals 2r dr, or r dr equals one half du. The angular integral over theta evaluates directly to 2pi. Setting u equal to r squared, the differential r dr becomes one half du. Integrating one half e to the negative u gives one half times negative e to the negative u from zero to infinity, which simplifies to one half. The negative sign cancels cleanly at the lower limit.",
        dur: 49.855,
        segments: [
          { i: 0, t0: 0, t1: 15.668 },
          { i: 1, t0: 16.018, t1: 18.767 },
          { i: 2, t0: 22.767, t1: 28.523 },
          { i: 3, t0: 32.523, t1: 43.257 },
          { i: 4, t0: 47.257, t1: 49.855 },
        ],
      },
      segments: [
        {
          say: "Now both integrals are completely straightforward to evaluate. The angular integral from zero to 2pi of dtheta is simply 2pi. For the radial integral, let us make a quick substitution: let u equal r squared, so du equals 2r dr, or r dr equals one half du.",
          ink: [],
        },
        {
          say: "The angular integral over theta evaluates directly to 2pi.",
          ink: [
            { type: "erase" },
            {
              type: "write",
              text: "∫_0^{2π} dθ = 2π",
              color: "yellow",
              size: "md",
            },
          ],
        },
        {
          say: "Setting u equal to r squared, the differential r dr becomes one half du.",
          ink: [
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "u = r²   →   du = 2r dr   →   r dr = ½ du",
              color: "white",
              size: "sm",
            },
          ],
        },
        {
          say: "Integrating one half e to the negative u gives one half times negative e to the negative u from zero to infinity, which simplifies to one half.",
          ink: [
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "∫_0^∞ r e^{-r²} dr = ½ ∫_0^∞ e^{-u} du = ½",
              color: "green",
              size: "md",
            },
          ],
        },
        {
          say: "The negative sign cancels cleanly at the lower limit.",
          ink: [],
        },
      ],
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "∫_0^{2π} dθ = 2π",
          color: "yellow",
          size: "md",
          say: "The angular integral over theta evaluates directly to 2pi.",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "u = r²   →   du = 2r dr   →   r dr = ½ du",
          color: "white",
          size: "sm",
          say: "Setting u equal to r squared, the differential r dr becomes one half du.",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "∫_0^∞ r e^{-r²} dr = ½ ∫_0^∞ e^{-u} du = ½",
          color: "green",
          size: "md",
          say: "Integrating one half e to the negative u gives one half times negative e to the negative u from zero to infinity, which simplifies to one half.",
        },
      ],
    },
    {
      chapter: "Multiplying & Solving for I",
      narration:
        "Now let us multiply our two results together to find the value of I squared. Multiplying 2pi by one half, the twos cancel out to one, leaving I squared equals pi. Taking the square root of both sides, and remembering that e to the negative x squared is strictly positive everywhere, we conclude that I equals the square root of pi. And that is our celebrated final result: the Gaussian integral over the entire real line equals the square root of pi.",
      audio: {
        key: "5a2970ff5caae706d61bd8b30881a804c5a3d129876460770c559dca2a47cd65",
        narration:
          "Now let us multiply our two results together to find the value of I squared. Multiplying 2pi by one half, the twos cancel out to one, leaving I squared equals pi. Taking the square root of both sides, and remembering that e to the negative x squared is strictly positive everywhere, we conclude that I equals the square root of pi. And that is our celebrated final result: the Gaussian integral over the entire real line equals the square root of pi.",
        dur: 34.62,
        segments: [
          { i: 0, t0: 0, t1: 5.009 },
          { i: 1, t0: 5.359, t1: 9.526 },
          { i: 2, t0: 13.526, t1: 25.781 },
          { i: 3, t0: 27.781, t1: 34.62 },
        ],
      },
      segments: [
        {
          say: "Now let us multiply our two results together to find the value of I squared.",
          ink: [],
        },
        {
          say: "Multiplying 2pi by one half, the twos cancel out to one, leaving I squared equals pi.",
          ink: [
            { type: "erase" },
            {
              type: "write",
              text: "I² = (2π) · (½) = π",
              color: "white",
              size: "md",
            },
          ],
        },
        {
          say: "Taking the square root of both sides, and remembering that e to the negative x squared is strictly positive everywhere, we conclude that I equals the square root of pi.",
          pauseAfter: 2.0,
          ink: [
            { type: "newline", n: 2 },
            {
              type: "write",
              text: "I = √π",
              color: "green",
              size: "lg",
              keep: true,
            },
            {
              type: "box",
              target: "text:I = √π",
              color: "yellow",
            },
          ],
        },
        {
          say: "And that is our celebrated final result: the Gaussian integral over the entire real line equals the square root of pi.",
          ink: [],
        },
      ],
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "I² = (2π) · (½) = π",
          color: "white",
          size: "md",
          say: "Multiplying 2pi by one half, the twos cancel out to one, leaving I squared equals pi.",
        },
        { type: "newline", n: 2 },
        {
          type: "write",
          text: "I = √π",
          color: "green",
          size: "lg",
          keep: true,
          say: "Taking the square root of both sides, and remembering that e to the negative x squared is strictly positive everywhere, we conclude that I equals the square root of pi.",
        },
        {
          type: "box",
          target: "text:I = √π",
          color: "yellow",
        },
      ],
    },
    {
      chapter: "Verification & Symmetrical Half-Integral",
      narration:
        "To double check our result, let us consider the symmetry of the integrand. Because e to the negative x squared is an even function, the integral from zero to infinity is exactly half of the total integral. Since e to the negative negative x squared equals e to the negative x squared, the function is symmetric about the y-axis. Therefore the one-sided integral from zero to infinity equals one half root pi, confirming our total area. This famous integral is the foundation of the normal distribution in probability and wave packet mechanics in quantum physics.",
      audio: {
        key: "f44c1539c63f998cede1b0568bd66d93b9bd6baef2e279f4073a0790b5e489b2",
        narration:
          "To double check our result, let us consider the symmetry of the integrand. Because e to the negative x squared is an even function, the integral from zero to infinity is exactly half of the total integral. Since e to the negative negative x squared equals e to the negative x squared, the function is symmetric about the y-axis. Therefore the one-sided integral from zero to infinity equals one half root pi, confirming our total area. This famous integral is the foundation of the normal distribution in probability and wave packet mechanics in quantum physics.",
        dur: 40.566,
        segments: [
          { i: 0, t0: 0, t1: 11.902 },
          { i: 1, t0: 12.252, t1: 19.334 },
          { i: 2, t0: 23.334, t1: 30.136 },
          { i: 3, t0: 34.136, t1: 40.566 },
        ],
      },
      segments: [
        {
          say: "To double check our result, let us consider the symmetry of the integrand. Because e to the negative x squared is an even function, the integral from zero to infinity is exactly half of the total integral.",
          ink: [],
        },
        {
          say: "Since e to the negative negative x squared equals e to the negative x squared, the function is symmetric about the y-axis.",
          ink: [
            { type: "erase", keep: ["I = √π"] },
            {
              type: "write",
              text: "Check:  f(-x) = e^{-(-x)²} = e^{-x²}  (Even)",
              color: "white",
              size: "sm",
            },
          ],
        },
        {
          say: "Therefore the one-sided integral from zero to infinity equals one half root pi, confirming our total area.",
          ink: [
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "∫_0^∞ e^{-x²} dx = ½ ∫_{-∞}^∞ e^{-x²} dx = ½ √π ✓",
              color: "green",
              size: "md",
            },
            {
              type: "point",
              target: "text:½ √π ✓",
              ms: 1500,
            },
          ],
        },
        {
          say: "This famous integral is the foundation of the normal distribution in probability and wave packet mechanics in quantum physics.",
          ink: [],
        },
      ],
      beats: [
        { type: "erase", keep: ["I = √π"] },
        {
          type: "write",
          text: "Check:  f(-x) = e^{-(-x)²} = e^{-x²}  (Even)",
          color: "white",
          size: "sm",
          say: "Since e to the negative negative x squared equals e to the negative x squared, the function is symmetric about the y-axis.",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "∫_0^∞ e^{-x²} dx = ½ ∫_{-∞}^∞ e^{-x²} dx = ½ √π ✓",
          color: "green",
          size: "md",
          say: "Therefore the one-sided integral from zero to infinity equals one half root pi, confirming our total area.",
        },
        {
          type: "point",
          target: "text:½ √π ✓",
          ms: 1500,
        },
      ],
    },
  ],
};

/** Master Lesson: Block on Incline with Kinetic Friction (Ember 4-Beat Signature) */
export const SAMPLE_INCLINED_PLANE: SolveScript = {
  "title": "Acceleration of a Block Sliding Down an Inclined Plane with Friction",
  "subject": "Physics",
  "question": "A 5 kg block slides down a 30° incline with coefficient of kinetic friction μk = 0.20 (take g = 9.8 m/s²). Find the acceleration of the block down the incline.",
  "scenes": [
    {
      "chapter": "Setup & Free-Body Diagram",
      "narration": "Imagine releasing a wooden block onto an icy ramp; gravity pulls it down while friction drags its heels. Our given quantities are a five kilogram mass on a thirty degree incline, with friction coefficient zero point two zero. Here is our free-body diagram: gravity pulls straight down, the surface pushes back perpendicular, and friction resists up the ramp. By tilting our coordinate axes along the slope, the entire acceleration lives neatly along just one axis.",
      "beats": [
        {
          "type": "write",
          "text": "m = 5 kg,  θ = 30°,  μ_k = 0.20",
          "color": "blue",
          "size": "md",
          "say": "Our given quantities are a five kilogram mass on a thirty degree incline, with friction coefficient zero point two zero."
        },
        {
          "type": "freebody",
          "angle": 30,
          "color": "yellow",
          "block": "5 kg",
          "forces": [
            {
              "dir": "down",
              "label": "mg"
            },
            {
              "dir": "normal",
              "label": "N"
            },
            {
              "dir": "upslope",
              "label": "f_k"
            }
          ],
          "say": "Here is our free-body diagram: gravity pulls straight down, the surface pushes back perpendicular, and friction resists up the ramp."
        },
        {
          "type": "point",
          "ms": 1400,
          "target": "text:m = 5 kg",
          "say": "By tilting our coordinate axes along the slope, the entire acceleration lives neatly along just one axis."
        }
      ],
      "segments": [
        {
          "say": "Imagine releasing a wooden block onto an icy ramp; gravity pulls it down while friction drags its heels.",
          "ink": []
        },
        {
          "say": "Our given quantities are a five kilogram mass on a thirty degree incline, with friction coefficient zero point two zero.",
          "ink": [
            {
              "type": "write",
              "text": "m = 5 kg,  θ = 30°,  μ_k = 0.20",
              "color": "blue",
              "size": "md",
              "say": "Our given quantities are a five kilogram mass on a thirty degree incline, with friction coefficient zero point two zero."
            }
          ]
        },
        {
          "say": "Here is our free-body diagram: gravity pulls straight down, the surface pushes back perpendicular, and friction resists up the ramp.",
          "ink": [
            {
              "type": "freebody",
              "angle": 30,
              "color": "yellow",
              "block": "5 kg",
              "forces": [
                {
                  "dir": "down",
                  "label": "mg"
                },
                {
                  "dir": "normal",
                  "label": "N"
                },
                {
                  "dir": "upslope",
                  "label": "f_k"
                }
              ],
              "say": "Here is our free-body diagram: gravity pulls straight down, the surface pushes back perpendicular, and friction resists up the ramp."
            }
          ]
        },
        {
          "say": "By tilting our coordinate axes along the slope, the entire acceleration lives neatly along just one axis.",
          "ink": [
            {
              "type": "point",
              "ms": 1400,
              "target": "text:m = 5 kg",
              "say": "By tilting our coordinate axes along the slope, the entire acceleration lives neatly along just one axis."
            }
          ]
        }
      ],
      "intro": false,
      "audio": {
        "key": "1dc406af9c05347e106efb9956e1cf069b77d32bf4da34fd8333aa5e15b16206",
        "dur": 38.761,
        "segments": [
          {
            "i": 0,
            "t0": 0,
            "t1": 7.24
          },
          {
            "i": 1,
            "t0": 7.59,
            "t1": 14.67
          },
          {
            "i": 2,
            "t0": 18.67,
            "t1": 27.39
          },
          {
            "i": 3,
            "t0": 31.39,
            "t1": 38.761
          }
        ]
      }
    },
    {
      "chapter": "Governing Equations",
      "narration": "Why do we tilt the coordinate system instead of using standard horizontal and vertical axes? Because the block never lifts off the incline, so motion occurs strictly along our tilted x-axis. Along y, perpendicular to the ramp, the forces perfectly balance out to zero. Along x, downhill gravity battles uphill friction according to Newton's second law, where friction equals mu-k times the normal force.",
      "beats": [
        {
          "type": "erase",
          "say": "Because the block never lifts off the incline, so motion occurs strictly along our tilted x-axis."
        },
        {
          "type": "write",
          "text": "Axes:  x ∥ ramp,   y ⊥ ramp",
          "color": "blue",
          "size": "md",
          "say": "Because the block never lifts off the incline, so motion occurs strictly along our tilted x-axis."
        },
        {
          "type": "write",
          "text": "ΣF_y = N − mg cosθ = 0",
          "color": "white",
          "size": "md",
          "say": "Along y, perpendicular to the ramp, the forces perfectly balance out to zero."
        },
        {
          "type": "write",
          "text": "ΣF_x = ma,   f_k = μ_k N",
          "color": "green",
          "size": "md",
          "say": "Along x, downhill gravity battles uphill friction according to Newton's second law, where friction equals mu-k times the normal force."
        },
        {
          "type": "point",
          "ms": 1400,
          "target": "text:f_k = μ_k N",
          "say": "Along x, downhill gravity battles uphill friction according to Newton's second law, where friction equals mu-k times the normal force."
        }
      ],
      "segments": [
        {
          "say": "Why do we tilt the coordinate system instead of using standard horizontal and vertical axes?",
          "ink": []
        },
        {
          "say": "Because the block never lifts off the incline, so motion occurs strictly along our tilted x-axis.",
          "ink": [
            {
              "type": "erase",
              "say": "Because the block never lifts off the incline, so motion occurs strictly along our tilted x-axis."
            },
            {
              "type": "write",
              "text": "Axes:  x ∥ ramp,   y ⊥ ramp",
              "color": "blue",
              "size": "md",
              "say": "Because the block never lifts off the incline, so motion occurs strictly along our tilted x-axis."
            }
          ]
        },
        {
          "say": "Along y, perpendicular to the ramp, the forces perfectly balance out to zero.",
          "ink": [
            {
              "type": "write",
              "text": "ΣF_y = N − mg cosθ = 0",
              "color": "white",
              "size": "md",
              "say": "Along y, perpendicular to the ramp, the forces perfectly balance out to zero."
            }
          ]
        },
        {
          "say": "Along x, downhill gravity battles uphill friction according to Newton's second law, where friction equals mu-k times the normal force.",
          "ink": [
            {
              "type": "write",
              "text": "ΣF_x = ma,   f_k = μ_k N",
              "color": "green",
              "size": "md",
              "say": "Along x, downhill gravity battles uphill friction according to Newton's second law, where friction equals mu-k times the normal force."
            },
            {
              "type": "point",
              "ms": 1400,
              "target": "text:f_k = μ_k N",
              "say": "Along x, downhill gravity battles uphill friction according to Newton's second law, where friction equals mu-k times the normal force."
            }
          ]
        }
      ],
      "intro": false,
      "audio": {
        "key": "c772ada9e9bb8f14e7e99b376432619278214cf5bac4b0c52b519250ac49fcfd",
        "dur": 34.521,
        "segments": [
          {
            "i": 0,
            "t0": 0,
            "t1": 5.36
          },
          {
            "i": 1,
            "t0": 5.71,
            "t1": 11.881
          },
          {
            "i": 2,
            "t0": 15.881,
            "t1": 21.481
          },
          {
            "i": 3,
            "t0": 25.481,
            "t1": 34.521
          }
        ]
      }
    },
    {
      "chapter": "Normal Force Calculation",
      "narration": "Before calculating downhill forces, we have to determine how hard the surface presses back against the block. Gravity splits into components: m g sine thirty pulling downhill, and m g cosine thirty pressing into the ramp. Perpendicular equilibrium gives us normal force N equals m g cosine thirty degrees. Pause here: what does that make our friction force? Multiplying by our friction coefficient, friction is exactly mu-k times m g cosine thirty.",
      "beats": [
        {
          "type": "erase",
          "say": "Gravity splits into components: m g sine thirty pulling downhill, and m g cosine thirty pressing into the ramp."
        },
        {
          "type": "write",
          "text": "W_y = mg cos(30°)",
          "color": "blue",
          "size": "md",
          "say": "Gravity splits into components: m g sine thirty pulling downhill, and m g cosine thirty pressing into the ramp."
        },
        {
          "type": "write",
          "text": "N = mg cos(30°) = 42.4 N",
          "color": "white",
          "size": "md",
          "say": "Perpendicular equilibrium gives us normal force N equals m g cosine thirty degrees."
        },
        {
          "type": "write",
          "text": "f_k = 0.20 (42.4 N)",
          "color": "orange",
          "size": "md",
          "say": "Pause here: what does that make our friction force?"
        },
        {
          "type": "write",
          "text": "f_k = 8.49 N",
          "color": "green",
          "size": "md",
          "say": "Multiplying by our friction coefficient, friction is exactly mu-k times m g cosine thirty."
        },
        {
          "type": "point",
          "ms": 1400,
          "target": "text:f_k = 8.49 N",
          "say": "Multiplying by our friction coefficient, friction is exactly mu-k times m g cosine thirty."
        }
      ],
      "segments": [
        {
          "say": "Before calculating downhill forces, we have to determine how hard the surface presses back against the block.",
          "ink": []
        },
        {
          "say": "Gravity splits into components: m g sine thirty pulling downhill, and m g cosine thirty pressing into the ramp.",
          "ink": [
            {
              "type": "erase",
              "say": "Gravity splits into components: m g sine thirty pulling downhill, and m g cosine thirty pressing into the ramp."
            },
            {
              "type": "write",
              "text": "W_y = mg cos(30°)",
              "color": "blue",
              "size": "md",
              "say": "Gravity splits into components: m g sine thirty pulling downhill, and m g cosine thirty pressing into the ramp."
            }
          ]
        },
        {
          "say": "Perpendicular equilibrium gives us normal force N equals m g cosine thirty degrees.",
          "ink": [
            {
              "type": "write",
              "text": "N = mg cos(30°) = 42.4 N",
              "color": "white",
              "size": "md",
              "say": "Perpendicular equilibrium gives us normal force N equals m g cosine thirty degrees."
            }
          ]
        },
        {
          "say": "Pause here: what does that make our friction force?",
          "ink": [
            {
              "type": "write",
              "text": "f_k = 0.20 (42.4 N)",
              "color": "orange",
              "size": "md",
              "say": "Pause here: what does that make our friction force?"
            }
          ]
        },
        {
          "say": "Multiplying by our friction coefficient, friction is exactly mu-k times m g cosine thirty.",
          "ink": [
            {
              "type": "write",
              "text": "f_k = 8.49 N",
              "color": "green",
              "size": "md",
              "say": "Multiplying by our friction coefficient, friction is exactly mu-k times m g cosine thirty."
            },
            {
              "type": "point",
              "ms": 1400,
              "target": "text:f_k = 8.49 N",
              "say": "Multiplying by our friction coefficient, friction is exactly mu-k times m g cosine thirty."
            }
          ]
        }
      ],
      "intro": false,
      "audio": {
        "key": "70644d616af8089395966d2c066dd2d9d6897bcf7eef323943735e45fac35d5d",
        "dur": 44.51,
        "segments": [
          {
            "i": 0,
            "t0": 0,
            "t1": 6.88
          },
          {
            "i": 1,
            "t0": 7.23,
            "t1": 14.51
          },
          {
            "i": 2,
            "t0": 18.51,
            "t1": 25.55
          },
          {
            "i": 3,
            "t0": 29.55,
            "t1": 32.63
          },
          {
            "i": 4,
            "t0": 36.63,
            "t1": 44.51
          }
        ]
      }
    },
    {
      "chapter": "Equation of Motion for Acceleration",
      "narration": "Now we can assemble the net force along the ramp and watch what happens to our mass. Downhill gravity minus opposing friction equals total mass times acceleration. Substitute our friction expression, and notice that every single term carries the mass m. Divide through by m, and mass disappears entirely: acceleration depends only on gravity, angle, and friction!",
      "beats": [
        {
          "type": "erase",
          "say": "Downhill gravity minus opposing friction equals total mass times acceleration."
        },
        {
          "type": "write",
          "text": "mg sinθ − f_k = ma",
          "color": "blue",
          "size": "md",
          "say": "Downhill gravity minus opposing friction equals total mass times acceleration."
        },
        {
          "type": "write",
          "text": "mg sinθ − μ_k mg cosθ = ma",
          "color": "white",
          "size": "md",
          "say": "Substitute our friction expression, and notice that every single term carries the mass m."
        },
        {
          "type": "write",
          "text": "a = g (sinθ − μ_k cosθ)",
          "color": "green",
          "size": "md",
          "say": "Divide through by m, and mass disappears entirely: acceleration depends only on gravity, angle, and friction!"
        },
        {
          "type": "point",
          "ms": 1400,
          "target": "text:a = g",
          "say": "Divide through by m, and mass disappears entirely: acceleration depends only on gravity, angle, and friction!"
        }
      ],
      "segments": [
        {
          "say": "Now we can assemble the net force along the ramp and watch what happens to our mass.",
          "ink": []
        },
        {
          "say": "Downhill gravity minus opposing friction equals total mass times acceleration.",
          "ink": [
            {
              "type": "erase",
              "say": "Downhill gravity minus opposing friction equals total mass times acceleration."
            },
            {
              "type": "write",
              "text": "mg sinθ − f_k = ma",
              "color": "blue",
              "size": "md",
              "say": "Downhill gravity minus opposing friction equals total mass times acceleration."
            }
          ]
        },
        {
          "say": "Substitute our friction expression, and notice that every single term carries the mass m.",
          "ink": [
            {
              "type": "write",
              "text": "mg sinθ − μ_k mg cosθ = ma",
              "color": "white",
              "size": "md",
              "say": "Substitute our friction expression, and notice that every single term carries the mass m."
            }
          ]
        },
        {
          "say": "Divide through by m, and mass disappears entirely: acceleration depends only on gravity, angle, and friction!",
          "ink": [
            {
              "type": "write",
              "text": "a = g (sinθ − μ_k cosθ)",
              "color": "green",
              "size": "md",
              "say": "Divide through by m, and mass disappears entirely: acceleration depends only on gravity, angle, and friction!"
            },
            {
              "type": "point",
              "ms": 1400,
              "target": "text:a = g",
              "say": "Divide through by m, and mass disappears entirely: acceleration depends only on gravity, angle, and friction!"
            }
          ]
        }
      ],
      "intro": false,
      "audio": {
        "key": "7352b0e0c951eef8d3ea44a4cd463267abc362227f3b10625ed3c81b2f7866bb",
        "dur": 35.321,
        "segments": [
          {
            "i": 0,
            "t0": 0,
            "t1": 5.44
          },
          {
            "i": 1,
            "t0": 5.79,
            "t1": 12.75
          },
          {
            "i": 2,
            "t0": 16.75,
            "t1": 22.95
          },
          {
            "i": 3,
            "t0": 26.95,
            "t1": 35.321
          }
        ]
      }
    },
    {
      "chapter": "Final Answer & Verification",
      "narration": "All that remains is feeding in our numbers to find our final downhill acceleration. Sine of thirty degrees is zero point five, while cosine is approximately zero point eight six six. Multiplying through gives nine point eight times zero point three two six eight. Our final acceleration is three point two zero meters per second squared. A frictionless ramp gives four point nine meters per second squared, so three point two zero makes complete physical sense.",
      "beats": [
        {
          "type": "erase",
          "say": "Sine of thirty degrees is zero point five, while cosine is approximately zero point eight six six."
        },
        {
          "type": "write",
          "text": "a = 9.8 (0.50 − 0.173)",
          "color": "blue",
          "size": "md",
          "say": "Sine of thirty degrees is zero point five, while cosine is approximately zero point eight six six."
        },
        {
          "type": "write",
          "text": "a = 9.8 (0.3268)",
          "color": "white",
          "size": "md",
          "say": "Multiplying through gives nine point eight times zero point three two six eight."
        },
        {
          "type": "write",
          "text": "a = 3.20 m/s²",
          "color": "green",
          "size": "lg",
          "say": "Our final acceleration is three point two zero meters per second squared.",
          "keep": true
        },
        {
          "type": "box",
          "color": "yellow",
          "say": "Our final acceleration is three point two zero meters per second squared."
        },
        {
          "type": "point",
          "ms": 1400,
          "target": "text:a = 3.20 m/s²",
          "say": "A frictionless ramp gives four point nine meters per second squared, so three point two zero makes complete physical sense."
        }
      ],
      "segments": [
        {
          "say": "All that remains is feeding in our numbers to find our final downhill acceleration.",
          "ink": []
        },
        {
          "say": "Sine of thirty degrees is zero point five, while cosine is approximately zero point eight six six.",
          "ink": [
            {
              "type": "erase",
              "say": "Sine of thirty degrees is zero point five, while cosine is approximately zero point eight six six."
            },
            {
              "type": "write",
              "text": "a = 9.8 (0.50 − 0.173)",
              "color": "blue",
              "size": "md",
              "say": "Sine of thirty degrees is zero point five, while cosine is approximately zero point eight six six."
            }
          ]
        },
        {
          "say": "Multiplying through gives nine point eight times zero point three two six eight.",
          "ink": [
            {
              "type": "write",
              "text": "a = 9.8 (0.3268)",
              "color": "white",
              "size": "md",
              "say": "Multiplying through gives nine point eight times zero point three two six eight."
            }
          ]
        },
        {
          "say": "Our final acceleration is three point two zero meters per second squared.",
          "ink": [
            {
              "type": "write",
              "text": "a = 3.20 m/s²",
              "color": "green",
              "size": "lg",
              "say": "Our final acceleration is three point two zero meters per second squared.",
              "keep": true
            },
            {
              "type": "box",
              "color": "yellow",
              "say": "Our final acceleration is three point two zero meters per second squared."
            }
          ],
          "pauseAfter": 2
        },
        {
          "say": "A frictionless ramp gives four point nine meters per second squared, so three point two zero makes complete physical sense.",
          "ink": [
            {
              "type": "point",
              "ms": 1400,
              "target": "text:a = 3.20 m/s²",
              "say": "A frictionless ramp gives four point nine meters per second squared, so three point two zero makes complete physical sense."
            }
          ]
        }
      ],
      "intro": false,
      "audio": {
        "key": "0932f6c094fa279b597f9c6c953f57cd3a6ce8e27ebc9e0f11ea644e8c1c3108",
        "dur": 43.561,
        "segments": [
          {
            "i": 0,
            "t0": 0,
            "t1": 5.251
          },
          {
            "i": 1,
            "t0": 5.601,
            "t1": 11.921
          },
          {
            "i": 2,
            "t0": 15.921,
            "t1": 22.041
          },
          {
            "i": 3,
            "t0": 26.041,
            "t1": 31.361
          },
          {
            "i": 4,
            "t0": 35.361,
            "t1": 43.561
          }
        ]
      }
    }
  ]
};

/** The curated showcase lesson list for demos and judge review */
export const SAMPLE_LESSONS: SolveScript[] = [
  SAMPLE_INCLINED_PLANE,
  SAMPLE_GAUSSIAN_INTEGRAL,
];

export const SAMPLE_SOLVE = SAMPLE_GAUSSIAN_INTEGRAL;
export const SAMPLE_PHYSICS = SAMPLE_INCLINED_PLANE;

export const EXAMPLE_QUESTIONS = [
  "Evaluate ∫ x · e^(2x) dx using integration by parts",
  "A 10 kg block slides on a 30° incline with friction — find its acceleration",
  "Differentiate f(x) = x³ · sin(x)",
  "Solve the differential equation dy/dx = 3x² · y",
  "Find the limit as x approaches 0 of sin(x) / x",
  "Calculate the center of mass of a semicircular wire of radius R",
];
