import type { SolveScript } from "./video/types";

export const LANDING_LESSON: SolveScript = {
  title: "Reading a matrix",
  subject: "Linear algebra",
  question: "How do you read a matrix and locate an entry?",
  scenes: [
    {
      chapter: "Read the dimensions",
      narration: "A matrix is a rectangular arrangement of numbers. This matrix has two rows and three columns. We write its dimensions as two by three. To locate an entry, choose the row first, then the column.",
      beats: [
        { type: "matrix", id: "A", label: "A", rows: [["2", "7", "-4"], ["6", "3", "5"]], keep: true, say: "A matrix is a rectangular arrangement of numbers. This matrix has two rows and three columns. We write its dimensions as two by three. To locate an entry, choose the row first, then the column." },
      ],
    },
    {
      chapter: "Locate an entry",
      narration: "Look at row two. Follow row two across the matrix. Now find column three. Pause and locate where row two meets column three. That entry is five. Remember: row first, then column. Row first, then column.",
      beats: [
        { type: "matrix", id: "A", label: "A", rows: [["2", "7", "-4"], ["6", "3", "5"]], keep: true },
        { type: "point", target: "matrix:A:row:2", ms: 800 },
        { type: "point", target: "matrix:A:col:3", ms: 800 },
        { type: "point", target: "matrix:A:cell:2:3", ms: 800 },
        { type: "write", text: "A₂₃ = 5", color: "yellow", say: "That entry is five. Remember: row first, then column. Row first, then column." },
      ],
    },
  ],
};
