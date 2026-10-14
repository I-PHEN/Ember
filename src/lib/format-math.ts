export function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function fmtRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(ts);
}

export function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

/**
 * Converts raw LaTeX, math expressions, and markup into clean, readable Unicode
 * mathematical typography for cards, headings, and plain-text surfaces.
 */
export function formatMathUnicode(text: string): string {
  if (!text) return "";
  let s = text.trim();

  // Strip LaTeX math delimiters
  s = s.replace(/\$\$([\s\S]*?)\$\$/g, "$1");
  s = s.replace(/\$([^$]+)\$/g, "$1");
  s = s.replace(/\\\[([\s\S]*?)\\\]/g, "$1");
  s = s.replace(/\\\(([\s\S]*?)\\\)/g, "$1");

  // Integrals & Infinity
  s = s.replace(/\\int_{-\\infty}\^\\infty/g, "∫_{-∞}^∞");
  s = s.replace(/\\int_\{(-\\infty)\}\^\{?(\\infty)\}?/g, "∫_{-∞}^∞");
  s = s.replace(/\\int/g, "∫");
  s = s.replace(/\\iint/g, "∬");
  s = s.replace(/\\iiint/g, "∭");
  s = s.replace(/\\oint/g, "∮");
  s = s.replace(/\\infty/g, "∞");

  // Square roots
  s = s.replace(/\\sqrt\{\\pi\}/g, "√π");
  s = s.replace(/\\sqrt\{([^}]+)\}/g, "√($1)");
  s = s.replace(/\\sqrt\s*([a-zA-Z0-9]+)/g, "√$1");

  // Multiplications & Operators
  s = s.replace(/\\cdot/g, "·");
  s = s.replace(/\\times/g, "×");
  s = s.replace(/\\pm/g, "±");
  s = s.replace(/\\mp/g, "∓");
  s = s.replace(/\\leq?/g, "≤");
  s = s.replace(/\\geq?/g, "≥");
  s = s.replace(/\\neq/g, "≠");
  s = s.replace(/\\approx/g, "≈");
  s = s.replace(/\\sim/g, "∼");
  s = s.replace(/\\to|\\rightarrow/g, "→");
  s = s.replace(/\\leftarrow/g, "←");

  // Greek letters
  s = s.replace(/\\theta/g, "θ");
  s = s.replace(/\\mu/g, "μ");
  s = s.replace(/\\pi/g, "π");
  s = s.replace(/\\alpha/g, "α");
  s = s.replace(/\\beta/g, "β");
  s = s.replace(/\\gamma/g, "γ");
  s = s.replace(/\\delta/g, "δ");
  s = s.replace(/\\lambda/g, "λ");
  s = s.replace(/\\sigma/g, "σ");
  s = s.replace(/\\omega/g, "ω");
  s = s.replace(/\\phi/g, "φ");
  s = s.replace(/\\Delta/g, "Δ");
  s = s.replace(/\\Sigma/g, "Σ");
  s = s.replace(/\\partial/g, "∂");

  // Common exponents & subscripts
  s = s.replace(/\^\{-x\^2\}|\^\{-x²\}/g, "^(-x²)");
  s = s.replace(/\^\{2\}/g, "²");
  s = s.replace(/\^\{3\}/g, "³");
  s = s.replace(/\^\{([^}]+)\}/g, "^($1)");
  s = s.replace(/_\{c\}/g, "_c");
  s = s.replace(/_\{s\}/g, "_s");
  s = s.replace(/_\{max\}/g, "_{max}");
  s = s.replace(/_\{([a-zA-Z0-9]+)\}/g, "_$1");

  // Fractions
  s = s.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1)/($2)");

  // Text formatting inside math
  s = s.replace(/\\text\{([^}]+)\}/g, "$1");
  s = s.replace(/\\mathrm\{([^}]+)\}/g, "$1");
  s = s.replace(/\\mathbf\{([^}]+)\}/g, "$1");

  // Spacing commands & backslashes
  s = s.replace(/\\[,;:!]/g, " ");
  s = s.replace(/\\quad|\\qquad/g, "  ");
  s = s.replace(/\\([a-zA-Z]+)/g, "$1"); // Strip any remaining unknown TeX macro backslash

  // Clean spacing
  s = s.replace(/\s+/g, " ").trim();

  return s;
}

/**
 * Formats a lesson title for card headers, modal titles, and navigation.
 * Always returns clean Unicode text with zero raw LaTeX markers or $ signs.
 */
export function formatMathTitle(title: string): string {
  if (!title) return "";
  return formatMathUnicode(title);
}

/**
 * Formats a lesson question / problem statement for card previews and subtitles.
 * Always returns clean Unicode text with zero raw LaTeX markers or $ signs.
 */
export function formatMathQuestion(question: string): string {
  if (!question) return "";
  return formatMathUnicode(question);
}

export function formatMathText(content: string): string {
  if (!content) return "";
  let text = content;

  // Standardize LaTeX delimiters: \[ ... \] -> $$ ... $$, \( ... \) -> $ ... $
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => `$$\n${eq.trim()}\n$$`);
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => `$${eq.trim()}$`);

  // Auto-format quoted titles containing math notation
  text = text.replace(/"([^"]*(?:Integral of|∫|e\^)[^"]*)"/gi, (_, inner) => {
    return `**${formatMathTitle(inner)}**`;
  });

  return text;
}

export interface RefineMessage {
  role: "user" | "ember";
  content: string;
  mode?: "answer" | "edit";
  time?: number;
  createdAt?: number;
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: number;
  messages: RefineMessage[];
}
