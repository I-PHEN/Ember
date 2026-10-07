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

export function formatMathTitle(title: string): string {
  if (!title) return "";
  let t = title.trim();
  if (t.includes("$")) return t;

  t = t.replace(/∫\s*([^$]+?)\s*dx/gi, (_, expr) => {
    const cleanExpr = expr.replace(/e\^\(([^)]+)\)/g, "e^{$1}").replace(/·/g, " \\cdot ").trim();
    return `$\\int ${cleanExpr} \\, dx$`;
  });

  t = t.replace(/Integral of\s+([a-zA-Z0-9\s^()·\+\-\*\/]+)/gi, (_, expr) => {
    const cleanExpr = expr.replace(/e\^\(([^)]+)\)/g, "e^{$1}").replace(/·/g, " \\cdot ").trim();
    return `$\\int ${cleanExpr} \\, dx$`;
  });

  t = t.replace(/(^|[^$\w])e\^\(([^)]+)\)(?![^$]*\$)/g, "$1$e^{$2}$");
  return t;
}

export function formatMathText(content: string): string {
  if (!content) return "";
  let text = content;

  // Standardize LaTeX delimiters: \[ ... \] -> $$ ... $$, \( ... \) -> $ ... $
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => `$$\n${eq.trim()}\n$$`);
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => `$${eq.trim()}$`);

  // Auto-format quoted titles containing math notation e.g. "Integration by Parts: Integral of x e^(2x)"
  text = text.replace(/"([^"]*(?:Integral of|∫|e\^)[^"]*)"/gi, (_, inner) => {
    return `**${formatMathTitle(inner)}**`;
  });

  // Convert standalone unbracketed e^(...) to $e^{...}$ if not inside $
  text = text.replace(/(^|[^$\w])e\^\(([^)]+)\)(?![^$]*\$)/g, "$1$e^{$2}$");

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
