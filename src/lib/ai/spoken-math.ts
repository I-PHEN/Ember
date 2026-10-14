/* ------------------------------------------------------------------
   Spoken Math Normalizer
   Converts raw LaTeX / mathematical notation into natural, conversational
   spoken English for the ear (written for Gemini neural TTS).
------------------------------------------------------------------- */

export function normalizeSpokenMath(raw: string): string {
  if (!raw || typeof raw !== "string") return "";

  let s = raw;

  // 1. Text wrappers and display markers (clean first so nested expressions are unmasked)
  s = s.replace(/\\displaystyle/g, "");
  s = s.replace(/\\limits/g, "");
  s = s.replace(/\$\$(.*?)\$\$/gs, "$1");
  s = s.replace(/\$(.*?)\$/g, "$1");
  s = s.replace(/\\text\{([^{}]+)\}/g, "$1");
  s = s.replace(/\\mathrm\{([^{}]+)\}/g, "$1");
  s = s.replace(/\\mathbf\{([^{}]+)\}/g, "$1");
  s = s.replace(/\\mathit\{([^{}]+)\}/g, "$1");

  // 2. Trigonometric functions (with trailing space if followed by symbol or Greek letter)
  s = s.replace(/\\sin(?=\\[a-zA-Z]|\b|\s)/g, "sine ");
  s = s.replace(/\\cos(?=\\[a-zA-Z]|\b|\s)/g, "cosine ");
  s = s.replace(/\\tan(?=\\[a-zA-Z]|\b|\s)/g, "tangent ");
  s = s.replace(/\\cot(?=\\[a-zA-Z]|\b|\s)/g, "cotangent ");
  s = s.replace(/\\sec(?=\\[a-zA-Z]|\b|\s)/g, "secant ");
  s = s.replace(/\\csc(?=\\[a-zA-Z]|\b|\s)/g, "cosecant ");

  // 3. Greek letters
  s = s.replace(/\\theta\b/g, "theta");
  s = s.replace(/\\pi\b/g, "pi");
  s = s.replace(/\\mu\b/g, "mu");
  s = s.replace(/\\alpha\b/g, "alpha");
  s = s.replace(/\\beta\b/g, "beta");
  s = s.replace(/\\gamma\b/g, "gamma");
  s = s.replace(/\\lambda\b/g, "lambda");
  s = s.replace(/\\sigma\b/g, "sigma");
  s = s.replace(/\\omega\b/g, "omega");
  s = s.replace(/\\phi\b/g, "phi");
  s = s.replace(/\\psi\b/g, "psi");
  s = s.replace(/\\delta\b/g, "delta");
  s = s.replace(/\\Delta\b/g, "delta");

  // 4. Fractions & Derivatives
  s = s.replace(/\\frac\{d([a-z])\}\{d([a-z])\}/gi, "d $1 over d $2");
  s = s.replace(/\\frac\{\\partial([a-z])\}\{\\partial([a-z])\}/gi, "partial $1 over partial $2");
  s = s.replace(/\\frac\{([^{}]+)\}\{([^{}]+)\}/g, "$1 over $2");

  // 5. Integrals: \int_{-\infty}^\infty -> the integral from negative infinity to infinity
  s = s.replace(/\\int_\{?-\\infty\}?\^\{?\\infty\}?/g, "the integral from negative infinity to infinity of ");
  s = s.replace(/\\int_\{?0\}?\^\{?\\infty\}?/g, "the integral from zero to infinity of ");
  s = s.replace(/\\int_\{?([^}]+)\}?\^\{?([^}]+)\}?/g, "the integral from $1 to $2 of ");
  s = s.replace(/\\int/g, "the integral of ");

  // 6. Differential dx, dy, dt at end of integral
  s = s.replace(/\\,d([a-z])/gi, ", d $1");
  s = s.replace(/\bd([xytzuv])\b/gi, "d $1");

  // 7. Square roots: \sqrt{x} -> the square root of x
  s = s.replace(/\\sqrt\{([^{}]+)\}/g, "the square root of $1");
  s = s.replace(/\\sqrt\[(\d+)\]\{([^{}]+)\}/g, "the $1-th root of $2");

  // 8. Exponents and Powers
  s = s.replace(/e\^\{?-x\^2\}?/g, "e to the negative x squared");
  s = s.replace(/e\^\{?(-?[a-zA-Z0-9]+)\}?/g, "e to the $1");
  s = s.replace(/([a-zA-Z0-9]+)\^2\b/g, "$1 squared");
  s = s.replace(/([a-zA-Z0-9]+)\^3\b/g, "$1 cubed");
  s = s.replace(/([a-zA-Z0-9]+)\^\{?(-?[a-zA-Z0-9]+)\}?/g, "$1 to the $2");

  // 9. Subscripts
  s = s.replace(/\\mu_s\b|mu_s\b/g, "mu sub s");
  s = s.replace(/\\mu_k\b|mu_k\b/g, "mu sub k");
  s = s.replace(/([a-zA-Z])_0\b/g, "$1 not");
  s = s.replace(/([a-zA-Z])_\{?([a-zA-Z0-9]+)\}?/g, "$1 $2");

  // 10. Math operators and symbols
  s = s.replace(/\\infty\b/g, "infinity");
  s = s.replace(/\\approx\b/g, "approximately equals");
  s = s.replace(/\\neq\b/g, "is not equal to");
  s = s.replace(/\\le\b|\\leq\b/g, "is less than or equal to");
  s = s.replace(/\\ge\b|\\geq\b/g, "is greater than or equal to");
  s = s.replace(/\\pm\b/g, "plus or minus");
  s = s.replace(/\\times\b|\\cdot\b/g, "times");
  s = s.replace(/\\sum\b/g, "the sum");
  s = s.replace(/\\to\b|\\rightarrow\b/g, "approaches");

  // 11. Cleanup residual formatting
  s = s.replace(/\\left|\\right/g, "");
  s = s.replace(/[{}]/g, "");
  s = s.replace(/\\/g, "");

  // 12. Normalize whitespace
  s = s.replace(/\s+/g, " ").trim();

  return s;
}
