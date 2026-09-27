/* ------------------------------------------------------------------
   Hand-authored sample scripts — instant demos that need no LLM,
   and the hero mini-video for the landing page.

   The flagship sample demonstrates THE LECTURE model end to end:
   the classic arc (understand → gather → name the ask → plan →
   solve slowly → check), an engaging planner-style transcript, one
   analogy (the balance scale), and a "say" tag on every ink beat —
   the exact narration fragment spoken while that line is written,
   which is what keeps the pen and the voice in lockstep.
------------------------------------------------------------------- */

import type { SolveScript } from "./video/types";
import { introScene } from "./intro";

/** The flagship sample: solve 2x + 5 = 13 like a real class would. */
export const SAMPLE_SOLVE: SolveScript = {
  title: "Solving 2x + 5 = 13",
  subject: "Algebra",
  question: "Solve for x: 2x + 5 = 13",
  scenes: [
    introScene(),
    {
      chapter: "Understanding the problem",
      narration:
        "Before we touch any algebra, let's actually read this problem, the way we would in class. We're given two x plus five equals thirteen. So on the left side, something got multiplied by two, and then five was added on top, and we ended up at thirteen. Now the thing we're hunting for is the value of x that makes this true. So let's gather what we know: we know the whole story of the left side, and we know exactly where it landed. And we want the mystery number hiding inside it. That's the ask. Once you can say that in plain words, you already understand the problem better than most.",
      beats: [
        {
          type: "title",
          text: "Solving a Linear Equation",
          color: "yellow",
          say: "let's actually read this problem, the way we would in class",
        },
        {
          type: "write",
          text: "2x + 5 = 13",
          color: "blue",
          size: "lg",
          say: "We're given two x plus five equals thirteen",
        },
        {
          type: "newline",
          n: 1,
        },
        {
          type: "write",
          text: "Find: x",
          color: "white",
          size: "md",
          say: "the thing we're hunting for is the value of x",
        },
        { type: "underline", target: "last", color: "orange" },
      ],
    },
    {
      chapter: "The plan",
      narration:
        "Here's the golden rule that keeps everything legal: whatever we do to one side, we do to the other. Picture an old balance scale — the equals sign is the pivot, and both pans must stay level, or the whole thing tips over. Now, since x got multiplied by two first and then had five added, we simply walk that story backwards: first undo the plus five, then undo the times two. Shoes off before socks, remember — reverse order, one clean move at a time. That's the entire plan, and it's the same rhythm for almost every equation you'll ever meet.",
      beats: [
        {
          type: "write",
          text: "RULE: same move, both sides",
          color: "orange",
          size: "md",
          say: "whatever we do to one side, we do to the other",
        },
        { type: "highlight", target: "last" },
        {
          type: "point",
          target: "text:RULE: same move, both sides",
          ms: 1100,
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "1. Undo the + 5",
          color: "white",
          size: "sm",
          say: "first undo the plus five",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "2. Undo the × 2",
          color: "white",
          size: "sm",
          say: "then undo the times two",
        },
        { type: "wait", ms: 600 },
      ],
    },
    {
      chapter: "Step 1 — subtract 5",
      narration:
        "So let's make the first move and subtract five from both sides. Watch the left side closely — the plus five and the minus five cancel to zero, and that's the whole point of this move: it strips the five away without ever touching the two x. Over on the right, thirteen minus five leaves us eight. And there it is — two x equals eight. Halfway home. Just look at that line for a second: it's simpler, it's cleaner, and x is one step closer to standing alone.",
      beats: [
        { type: "write", text: "2x", color: "white", size: "md" },
        {
          type: "write",
          text: "+ 5",
          color: "white",
          size: "md",
          say: "subtract five from both sides",
        },
        { type: "write", text: "= 13", color: "white", size: "md" },
        {
          type: "write",
          text: "− 5",
          color: "orange",
          size: "sm",
          below: "text:+ 5",
          say: "Watch the left side closely",
        },
        { type: "write", text: "− 5", color: "orange", size: "sm", below: "text:= 13" },
        { type: "crossout", target: "text:+ 5" },
        { type: "crossout", target: "text:− 5" },
        { type: "crossout", target: "text:− 5" },
        { type: "newline", n: 2 },
        {
          type: "write",
          text: "2x = 8",
          color: "green",
          size: "lg",
          say: "two x equals eight",
        },
      ],
    },
    {
      chapter: "Step 2 — divide by 2",
      narration:
        "x is still wrapped in a times two, so now we divide both sides by two — the inverse move, exactly as planned. On the left, the twos cancel: two over two is one, and x is finally alone, which is what we wanted from the very start. On the right, eight divided by two is four. So x equals four. Let me box that, because that is our answer. Notice how each move peeled off exactly one layer — that steady rhythm is really what algebra is.",
      beats: [
        { type: "write", text: "2x = 8", color: "white", size: "md" },
        {
          type: "fraction",
          num: "2x",
          den: "2",
          color: "white",
          size: "md",
          say: "we divide both sides by two",
        },
        {
          type: "fraction",
          prefix: "=",
          num: "8",
          den: "2",
          color: "white",
          size: "md",
        },
        { type: "newline", n: 2 },
        {
          type: "write",
          text: "x = 4",
          color: "green",
          size: "lg",
          keep: true,
          say: "So x equals four",
        },
        { type: "box", target: "last", color: "yellow" },
      ],
    },
    {
      chapter: "Check the answer",
      narration:
        "And a good student always checks. We take our answer and substitute four back into the original equation, exactly as it was given: two times four is eight, eight plus five is thirteen — and that is exactly what the right side says. Both sides agree, so the answer is confirmed: x equals four. Building in that one habit is what catches the careless mistakes on exams. Nice work — I'll see you in the next one.",
      beats: [
        { type: "erase", keep: ["x = 4"] },
        {
          type: "write",
          text: "Check: 2(4) + 5 = 13",
          color: "white",
          size: "md",
          say: "substitute four back into the original equation",
        },
        { type: "circle", target: "last", color: "green" },
        { type: "newline", n: 2 },
        {
          type: "write",
          text: "It works — x = 4 ✓",
          color: "green",
          size: "lg",
          keep: true,
          say: "the answer is confirmed: x equals four",
        },
        { type: "box", target: "last", color: "green" },
        { type: "wait", ms: 800 },
      ],
    },
  ],
};

/** A short loop for the landing-page hero board (muted). */
export const HERO_SCRIPT: SolveScript = {
  title: "Watch AI solve it",
  subject: "Demo",
  question: "2x + 5 = 13",
  scenes: [
    {
      chapter: "Live demo",
      narration:
        "Two x plus five equals thirteen. Subtract five from both sides, divide by two, and x is four. Every line, written live.",
      beats: [
        { type: "title", text: "AI solves it, live.", color: "yellow" },
        { type: "write", text: "2x + 5 = 13", color: "blue", size: "lg" },
        { type: "underline", target: "last", color: "orange" },
        { type: "newline", n: 2 },
        { type: "write", text: "− 5 everywhere", color: "white", size: "sm" },
        { type: "newline", n: 1 },
        { type: "write", text: "2x = 8", color: "white", size: "lg" },
        { type: "newline", n: 2 },
        { type: "write", text: "x = 4", color: "green", size: "lg" },
        { type: "box", target: "last", color: "yellow" },
        { type: "wait", ms: 900 },
      ],
    },
  ],
};

export const EXAMPLE_QUESTIONS = [
  "Differentiate f(x) = x³ · sin x",
  "Evaluate ∫ x·eˣ dx using integration by parts",
  "A block slides down a 30° incline with μₖ = 0.2 — find its acceleration",
  "A car starts from rest and accelerates at 3 m/s². How far does it travel in 10 s?",
  "Find lim(x→0) sin(x)/x",
  "Solve the ODE: dy/dx = 3x² · y",
];
