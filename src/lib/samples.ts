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

/** The flagship sample: solve 2x + 5 = 13 like a real class would. */
export const SAMPLE_SOLVE: SolveScript = {
  title: "Solving 2x + 5 = 13",
  subject: "Algebra",
  question: "Solve for x: 2x + 5 = 13",
  scenes: [
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

export const SAMPLE_PHYSICS: SolveScript = {
  title: "Block on an Incline with Friction",
  subject: "Mechanics",
  question: "A 10 kg block is pulled up a 30° incline by an 85 N tension force. With μₖ = 0.20, find its acceleration.",
  scenes: [
    {
      chapter: "Understanding the problem",
      narration:
        "Welcome. Today we are tackling a classic university mechanics problem: a ten kilogram crate pulled up a thirty degree incline. There is an eighty-five newton tension pulling it uphill, but gravity and kinetic friction are resisting that motion. Before we rush into any equations, let us gather what is given: the mass is ten kilograms, the incline angle is thirty degrees, the pulling force is eighty-five newtons, and the kinetic friction coefficient is point two zero. Our goal is to determine the crate's acceleration up the ramp.",
      beats: [
        {
          type: "title",
          text: "Block on an Incline with Friction",
          color: "yellow",
          say: "Welcome. Today we are tackling a classic university mechanics problem",
        },
        {
          type: "write",
          text: "m = 10 kg,  θ = 30°,  T = 85 N,  μₖ = 0.20",
          color: "blue",
          size: "md",
          say: "the mass is ten kilograms, the incline angle is thirty degrees",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "Find: a (upslope)",
          color: "white",
          size: "md",
          say: "Our goal is to determine the crate's acceleration up the ramp",
        },
      ],
    },
    {
      chapter: "Choosing the coordinate axes",
      narration:
        "The single most important decision in inclined plane problems is how we orient our coordinate system. If we chose conventional horizontal and vertical axes, the block would accelerate in both directions simultaneously, complicating our equations. Instead, we rotate our coordinate frame: we align the x-axis parallel to the ramp, pointing uphill in the direction of motion, and align the y-axis perpendicular to the surface. This ensures acceleration occurs exclusively along the x-axis.",
      beats: [
        {
          type: "write",
          text: "Coordinate Axes:",
          color: "orange",
          size: "md",
          say: "Instead, we rotate our coordinate frame",
        },
        {
          type: "underline",
          target: "text:Coordinate Axes:",
          color: "orange",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "+x along ramp (uphill)",
          color: "white",
          size: "md",
          say: "we align the x-axis parallel to the ramp, pointing uphill",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "+y normal to ramp (outward)",
          color: "white",
          size: "md",
          say: "and align the y-axis perpendicular to the surface",
        },
      ],
    },
    {
      chapter: "The Free-Body Diagram",
      narration:
        "Now let us draw a complete free-body diagram to track every force acting on the crate. First, gravity pulls straight downward toward the Earth's center with magnitude m times g. Second, the incline pushes outward with a normal force perpendicular to the ramp. Third, our tension force pulls directly uphill. And fourth, kinetic friction opposes the motion, pointing directly downslope. Having all four forces drawn clearly gives us our roadmap for Newton's laws.",
      beats: [
        { type: "erase" },
        {
          type: "freebody",
          angle: 30,
          block: "10kg",
          forces: [
            { label: "T", dir: "upslope" },
            { label: "mg", dir: "down" },
            { label: "N", dir: "normal" },
            { label: "fₖ", dir: "downslope" },
          ],
          color: "yellow",
          say: "Now let us draw a complete free-body diagram to track every force",
        },
      ],
    },
    {
      chapter: "Resolving gravity into components",
      narration:
        "Notice that three of our four forces already align with our chosen axes: tension, friction, and the normal force. Only gravity points at an awkward angle. Using trigonometry, the angle between gravity and the negative y-axis is theta, thirty degrees. Therefore, gravity splits into two orthogonal components: a downslope component, m g sine theta, which pulls the crate back downhill, and a perpendicular component, m g cosine theta, which presses the crate into the surface. Calculating these values gives forty-nine newtons downhill and eighty-four point nine newtons into the incline.",
      beats: [
        {
          type: "write",
          text: "Wₓ = mg · sin(30°) = (10)(9.8)(0.5) = 49.0 N",
          color: "white",
          size: "md",
          say: "a downslope component, m g sine theta, which pulls the crate back downhill",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "W_y = mg · cos(30°) = (10)(9.8)(0.866) = 84.9 N",
          color: "white",
          size: "md",
          say: "and a perpendicular component, m g cosine theta, which presses the crate into the surface",
        },
      ],
    },
    {
      chapter: "Normal force equilibrium",
      narration:
        "Now we examine the forces along the perpendicular y-axis. The crate remains firmly on the ramp without flying off into the air or collapsing into the incline. That means there is zero acceleration in the y-direction. Applying Newton's second law, the sum of forces in y must equal zero: the normal force N minus the perpendicular gravity component W y equals zero. Thus, N exactly equals eighty-four point nine newtons.",
      beats: [
        {
          type: "write",
          text: "ΣF_y = 0  →  N − W_y = 0",
          color: "blue",
          size: "md",
          say: "the sum of forces in y must equal zero",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "N = mg · cos(30°) = 84.9 N",
          color: "white",
          size: "md",
          say: "Thus, N exactly equals eighty-four point nine newtons",
        },
      ],
    },
    {
      chapter: "Calculating kinetic friction",
      narration:
        "With the normal force determined, we can calculate the friction resisting the crate's motion. Kinetic friction is the coefficient mu k multiplied by the normal force N. Substituting our values, point two zero times eighty-four point nine newtons gives seventeen point zero newtons. This friction force acts directly down the ramp, opposing our upward pull.",
      beats: [
        {
          type: "write",
          text: "fₖ = μₖ · N",
          color: "orange",
          size: "md",
          say: "Kinetic friction is the coefficient mu k multiplied by the normal force",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "fₖ = (0.20)(84.9 N) = 17.0 N",
          color: "white",
          size: "md",
          say: "Substituting our values, point two zero times eighty-four point nine newtons gives seventeen point zero newtons",
        },
      ],
    },
    {
      chapter: "Newton's Second Law along the ramp",
      narration:
        "We are now ready to apply Newton's second law along the incline, the x-axis. The sum of forces equals mass times acceleration. What forces act along the ramp? We have the forward pull of tension T in the positive direction, fighting against both the downhill gravity component W x and the kinetic friction f k. Writing the equation: T minus W x minus f k equals m times a. Substituting our known numbers: eighty-five minus forty-nine minus seventeen equals ten times a.",
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "ΣFₓ = m · a",
          color: "blue",
          size: "md",
          say: "The sum of forces equals mass times acceleration",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "T − Wₓ − fₖ = m · a",
          color: "white",
          size: "md",
          say: "Writing the equation: T minus W x minus f k equals m times a",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "85 − 49.0 − 17.0 = 10 · a",
          color: "white",
          size: "md",
          say: "Substituting our known numbers: eighty-five minus forty-nine minus seventeen equals ten times a",
        },
      ],
    },
    {
      chapter: "Solving for acceleration & sanity check",
      narration:
        "Let us simplify the left side: eighty-five minus sixty-six leaves a net upward force of nineteen point zero newtons. Dividing both sides by the mass of ten kilograms yields our final acceleration: a equals one point nine meters per second squared up the incline. Notice how reasonable this is: the tension easily overcame the total resistance of sixty-six newtons, producing a modest, steady acceleration. That is how we break down any complex mechanics problem step by step.",
      beats: [
        {
          type: "write",
          text: "19.0 N = (10 kg) · a",
          color: "white",
          size: "md",
          say: "leaves a net upward force of nineteen point zero newtons",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "a = 1.9 m/s²",
          color: "green",
          size: "lg",
          keep: true,
          say: "yields our final acceleration: a equals one point nine meters per second squared up the incline",
        },
        {
          type: "box",
          target: "text:a = 1.9 m/s²",
          color: "yellow",
        },
      ],
    },
  ],
};

export const SAMPLE_CALCULUS: SolveScript = {
  title: "Integration by Parts: ∫ x·e^(2x) dx",
  subject: "Calculus",
  question: "Evaluate the indefinite integral ∫ x · e^(2x) dx using integration by parts.",
  scenes: [
    {
      chapter: "Understanding the integral",
      narration:
        "We need to evaluate the integral of x times e to the two x dx. Because we have a product of a polynomial x and an exponential function, simple substitution won't work on its own. This calls for integration by parts.",
      beats: [
        { type: "title", text: "Integration by Parts", color: "yellow", say: "We need to evaluate the integral of x times e to the two x" },
        { type: "write", text: "∫ x · e^(2x) dx", color: "blue", size: "lg", say: "integral of x times e to the two x dx" },
        { type: "newline", n: 1 },
        { type: "write", text: "Formula: ∫ u dv = u·v − ∫ v du", color: "yellow", size: "md", say: "This calls for integration by parts" },
        { type: "underline", target: "last", color: "orange" },
      ],
    },
    {
      chapter: "Choosing u and dv",
      narration:
        "Using the LIATE rule, algebraic comes before exponential. So we pick u equals x, which differentiates cleanly to du equals dx. That leaves dv equals e to the two x dx, which integrates to v equals one half e to the two x.",
      beats: [
        { type: "write", text: "u = x        →  du = dx", color: "white", size: "md", say: "we pick u equals x, which differentiates cleanly" },
        { type: "newline", n: 1 },
        { type: "write", text: "dv = e^(2x)dx →  v = ½ e^(2x)", color: "orange", size: "md", say: "v equals one half e to the two x" },
      ],
    },
    {
      chapter: "Applying the formula",
      narration:
        "Now substitute into u times v minus integral of v du: we get x times one half e to the two x, minus the integral of one half e to the two x dx. Evaluating the final integral leaves one half x e to the two x minus one fourth e to the two x plus C.",
      beats: [
        { type: "erase" },
        { type: "write", text: "= ½ x · e^(2x) − ∫ ½ e^(2x) dx", color: "white", size: "md", say: "substitute into u times v minus integral of v du" },
        { type: "newline", n: 1 },
        { type: "write", text: "= ½ x · e^(2x) − ¼ e^(2x) + C", color: "green", size: "lg", keep: true, say: "minus one fourth e to the two x plus C" },
        { type: "box", target: "last", color: "yellow" },
      ],
    },
  ],
};

export const SAMPLE_LESSONS: SolveScript[] = [
  SAMPLE_SOLVE,
  SAMPLE_PHYSICS,
  SAMPLE_CALCULUS,
];

export const EXAMPLE_QUESTIONS = [
  "Differentiate f(x) = x³ · sin x",
  "Evaluate ∫ x·eˣ dx using integration by parts",
  "A block slides down a 30° incline with μₖ = 0.2 — find its acceleration",
  "A car starts from rest and accelerates at 3 m/s². How far does it travel in 10 s?",
  "Find lim(x→0) sin(x)/x",
  "Solve the ODE: dy/dx = 3x² · y",
];
