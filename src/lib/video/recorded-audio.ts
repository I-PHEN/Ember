// Shared browser/server contract. No storage or provider dependencies.
export interface RecordedAudioReference { key: string; narration: string }

export function storedAudioKey(scene: unknown): string | undefined {
  if (!scene || typeof scene !== "object") return undefined;
  const candidate = scene as { narration?: unknown; audio?: Partial<RecordedAudioReference> };
  const audio = candidate.audio;
  return audio && typeof audio.key === "string" && /^[a-f0-9]{64}$/.test(audio.key)
    && audio.narration === candidate.narration ? audio.key : undefined;
}
