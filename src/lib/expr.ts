/* ------------------------------------------------------------------
   Tiny safe math expression parser → f(x) closure.
   Grammar (classic precedence):
     expr   := term (('+'|'-') term)*
     term   := unary (('*'|'/') unary | implicit-mult unary)*
     unary  := '-' unary | power
     power  := primary ('^' unary)?          (right-assoc)
     primary:= NUMBER | 'x' | CONST | FUNC '(' expr (',' expr)* ')' | '(' expr ')'
   Implicit multiplication: "2x", "3(x+1)", "x sin(x)" all work.
------------------------------------------------------------------- */

type Tok =
  | { t: "num"; v: number }
  | { t: "id"; v: string }
  | { t: "op"; v: string }
  | { t: "("; }
  | { t: ")"; }
  | { t: ","; };

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  const s = src.replace(/\s+/g, "");
  while (i < s.length) {
    const c = s[i];
    if (/[0-9.]/.test(c)) {
      let j = i;
      while (j < s.length && /[0-9.]/.test(s[j])) j++;
      const v = parseFloat(s.slice(i, j));
      if (!Number.isFinite(v)) throw new Error("bad number");
      toks.push({ t: "num", v });
      i = j;
      continue;
    }
    if (/[a-zA-Zπθ]/.test(c)) {
      let j = i;
      while (j < s.length && /[a-zA-Z0-9_πθ]/.test(s[j])) j++;
      toks.push({ t: "id", v: s.slice(i, j) });
      i = j;
      continue;
    }
    if ("+-*/^".includes(c)) {
      toks.push({ t: "op", v: c });
      i++;
      continue;
    }
    if (c === "(") {
      toks.push({ t: "(" });
      i++;
      continue;
    }
    if (c === ")") {
      toks.push({ t: ")" });
      i++;
      continue;
    }
    if (c === ",") {
      toks.push({ t: "," });
      i++;
      continue;
    }
    // tolerated chars: unicode math that map cleanly
    if (c === "·" || c === "×") {
      toks.push({ t: "op", v: "*" });
      i++;
      continue;
    }
    if (c === "÷") {
      toks.push({ t: "op", v: "/" });
      i++;
      continue;
    }
    if (c === "−" || c === "–") {
      toks.push({ t: "op", v: "-" });
      i++;
      continue;
    }
    if (c === "√") {
      // treat √(...) / √x as sqrt
      toks.push({ t: "id", v: "sqrt" });
      i++;
      continue;
    }
    if (c === "²") {
      toks.push({ t: "op", v: "^" });
      toks.push({ t: "num", v: 2 });
      i++;
      continue;
    }
    if (c === "³") {
      toks.push({ t: "op", v: "^" });
      toks.push({ t: "num", v: 3 });
      i++;
      continue;
    }
    if (c === "⁴") {
      toks.push({ t: "op", v: "^" });
      toks.push({ t: "num", v: 4 });
      i++;
      continue;
    }
    if (c === "π") {
      toks.push({ t: "id", v: "pi" });
      i++;
      continue;
    }
    throw new Error(`unexpected char '${c}'`);
  }
  return toks;
}

const CONSTS: Record<string, number> = {
  pi: Math.PI,
  e: Math.E,
};

const FN1: Record<string, (a: number) => number> = {
  sin: Math.sin,
  cos: Math.cos,
  tan: Math.tan,
  asin: Math.asin,
  acos: Math.acos,
  atan: Math.atan,
  sinh: Math.sinh,
  cosh: Math.cosh,
  tanh: Math.tanh,
  exp: Math.exp,
  ln: Math.log,
  log: Math.log10,
  log10: Math.log10,
  log2: Math.log2,
  sqrt: Math.sqrt,
  abs: Math.abs,
  floor: Math.floor,
  ceil: Math.ceil,
  round: Math.round,
  sign: Math.sign,
};

const FN2: Record<string, (a: number, b: number) => number> = {
  pow: Math.pow,
  atan2: Math.atan2,
  min: Math.min,
  max: Math.max,
  mod: (a, b) => ((a % b) + b) % b,
};

type Node = (x: number) => number;

export function compileExpr(src: string): (x: number) => number {
  const toks = tokenize(src);
  let p = 0;

  const peek = (): Tok | undefined => toks[p];
  const eat = (): Tok => {
    const t = toks[p];
    if (!t) throw new Error("unexpected end");
    p++;
    return t;
  };

  function parseExpr(): Node {
    let left = parseTerm();
    for (;;) {
      const t = peek();
      if (t && t.t === "op" && (t.v === "+" || t.v === "-")) {
        eat();
        const right = parseTerm();
        const l = left;
        left =
          t.v === "+"
            ? (x) => l(x) + right(x)
            : (x) => l(x) - right(x);
      } else break;
    }
    return left;
  }

  function startsPrimary(t: Tok | undefined): boolean {
    if (!t) return false;
    return t.t === "num" || t.t === "id" || t.t === "(";
  }

  function parseTerm(): Node {
    let left = parseUnary();
    for (;;) {
      const t = peek();
      if (t && t.t === "op" && (t.v === "*" || t.v === "/")) {
        eat();
        const right = parseUnary();
        const l = left;
        left =
          t.v === "*"
            ? (x) => l(x) * right(x)
            : (x) => {
                const d = right(x);
                return d === 0 ? NaN : l(x) / d;
              };
      } else if (startsPrimary(t)) {
        // implicit multiplication: 2x, 3(x+1), x sin(x), 2pi
        const right = parseUnary();
        const l = left;
        left = (x) => l(x) * right(x);
      } else break;
    }
    return left;
  }

  function parseUnary(): Node {
    const t = peek();
    if (t && t.t === "op" && t.v === "-") {
      eat();
      const inner = parseUnary();
      return (x) => -inner(x);
    }
    if (t && t.t === "op" && t.v === "+") {
      eat();
      return parseUnary();
    }
    return parsePower();
  }

  function parsePower(): Node {
    const base = parsePrimary();
    const t = peek();
    if (t && t.t === "op" && t.v === "^") {
      eat();
      const exp = parseUnary(); // right-assoc, allows 2^-x
      return (x) => Math.pow(base(x), exp(x));
    }
    return base;
  }

  function parsePrimary(): Node {
    const t = eat();
    if (t.t === "num") {
      const v = t.v;
      return () => v;
    }
    if (t.t === "(") {
      const inner = parseExpr();
      const close = eat();
      if (close.t !== ")") throw new Error("expected )");
      return inner;
    }
    if (t.t === "id") {
      const name = t.v;
      const lower = name.toLowerCase();
      if (lower === "x") return (x) => x;
      if (CONSTS[lower] !== undefined) {
        const v = CONSTS[lower];
        return () => v;
      }
      const fn1 = FN1[lower] ?? FN1[name];
      const fn2 = FN2[lower] ?? FN2[name];
      const nxt = peek();
      if (nxt && nxt.t === "(") {
        eat();
        const first = parseExpr();
        const maybeComma = peek();
        if (maybeComma && maybeComma.t === ",") {
          eat();
          const second = parseExpr();
          const close = eat();
          if (close.t !== ")") throw new Error("expected )");
          if (fn2) return (x) => fn2(first(x), second(x));
          throw new Error(`unknown function ${name}`);
        }
        const close = eat();
        if (close.t !== ")") throw new Error("expected )");
        if (fn1) return (x) => fn1(first(x));
        if (fn2) return (x) => fn2(first(x), first(x));
        throw new Error(`unknown function ${name}`);
      }
      // bare identifier that isn't x/const → treat as coefficient of x? no — error
      throw new Error(`unknown identifier ${name}`);
    }
    throw new Error("unexpected token");
  }

  const root = parseExpr();
  if (p !== toks.length) throw new Error("trailing tokens");
  // smoke test
  const probe = root(1.2345);
  if (typeof probe !== "number") throw new Error("non-numeric");
  return root;
}

export function tryCompileExpr(src: string): { fn: (x: number) => number } | { fn: null } {
  try {
    return { fn: compileExpr(src) };
  } catch {
    return { fn: null };
  }
}
