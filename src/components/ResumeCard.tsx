"use client";

/* ------------------------------------------------------------------
   ResumeCard — shown on the home page when a video job is running
   (or finished) but the user isn't actively waiting in the overlay.
   This is the "welcome back" half of leave-and-return.
------------------------------------------------------------------- */

import { useEffect, useState } from "react";
import { Play, RefreshCw, X, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VideoJobStatus } from "@/lib/use-video-job";

function fmtLeft(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s <= 4) return "any moment";
  if (s < 90) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `${m}m ${r}s` : `${m}min`;
}

function useTick(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

interface Props {
  status: VideoJobStatus;
  onWatch: () => void;
  onReopen: () => void;
  onDismiss: () => void;
}

export default function ResumeCard({ status, onWatch, onReopen, onDismiss }: Props) {
  const now = useTick();
  const elapsed = now - status.at;
  const ready = !!status.script;
  const etaWatch = Math.max(0, status.etaWatchMs - elapsed);
  const etaVoice = Math.max(0, status.etaVoiceMs - elapsed);

  return (
    <div
      className="relative mb-6 w-full max-w-xl rounded-2xl border border-mk-orange/25 bg-mk-orange/[0.06] p-4"
      role="status"
      aria-live="polite"
    >
      <button
        onClick={onDismiss}
        aria-label="Dismiss"
        className="absolute right-2.5 top-2.5 rounded-lg p-1.5 text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${
            ready
              ? "bg-mk-green/12 ring-mk-green/35"
              : "animate-pulse-soft bg-mk-orange/15 ring-mk-orange/35"
          }`}
        >
          {ready ? (
            <Play className="h-4 w-4 text-mk-green" />
          ) : (
            <Clapperboard className="h-4 w-4 text-mk-orange" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-semibold">
            {ready ? "Your Chalkcast is ready" : "Professor Ada is still at the board"}
          </div>
          <div className="truncate text-xs text-muted-foreground">
            {ready ? (
              status.title || status.question.slice(0, 60)
            ) : (
              <>
                <span className="tabular-nums">
                  {status.scenesDone}/{status.scenesTotal || "–"} scenes
                  boarded · {status.voicesDone}/{status.voicesTotal || "–"}{" "}
                  voices recorded
                </span>
                {" · "}
                <span className="text-mk-orange/90">
                  plays in {fmtLeft(etaWatch)}
                </span>
              </>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {ready ? (
            <Button
              size="sm"
              onClick={onWatch}
              className="rounded-lg bg-mk-green text-[#101410] hover:bg-mk-green/90"
            >
              <Play className="h-3.5 w-3.5" />
              Watch now
            </Button>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={onReopen}
              className="gap-1.5 rounded-lg border-white/15 bg-white/4 hover:bg-white/8"
            >
              <RefreshCw className="h-3.5 w-3.5 animate-[spin_3s_linear_infinite]" />
              Watch progress
            </Button>
          )}
        </div>
      </div>

      {!ready && (
        <div className="mt-3 flex items-center justify-between gap-3 border-t border-white/6 pt-2.5">
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            Leave anytime — the studio keeps working, and your video waits
            here. Full voice finishes in {fmtLeft(etaVoice)}.
          </p>
        </div>
      )}
    </div>
  );
}
