import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "ember",
  checkpointing: { maxRuntime: "180s" },
});
