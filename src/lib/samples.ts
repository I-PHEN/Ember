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
        "Before we touch any algebra, let us actually read this problem the way we would in class. We are given two x plus five equals thirteen. On the left side, an unknown quantity x was doubled, and then five was added on top, landing precisely at thirteen. Our goal is to isolate x and find the exact number that makes this equation true. So we know the complete structure of the left side, and we know the target value on the right. Once you can say that in plain words, you already understand the problem.",
      beats: [
        {
          type: "title",
          text: "Solving a Linear Equation",
          color: "yellow",
          say: "Before we touch any algebra, let us actually read this problem",
        },
        {
          type: "write",
          text: "2x + 5 = 13",
          color: "blue",
          size: "lg",
          say: "We are given two x plus five equals thirteen",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "Find: x",
          color: "white",
          size: "md",
          say: "Our goal is to isolate x and find the exact number",
        },
        {
          type: "underline",
          target: "text:Find: x",
          color: "orange",
        },
      ],
    },
    {
      chapter: "The plan & the balance rule",
      narration:
        "Here is the golden rule that keeps everything mathematically sound: whatever operation we apply to one side, we must apply to the other. Picture an old balance scale — the equals sign is the pivot, and both pans must stay level at all times. Since x was first multiplied by two and then increased by five, we simply peel those layers back in reverse order: first undo the addition of five, then undo the multiplication by two. That is the entire strategy.",
      beats: [
        {
          type: "write",
          text: "RULE: same move to both sides",
          color: "orange",
          size: "md",
          say: "whatever operation we apply to one side, we must apply to the other",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "1. Subtract 5 from both sides",
          color: "white",
          size: "md",
          say: "first undo the addition of five",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "2. Divide both sides by 2",
          color: "white",
          size: "md",
          say: "then undo the multiplication by two",
        },
      ],
    },
    {
      chapter: "Step 1 — subtracting 5",
      narration:
        "Let us execute our first move by subtracting five from both sides. Watch what happens on the left side: positive five and minus five cancel out to zero, leaving just two x. On the right side, thirteen minus five leaves eight. So our equation simplifies to two x equals eight. We are halfway home. Notice how much simpler the statement is already: x is now one clean step away from standing completely alone.",
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "2x + 5 − 5 = 13 − 5",
          color: "white",
          size: "md",
          say: "Let us execute our first move by subtracting five from both sides",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "→ 2x = 8",
          color: "green",
          size: "lg",
          say: "So our equation simplifies to two x equals eight",
        },
      ],
    },
    {
      chapter: "Step 2 — dividing by 2",
      narration:
        "Our unknown x is currently multiplied by two, so the inverse operation is division by two. We divide both sides by two. On the left, the factor of two in the numerator and denominator cancel out, leaving x completely isolated. On the right, eight divided by two gives four. Just like that, x equals four. Let us place a clean box around that result, because that is our final answer.",
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "2x = 8  →  2x ÷ 2 = 8 ÷ 2",
          color: "white",
          size: "md",
          say: "We divide both sides by two",
        },
        { type: "newline", n: 2 },
        {
          type: "write",
          text: "x = 4",
          color: "green",
          size: "lg",
          keep: true,
          say: "Just like that, x equals four",
        },
        {
          type: "box",
          target: "text:x = 4",
          color: "yellow",
        },
      ],
    },
    {
      chapter: "Checking the solution",
      narration:
        "A good mathematician always checks their result. We take x equals four and substitute it back into the original equation: two times four is eight, and eight plus five equals thirteen. Thirteen on the left matches thirteen on the right. The equation holds perfectly, and our solution is confirmed: x equals four. That steady, layer-by-layer rhythm is the heart of algebra.",
      beats: [
        { type: "erase" },
        {
          type: "write",
          text: "Check: 2(4) + 5 = 13",
          color: "white",
          size: "md",
          say: "We take x equals four and substitute it back into the original equation",
        },
        { type: "newline", n: 1 },
        {
          type: "write",
          text: "8 + 5 = 13  →  13 = 13 ✓",
          color: "green",
          size: "md",
          say: "Thirteen on the left matches thirteen on the right",
        },
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
