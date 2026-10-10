interface VoiceCompletion {
  phase: string;
  error: string | null;
  voicesTotal: number;
  voicesDone: number;
  voiceFailures: number[];
  readyAt: number | null;
}

export function recordVoiceResult(job: VoiceCompletion, scene: number, succeeded: boolean): void {
  if (succeeded) job.voicesDone += 1;
  else job.voiceFailures.push(scene);
}

export function finishVoicing(job: VoiceCompletion, now: number): void {
  if (job.phase === "error") return;
  if (job.voiceFailures.length || job.voicesDone !== job.voicesTotal) {
    job.phase = "error";
    job.error = "Some lesson audio could not be generated. Please try again.";
    return;
  }
  job.phase = "ready";
  job.readyAt = now;
}
