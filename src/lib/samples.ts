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
          say: "So let us write down our integral: the indefinite integral of x times e to the 2x dx",
        },
      ],
    },
    {
      chapter: "The formula & LIATE strategy",
      narration:
        "Now let us recall the governing formula for integration by parts. The formula states that the integral of u dv equals u times v minus the integral of v du. To choose our u and dv wisely, we follow the classic LIATE rule: Logarithmic, Inverse trigonometric, Algebraic, Trigonometric, and Exponential. Since algebraic x comes before exponential e to the 2x, we choose u to be x.",
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
          text: "Choose: u = x  (Algebraic before Exponential)",
          color: "yellow",
          size: "md",
          say: "Since algebraic x comes before exponential e to the 2x, we choose u to be x",
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
          say: "Next, what remains in our integrand becomes dv, so dv equals e to the 2x dx. Integrating both sides gives v equals one half e to the 2x",
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
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "∫ x·e^(2x) dx = ½ x·e^(2x) − ½ ∫ e^(2x) dx",
          color: "white",
          size: "md",
          say: "First, we write u times v, which gives one half x times e to the 2x. Next, we subtract the integral of v du, which is one half integral of e to the 2x dx",
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
      beats: [
        { type: "newline", n: 2 },
        {
          type: "write",
          text: "= ½ x·e^(2x) − ¼ e^(2x) + C",
          color: "green",
          size: "lg",
          keep: true,
          say: "Integrating e to the 2x brings down another factor of one half, producing one fourth e to the 2x, plus our constant of integration C",
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
      beats: [
        { type: "erase", keep: ["= ½ x·e^(2x) − ¼ e^(2x) + C"] },
        {
          type: "write",
          text: "Check: d/dx [ ½ x·e^(2x) − ¼ e^(2x) + C ]",
          color: "white",
          size: "md",
          say: "Finally, let us verify our answer by differentiating with the product rule",
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
        key: "a8c6496a76696bbbdc33aae10b55a1538c262d8319045e8777a4bcd046d5c762",
        narration: "In this video, we want to evaluate one of the most famous and fundamental definite integrals in all of mathematics: the Gaussian integral, from negative infinity to infinity of e to the negative x squared dx. Looking at this integrand, there is no elementary antiderivative, so standard substitution or integration by parts will not work. Instead, we use a brilliant trick introduced by Poisson: we consider the square of the integral. We write I squared as the product of two independent single integrals: the integral with respect to x, times the integral with respect to y. Because x and y are dummy variables, both integrals have the exact same value I."
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
        key: "b8a3e9f1814ddb783b102550e67a466080f4f69c0c5af8e198f435edb47b81e4",
        narration: "Since x and y vary independently over the entire real line from negative infinity to infinity, Fubini's theorem allows us to combine these two single integrals into one double integral over the entire two-dimensional xy-plane. This gives the double integral over the plane of e to the negative x squared plus y squared dx dy. Notice that the exponent now contains x squared plus y squared, which has perfect circular symmetry around the origin."
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
        key: "ff0747d917311e5e687dc0262646d3e529f298f8df13c160259f5e88a90612ca",
        narration: "That circular symmetry suggests transforming our coordinate system from Cartesian coordinates into polar coordinates. In polar coordinates, x squared plus y squared becomes r squared, the differential area element dx dy transforms into r dr dtheta, and the entire xy-plane is covered as r goes from zero to infinity, while theta goes from zero to 2pi. We substitute x squared plus y squared equals r squared, and dx dy equals r dr dtheta. Our double integral separates cleanly into the integral of dtheta from zero to 2pi, times the radial integral of r e to the negative r squared dr from zero to infinity. Notice that extra factor of r from the Jacobian determinant—that is the exact piece we needed to make the integrand analytically solvable."
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
        key: "01a9e441a0cc035b029a8f11080bd3557feef8275221111ad92ab78e95fd46dd",
        narration: "Now both integrals are completely straightforward to evaluate. The angular integral from zero to 2pi of dtheta is simply 2pi. For the radial integral, let us make a quick substitution: let u equal r squared, so du equals 2r dr, or r dr equals one half du. The angular integral over theta evaluates directly to 2pi. Setting u equal to r squared, the differential r dr becomes one half du. Integrating one half e to the negative u gives one half times negative e to the negative u from zero to infinity, which simplifies to one half. The negative sign cancels cleanly at the lower limit."
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
        key: "b6c64ef62fb7f4e98cb6a3ea32eae47365b6cf8c515975cdcd415fb2d8182a9f",
        narration: "Now let us multiply our two results together to find the value of I squared. Multiplying 2pi by one half, the twos cancel out to one, leaving I squared equals pi. Taking the square root of both sides, and remembering that e to the negative x squared is strictly positive everywhere, we conclude that I equals the square root of pi. And that is our celebrated final result: the Gaussian integral over the entire real line equals the square root of pi."
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
        key: "e9bfea3cf0e6a29cc898981b2af197ada9552e20f851b5c1eb94e3e112592a26",
        narration: "To double check our result, let us consider the symmetry of the integrand. Because e to the negative x squared is an even function, the integral from zero to infinity is exactly half of the total integral. Since e to the negative negative x squared equals e to the negative x squared, the function is symmetric about the y-axis. Therefore the one-sided integral from zero to infinity equals one half root pi, confirming our total area. This famous integral is the foundation of the normal distribution in probability and wave packet mechanics in quantum physics."
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

/** Master Lesson: Block on Incline with Static Friction */
export const SAMPLE_INCLINED_PLANE: SolveScript = {
  title: "Block on Incline: Critical Angle tan(θ_c) = μ_s",
  subject: "Physics",
  question: "Find the critical angle θ_c at which a block on an incline begins to slip, given static friction coefficient μ_s.",
  scenes: [
    {
      chapter: "Problem Setup & Coordinate Axes",
      narration:
        "In this mechanics lecture, we analyze a classic physics question: a block of mass m rests on an inclined plane with a static friction coefficient mu s. As we slowly tilt the ramp upward, at what critical angle theta c will the block just begin to slip down the slope? We are given a block of mass m and a static friction coefficient mu s. We tilt our coordinate system so the x-axis points down along the ramp and the y-axis is perpendicular to the surface. Tilting our axes ensures the normal force and acceleration lie along single coordinate directions.",
      segments: [
        {
          say: "In this mechanics lecture, we analyze a classic physics question: a block of mass m rests on an inclined plane with a static friction coefficient mu s. As we slowly tilt the ramp upward, at what critical angle theta c will the block just begin to slip down the slope?",
          ink: [],
        },
        {
          say: "We are given a block of mass m and a static friction coefficient mu s.",
          ink: [
            {
              type: "write",
              text: "Given: Mass m,  Static friction coefficient μ_s",
              color: "yellow",
              size: "md",
            },
          ],
        },
        {
          say: "We tilt our coordinate system so the x-axis points down along the ramp and the y-axis is perpendicular to the surface.",
          ink: [
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "Axes:  x || downslope,   y ⊥ ramp",
              color: "orange",
              size: "md",
            },
          ],
        },
        {
          say: "Tilting our axes ensures the normal force and acceleration lie along single coordinate directions.",
          ink: [],
        },
      ],
      beats: [
        {
          type: "write",
          text: "Given: Mass m,  Static friction coefficient μ_s",
          color: "yellow",
          size: "md",
          say: "We are given a block of mass m and a static friction coefficient mu s.",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "Axes:  x || downslope,   y ⊥ ramp",
          color: "orange",
          size: "md",
          say: "We tilt our coordinate system so the x-axis points down along the ramp and the y-axis is perpendicular to the surface.",
        },
      ],
    },
    {
      chapter: "Constructing the Free-Body Diagram",
      narration:
        "Whenever you solve an inclined plane problem in mechanics, the single most important step is constructing an accurate free-body diagram to identify every force acting on the block. Three forces act on our block: gravity mg acting vertically downward, the normal force N pointing perpendicular out of the incline, and static friction f s opposing motion by pointing up the slope. Notice that gravity does not align with our tilted axes, so we must resolve it into perpendicular and parallel components.",
      segments: [
        {
          say: "Whenever you solve an inclined plane problem in mechanics, the single most important step is constructing an accurate free-body diagram to identify every force acting on the block.",
          ink: [],
        },
        {
          say: "Three forces act on our block: gravity mg acting vertically downward, the normal force N pointing perpendicular out of the incline, and static friction f s opposing motion by pointing up the slope.",
          ink: [
            { type: "erase" },
            {
              type: "freebody",
              angle: 30,
              block: "m",
              forces: [
                { label: "mg", dir: "down" },
                { label: "N", dir: "normal" },
                { label: "f_s", dir: "upslope" },
              ],
              color: "yellow",
            },
          ],
        },
        {
          say: "Notice that gravity does not align with our tilted axes, so we must resolve it into perpendicular and parallel components.",
          ink: [
            {
              type: "point",
              target: "last",
              ms: 1500,
            },
          ],
        },
      ],
      beats: [
        { type: "erase" },
        {
          type: "freebody",
          angle: 30,
          block: "m",
          forces: [
            { label: "mg", dir: "down" },
            { label: "N", dir: "normal" },
            { label: "f_s", dir: "upslope" },
          ],
          color: "yellow",
          say: "Three forces act on our block: gravity mg acting vertically downward, the normal force N pointing perpendicular out of the incline, and static friction f s opposing motion by pointing up the slope.",
        },
        {
          type: "point",
          target: "last",
          ms: 1500,
        },
      ],
    },
    {
      chapter: "Resolving Gravity into Components",
      narration:
        "Let us break the gravitational force mg into its two components relative to the incline. By similar triangles with the ramp angle theta, the component acting perpendicular into the incline is mg cosine theta, while the component pulling the block down along the ramp is mg sine theta. The perpendicular component pushing the block into the ramp is mg cosine theta. The downslope component pulling the block downhill is mg sine theta. As the tilt angle increases, the downslope pull mg sine theta increases, while the normal clamping force decreases.",
      segments: [
        {
          say: "Let us break the gravitational force mg into its two components relative to the incline. By similar triangles with the ramp angle theta, the component acting perpendicular into the incline is mg cosine theta, while the component pulling the block down along the ramp is mg sine theta.",
          ink: [],
        },
        {
          say: "The perpendicular component pushing the block into the ramp is mg cosine theta.",
          ink: [
            { type: "erase" },
            {
              type: "write",
              text: "mg_⊥ = mg·cosθ   (Normal clamping)",
              color: "white",
              size: "md",
            },
          ],
        },
        {
          say: "The downslope component pulling the block downhill is mg sine theta.",
          ink: [
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "mg_|| = mg·sinθ   (Downhill driving)",
              color: "orange",
              size: "md",
            },
          ],
        },
        {
          say: "As the tilt angle increases, the downslope pull mg sine theta increases, while the normal clamping force decreases.",
          ink: [
            {
              type: "point",
              target: "text:mg·sinθ",
              ms: 1500,
            },
          ],
        },
      ],
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "mg_⊥ = mg·cosθ   (Normal clamping)",
          color: "white",
          size: "md",
          say: "The perpendicular component pushing the block into the ramp is mg cosine theta.",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "mg_|| = mg·sinθ   (Downhill driving)",
          color: "orange",
          size: "md",
          say: "The downslope component pulling the block downhill is mg sine theta.",
        },
        {
          type: "point",
          target: "text:mg·sinθ",
          ms: 1500,
        },
      ],
    },
    {
      chapter: "Equilibrium Equations in Perpendicular & Downslope Directions",
      narration:
        "Right before the block begins to slip, the system is in static equilibrium, so Newton's second law requires the sum of forces to equal zero in both coordinate directions. In the y direction, the normal force N minus mg cosine theta equals zero, so N equals mg cosine theta. In the x direction, the downhill pull mg sine theta minus static friction f s equals zero, so f s equals mg sine theta. The static friction force adjusts itself to exactly match the downhill pull, up to its maximum threshold.",
      segments: [
        {
          say: "Right before the block begins to slip, the system is in static equilibrium, so Newton's second law requires the sum of forces to equal zero in both coordinate directions.",
          ink: [],
        },
        {
          say: "In the y direction, the normal force N minus mg cosine theta equals zero, so N equals mg cosine theta.",
          ink: [
            { type: "erase" },
            {
              type: "write",
              text: "Σ F_y = 0  →  N = mg·cosθ",
              color: "yellow",
              size: "md",
            },
          ],
        },
        {
          say: "In the x direction, the downhill pull mg sine theta minus static friction f s equals zero, so f s equals mg sine theta.",
          ink: [
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "Σ F_x = 0  →  f_s = mg·sinθ",
              color: "white",
              size: "md",
            },
          ],
        },
        {
          say: "The static friction force adjusts itself to exactly match the downhill pull, up to its maximum threshold.",
          ink: [
            {
              type: "point",
              target: "text:f_s = mg·sinθ",
              ms: 1400,
            },
          ],
        },
      ],
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "Σ F_y = 0  →  N = mg·cosθ",
          color: "yellow",
          size: "md",
          say: "In the y direction, the normal force N minus mg cosine theta equals zero, so N equals mg cosine theta.",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "Σ F_x = 0  →  f_s = mg·sinθ",
          color: "white",
          size: "md",
          say: "In the x direction, the downhill pull mg sine theta minus static friction f s equals zero, so f s equals mg sine theta.",
        },
        {
          type: "point",
          target: "text:f_s = mg·sinθ",
          ms: 1400,
        },
      ],
    },
    {
      chapter: "Applying Coulomb Friction & Solving for θ_c",
      narration:
        "At the verge of impending slip, the static friction reaches its absolute maximum possible value, given by Coulomb's law: f s max equals mu s times the normal force N. At the critical slipping threshold, static friction equals mu s times the normal force N. Substituting our equilibrium expressions gives mg sine theta c equals mu s times mg cosine theta c. Dividing both sides by mg cosine theta c, the mass m and gravity g cancel completely, leaving tangent theta c equals mu s. And there is our final critical angle equation: tangent of theta c equals mu s.",
      segments: [
        {
          say: "At the verge of impending slip, the static friction reaches its absolute maximum possible value, given by Coulomb's law: f s max equals mu s times the normal force N.",
          ink: [],
        },
        {
          say: "At the critical slipping threshold, static friction equals mu s times the normal force N.",
          ink: [
            { type: "erase" },
            {
              type: "write",
              text: "At slip threshold:  f_{s,max} = μ_s · N",
              color: "orange",
              size: "sm",
            },
          ],
        },
        {
          say: "Substituting our equilibrium expressions gives mg sine theta c equals mu s times mg cosine theta c.",
          ink: [
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "mg·sinθ_c = μ_s · (mg·cosθ_c)",
              color: "white",
              size: "md",
            },
          ],
        },
        {
          say: "Dividing both sides by mg cosine theta c, the mass m and gravity g cancel completely, leaving tangent theta c equals mu s.",
          ink: [
            { type: "newline", n: 2 },
            {
              type: "write",
              text: "tan(θ_c) = μ_s",
              color: "green",
              size: "lg",
              keep: true,
            },
            {
              type: "box",
              target: "text:tan(θ_c) = μ_s",
              color: "yellow",
            },
          ],
        },
        {
          say: "And there is our final critical angle equation: tangent of theta c equals mu s.",
          ink: [],
        },
      ],
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "At slip threshold:  f_{s,max} = μ_s · N",
          color: "orange",
          size: "sm",
          say: "At the critical slipping threshold, static friction equals mu s times the normal force N.",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "mg·sinθ_c = μ_s · (mg·cosθ_c)",
          color: "white",
          size: "md",
          say: "Substituting our equilibrium expressions gives mg sine theta c equals mu s times mg cosine theta c.",
        },
        { type: "newline", n: 2 },
        {
          type: "write",
          text: "tan(θ_c) = μ_s",
          color: "green",
          size: "lg",
          keep: true,
          say: "Dividing both sides by mg cosine theta c, the mass m and gravity g cancel completely, leaving tangent theta c equals mu s.",
        },
        {
          type: "box",
          target: "text:tan(θ_c) = μ_s",
          color: "yellow",
        },
      ],
    },
    {
      chapter: "Physical Interpretation & Laboratory Significance",
      narration:
        "Let us reflect on why this result is so physically remarkable. Notice that the mass of the block m and the acceleration of gravity g both cancelled out completely. Whether you test a small wooden block or a massive concrete slab, on Earth or on the Moon, slipping begins at the exact same angle: theta c equals arctan of mu s. The critical angle theta c is simply the inverse tangent of mu s, completely independent of the mass or gravity. For instance, with a friction coefficient of zero point five seven seven, the critical angle is exactly thirty degrees. This provides one of the simplest laboratory methods to measure coefficients of static friction.",
      segments: [
        {
          say: "Let us reflect on why this result is so physically remarkable. Notice that the mass of the block m and the acceleration of gravity g both cancelled out completely. Whether you test a small wooden block or a massive concrete slab, on Earth or on the Moon, slipping begins at the exact same angle: theta c equals arctan of mu s.",
          ink: [],
        },
        {
          say: "The critical angle theta c is simply the inverse tangent of mu s, completely independent of the mass or gravity.",
          ink: [
            { type: "erase", keep: ["tan(θ_c) = μ_s"] },
            {
              type: "write",
              text: "θ_c = arctan(μ_s)   (Independent of mass m and g!)",
              color: "yellow",
              size: "sm",
            },
          ],
        },
        {
          say: "For instance, with a friction coefficient of zero point five seven seven, the critical angle is exactly thirty degrees.",
          ink: [
            { type: "newline", n: 1 },
            {
              type: "write",
              text: "Example: μ_s = 0.577  →  θ_c = 30° ✓",
              color: "green",
              size: "md",
            },
            {
              type: "point",
              target: "text:θ_c = 30° ✓",
              ms: 1500,
            },
          ],
        },
        {
          say: "This provides one of the simplest laboratory methods to measure coefficients of static friction.",
          ink: [],
        },
      ],
      beats: [
        { type: "erase", keep: ["tan(θ_c) = μ_s"] },
        {
          type: "write",
          text: "θ_c = arctan(μ_s)   (Independent of mass m and g!)",
          color: "yellow",
          size: "sm",
          say: "The critical angle theta c is simply the inverse tangent of mu s, completely independent of the mass or gravity.",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "Example: μ_s = 0.577  →  θ_c = 30° ✓",
          color: "green",
          size: "md",
          say: "For instance, with a friction coefficient of zero point five seven seven, the critical angle is exactly thirty degrees.",
        },
        {
          type: "point",
          target: "text:θ_c = 30° ✓",
          ms: 1500,
        },
      ],
    },
  ],
};

/** The curated showcase lesson list for demos and judge review */
export const SAMPLE_LESSONS: SolveScript[] = [
  SAMPLE_GAUSSIAN_INTEGRAL,
];

export const EXAMPLE_QUESTIONS = [
  "Evaluate ∫ x · e^(2x) dx using integration by parts",
  "A 10 kg block slides on a 30° incline with friction — find its acceleration",
  "Differentiate f(x) = x³ · sin(x)",
  "Solve the differential equation dy/dx = 3x² · y",
  "Find the limit as x approaches 0 of sin(x) / x",
  "Calculate the center of mass of a semicircular wire of radius R",
];
