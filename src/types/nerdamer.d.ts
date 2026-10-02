/* nerdamer's bundled types don't know the Algebra addon side-loads
   .simplify() onto Expression (imported in video/solver.ts). */
import "nerdamer";

declare module "nerdamer" {
  interface Expression {
    simplify(): import("nerdamer").Expression;
  }
}

declare module "nerdamer/Algebra.js";
