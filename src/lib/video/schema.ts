import { z } from "zod";

export const solveScriptSchema = z.object({
  title: z.string(),
  subject: z.string().optional(),
  question: z.string(),
  scenes: z.array(
    z.object({
      chapter: z.string(),
      narration: z.string(),
      beats: z.array(
        z.object({
          type: z.enum(["title", "write", "fraction"]),
          text: z.string().optional(),
          say: z.string().optional(),
        }).passthrough()
      )
    })
  )
});
