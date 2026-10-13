/**
 * Per-job execution context.
 * Replaces module-level globals so concurrent jobs never bleed rate-limit signals,
 * provider hops, or PRNG state into one another.
 */

export interface JobRateLimits {
  saw429: boolean;
  sawGroq429: boolean;
}

export interface PinnedVoice {
  provider: "gemini" | "edge";
  voice: string;
}

export interface JobContext {
  jobId: string;
  rng: () => number;
  rateLimits: JobRateLimits;
  providerHops: number;
  pinnedVoice?: PinnedVoice;
  /** Injectable test flag to plant defect for reviewer drill */
  plantBadBeat?: boolean;
}

export function createRng(seedStr: string): () => number {
  let h = 1779033703 ^ seedStr.length;
  for (let i = 0; i < seedStr.length; i++) {
    h = Math.imul(h ^ seedStr.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return function () {
    h = Math.imul(h ^ (h >>> 16), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

export function createJobContext(jobId: string, options?: { plantBadBeat?: boolean }): JobContext {
  return {
    jobId,
    rng: createRng(jobId),
    rateLimits: {
      saw429: false,
      sawGroq429: false,
    },
    providerHops: 0,
    plantBadBeat: options?.plantBadBeat ?? false,
  };
}
