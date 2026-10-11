import { expect, test } from "bun:test";
import { validateTeachingBudget } from "../src/lib/video/teaching-budget";

test("an overfull board operation is rejected before recording", () => {
  expect(()=>validateTeachingBudget({chapter:"t",narration:"Subtract two.",beats:[{type:"write",text:"x + 2 - 2 = 5 - 2",say:"Subtract two."}]})).toThrow("Simplify");
});

test("timing rejection identifies the overloaded ink and its spoken slice", () => {
  try {
    validateTeachingBudget({chapter:"Check",narration:"Five equals five.",beats:[{type:"write",text:"Check: (3) + 2 = 5",say:"Five equals five."}]});
    throw new Error("expected timing rejection");
  } catch(error) {
    const message=(error as Error).message;
    expect(message).toContain('"Check: (3) + 2 = 5"');
    expect(message).toContain('"Five equals five."');
  }
});

test("the reproduced boxed answer fits its planned speaking budget", () => {
  const narration="x equals three is what remains on the left, and three is our solution, so let's put a box around it.";
  const budgets=validateTeachingBudget({chapter:"Answer",narration,beats:[{type:"write",text:"x = 3",size:"lg",say:narration},{type:"box",target:"text:x = 3"}]});
  expect(budgets[0].inkSeconds).toBeLessThan(10.5);
  expect(budgets[0].speechSeconds).toBe(10.5);
});

test("the failed hosted verification can fit without changing speech or accelerating ink", () => {
  const narration="Let's take three seconds to check it. We replace x with three in our original equation: three plus two equals five. Five equals five. The scale balances perfectly, and we are done.";
  const say="We replace x with three in our original equation: three plus two equals five.";
  expect(()=>validateTeachingBudget({chapter:"Check",narration,beats:[{type:"write",text:"Check: (3) + 2 = 5",say}]})).toThrow("seconds of board motion");
  const budgets=validateTeachingBudget({chapter:"Check",narration,beats:[{type:"write",text:"3 + 2 = 5",say}]});
  expect(budgets).toHaveLength(2);
  expect(budgets[1].inkSeconds).toBeLessThan(16);
});
