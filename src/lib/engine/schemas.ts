/**
 * Structured output JSON schemas for the Ember generation pipeline.
 * Passed to Gemini (via responseSchema) and compatible structured engines.
 */

export const DIRECTOR_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    title: { type: "string" },
    subject: { type: "string" },
    question: { type: "string" },
    scenes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          chapter: { type: "string" },
          summary: { type: "string" },
        },
        required: ["chapter", "summary"],
      },
    },
  },
  required: ["title", "question", "scenes"],
};

export const PLANNER_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    scenes: {
      type: "array",
      items: {
        type: "object",
        properties: {
          script: { type: "string" },
          segments: {
            type: "array",
            items: {
              type: "object",
              properties: {
                say: { type: "string" },
                pauseAfter: { type: "number" },
              },
              required: ["say"],
            },
          },
          visualize: { type: "string" },
          analogy: { type: "string" },
        },
        required: ["script"],
      },
    },
  },
  required: ["scenes"],
};

export const SOLVER_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    answer: { type: "string" },
    units: { type: "string" },
    steps: {
      type: "array",
      items: {
        type: "object",
        properties: {
          eq: { type: "string" },
          rule: { type: "string" },
          why: { type: "string" },
        },
        required: ["eq", "rule"],
      },
    },
    keySteps: {
      type: "array",
      items: { type: "string" },
    },
  },
  required: ["answer", "keySteps"],
};

export const REVIEWER_SCHEMA: Record<string, unknown> = {
  type: "object",
  properties: {
    verdict: { type: "string", enum: ["pass", "fixed"] },
    beats: {
      type: "array",
      items: { type: "object" },
    },
    segments: {
      type: "array",
      items: { type: "object" },
    },
  },
  required: ["verdict"],
};
