"use client";

/* ------------------------------------------------------------------
   GenerateOverlay — the waiting room for the multi-agent studio.

   Shows the crew working in real time (director → scene writers →
   voice), a ticking ETA until the video can start, and the promise
   the user asked for: you can leave and come back later — the video
   keeps being made and waits for you.
------------------------------------------------------------------- */

import { useEffect, useState } from "react";
import {
  PenLine,
  Clapperboard,
  BookOpenText,
  AudioLines,
  Check,
  Coffee,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { VideoJobStatus } from "@/lib/use-video-job";

function fmtLeft(ms: number): string {
  const s = Math.max(0, Math.round(ms / 1000));
  if (s <= 4) return "any moment now";
  if (s < 15) return `about ${s}s`;
  if (s < 90) return `about ${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  return r ? `about ${m}m ${r}s` : `about ${m}min`;
}

/** smooth countdown between polls */
function useTick(): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(t);
  }, []);
  return now;
}

interface Props {
  status: VideoJobStatus;
  onLeave: () => void;
}

export default function GenerateOverlay({ status, onLeave }: Props) {
  const now = useTick();
  const elapsed = now - status.at;
  const etaWatch = Math.max(0, status.etaWatchMs - elapsed);
  const etaVoice = Math.max(0, status.etaVoiceMs - elapsed);

  const directing = status.phase === "directing";
  const scripting = status.phase === "scripting";
  const boarding = status.phase === "boarding";
  const writerPct =
    status.scenesTotal > 0
      ? status.scenesDone / status.scenesTotal
      : 0;
  const voicePct =
    status.voicesTotal > 0 ? status.voicesDone / status.voicesTotal : 0;
  const overall =
    directing || scripting
      ? directing
        ? 0.06
        : 0.16
      : 0.16 + 0.54 * writerPct;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Making your solve video"
    >
      <div className="relative w-full max-w-md rounded-2xl border border-[#34383c] bg-[#171b1d] p-6 shadow-2xl">
        <button
          onClick={onLeave}
          aria-label="Keep it running in the background"
          className="absolute right-3.5 top-3.5 rounded-lg p-1.5 text-muted-foreground transition hover:bg-[#23262a] hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>

        {/* header */}
        <div className="mb-5 flex items-center gap-3 pr-8">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#e6b784]/10 ring-1 ring-[#e6b784]/25">
            <Clapperboard className="h-5 w-5 text-[#e6b784]" />
          </span>
          <div className="min-w-0">
            <div className="text-sm font-semibold">
              Ember is making your lesson
            </div>
            <div className="truncate font-hand text-[15px] text-[#e6b784]">
              {status.question.slice(0, 48) || status.title}
            </div>
          </div>
        </div>

        {/* progress bar */}
        <div className="mb-5 h-2 w-full overflow-hidden rounded-full bg-[#23262a]">
          <div
            className="h-full rounded-full bg-[#e6b784] transition-all duration-700 ease-out"
            style={{ width: `${Math.round(overall * 100)}%` }}
          />
        </div>

        {/* the crew */}
        <div className="space-y-3.5">
          {/* director */}
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition ${
                directing
                  ? "animate-pulse-soft bg-[#e6b784]/15 ring-[#e6b784]/40"
                  : "bg-[#f1eee7]/6 ring-[#f1eee7]/15"
              }`}
            >
              {directing ? (
                <Clapperboard className="h-4 w-4 text-[#e6b784]" />
              ) : (
                <Check className="h-4 w-4 text-[#f1eee7]/85" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">Ember</div>
              <div className="truncate text-xs text-muted-foreground">
                {directing
                  ? "reading the question, shaping the lecture arc…"
                  : "lesson arc ready — handed to the transcript planner"}
              </div>
            </div>
          </div>

          {/* transcript planner */}
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition ${
                scripting
                  ? "animate-pulse-soft bg-[#e6b784]/15 ring-[#e6b784]/40"
                  : directing
                    ? "bg-[#f1eee7]/4 ring-[#f1eee7]/10"
                    : "bg-[#f1eee7]/6 ring-[#f1eee7]/15"
              }`}
            >
              {scripting ? (
                <BookOpenText className="h-4 w-4 text-[#e6b784]" />
              ) : (
                <Check className="h-4 w-4 text-[#f1eee7]/85" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">Lecture script</div>
              <div className="truncate text-xs text-muted-foreground">
                {scripting
                  ? "writing every word she'll say — engaging, unhurried…"
                  : directing
                    ? "— starts right after the plan"
                    : "transcript ready — every word planned"}
              </div>
            </div>
          </div>

          {/* scene writers */}
          <div className="flex items-start gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition ${
                boarding
                  ? "animate-pulse-soft bg-[#e6b784]/15 ring-[#e6b784]/40"
                  : directing
                    ? "bg-[#f1eee7]/4 ring-[#f1eee7]/10"
                    : "bg-[#f1eee7]/6 ring-[#f1eee7]/15"
              }`}
            >
              {boarding ? (
                <PenLine className="h-4 w-4 text-[#e6b784]" />
              ) : (
                <Check className="h-4 w-4 text-[#f1eee7]/85" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">
                Scene writers
                <span className="ml-1.5 tabular-nums text-muted-foreground">
                  {boarding && status.scenesTotal > 0
                    ? `— ${status.scenesDone}/${status.scenesTotal} boarded`
                    : directing || scripting
                      ? "— waiting for the words"
                      : "— every scene boarded"}
                </span>
              </div>
              <div
                className="mt-1.5 flex flex-wrap gap-1"
                aria-hidden="true"
              >
                {Array.from({
                  length: Math.max(1, Math.min(status.scenesTotal || 8, 14)),
                }).map((_, i) => {
                  const done = i < status.scenesDone;
                  return (
                    <span
                      key={i}
                      className={`h-2.5 w-5 rounded-[3px] transition-all duration-500 ${
                        done
                          ? "bg-[#e6b784]/80"
                          : boarding
                            ? "animate-pulse-soft bg-[#f1eee7]/14"
                            : "bg-[#f1eee7]/8"
                      }`}
                    />
                  );
                })}
              </div>
              {boarding && status.scenesTotal > 4 && (
                <div className="mt-1.5 text-[11px] text-muted-foreground">
                  3 writers working at once, each on its slice of the script
                </div>
              )}
            </div>
          </div>

          {/* voice */}
          <div className="flex items-center gap-3">
            <span
              className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 transition ${
                status.voicesDone > 0 || boarding
                  ? "animate-pulse-soft bg-[#e6b784]/12 ring-[#e6b784]/30"
                  : "bg-[#f1eee7]/4 ring-[#f1eee7]/10"
              }`}
            >
              <AudioLines className="h-4 w-4 text-[#e6b784]" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-[13px] font-medium">
                Voice
                <span className="ml-1.5 tabular-nums text-muted-foreground">
                  {status.voicesTotal > 0
                    ? `— ${status.voicesDone}/${status.voicesTotal} recorded`
                    : "— starts right after the plan"}
                </span>
              </div>
              <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-[#23262a]">
                <div
                  className="h-full rounded-full bg-[#e6b784]/80 transition-all duration-700"
                  style={{ width: `${Math.round(voicePct * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* ETA */}
        <div
          className="mt-5 rounded-xl border border-[#e6b784]/20 bg-[#e6b784]/8 px-4 py-3"
          aria-live="polite"
        >
          <div className="text-[13.5px] font-semibold text-[#e6b784]">
            {directing
              ? "Ember is planning the lesson…"
              : scripting
                ? "Writing every word of the lecture…"
                : `Your video starts in ${fmtLeft(etaWatch)}`}
          </div>
          <div className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
            {boarding || directing || scripting
              ? `Full voice track finishes about ${fmtLeft(etaVoice)} from now — playback keeps up automatically, so you'll start watching before it's done.`
              : "Almost there — the player starts the moment the board is ready."}
          </div>
        </div>

        {/* the promise */}
        <div className="mt-4 flex items-center gap-3">
          <Coffee className="h-4 w-4 shrink-0 text-muted-foreground" />
          <p className="flex-1 text-xs leading-relaxed text-muted-foreground">
            You can leave and come back later — we keep making it, and it
            will wait for you here.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={onLeave}
            className="shrink-0 rounded-lg text-muted-foreground hover:text-foreground"
          >
            Come back later
          </Button>
        </div>
      </div>
    </div>
  );
}
