import { expect, test } from "bun:test";
import { validateTeachingBudget } from "../src/lib/video/teaching-budget";

test("an overfull board operation is rejected before recording", () => {
  expect(()=>validateTeachingBudget({chapter:"t",narration:"Subtract two.",beats:[{type:"write",text:"x + 2 - 2 = 5 - 2",say:"Subtract two."}]})).toThrow("Simplify");
});

test("the reproduced boxed answer fits its planned speaking budget", () => {
  const narration="x equals three is what remains on the left, and three is our solution, so let's put a box around it.";
  const budgets=validateTeachingBudget({chapter:"Answer",narration,beats:[{type:"write",text:"x = 3",size:"lg",say:narration},{type:"box",target:"text:x = 3"}]});
  expect(budgets[0].inkSeconds).toBeLessThan(10.5);
  expect(budgets[0].speechSeconds).toBe(10.5);
});
