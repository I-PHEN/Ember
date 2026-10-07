"use client";

import React, { useRef, useState, useEffect } from "react";
import { Player, PlayerRef } from "@remotion/player";
import { EmberDemoComposition } from "./EmberDemoComposition";
import { cn } from "@/lib/utils";

interface Phase {
  title: string;
  frame: number;
}

const PHASES: Phase[] = [
  { title: "Problem Composer", frame: 0 },
  { title: "Derivation Planner", frame: 180 },
  { title: "Blackboard Stage", frame: 360 },
  { title: "Office Hours", frame: 600 },
];

export default function RemotionHeroPlayer() {
  const playerRef = useRef<PlayerRef>(null);
  const [activePhase, setActivePhase] = useState(0);

  // Sync active phase in real-time as the loop plays
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current) return;
      const currentFrame = playerRef.current.getCurrentFrame();
      if (currentFrame >= 600) setActivePhase(3);
      else if (currentFrame >= 360) setActivePhase(2);
      else if (currentFrame >= 180) setActivePhase(1);
      else setActivePhase(0);
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const jumpToPhase = (frame: number, idx: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(frame);
      playerRef.current.play();
      setActivePhase(idx);
    }
  };

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* Single Matte Workstation Frame — Zero Glow */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111317] shadow-xl">
        {/* Sleek Top Bar with 4 Phase Tour Pills */}
        <div className="flex h-12 items-center justify-between border-b border-white/[0.06] bg-[#14171d] px-3 sm:px-4 text-xs">
          {/* Phase Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {PHASES.map((p, idx) => (
              <button
                key={p.title}
                type="button"
                onClick={() => jumpToPhase(p.frame, idx)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all whitespace-nowrap",
                  activePhase === idx
                    ? "border border-[#e6b784]/40 bg-[#e6b784]/15 text-[#e6b784]"
                    : "border border-transparent text-[#8b919e] hover:text-[#f4f4f6] hover:bg-white/[0.04]"
                )}
              >
                <span className="font-mono text-[10px] opacity-60">0{idx + 1}</span>
                <span>{p.title}</span>
              </button>
            ))}
          </div>

          {/* Quiet Tour Badge */}
          <div className="hidden sm:flex items-center gap-2 font-mono text-[11px] text-[#707684]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5cdb95]" />
            <span>Interactive Product Tour</span>
          </div>
        </div>

        {/* 16:9 Recurring Product Tour Canvas — Clean Autoplay Loop, No Bulky Controls */}
        <div className="relative aspect-video w-full bg-[#0a0b0e]">
          <Player
            ref={playerRef}
            component={EmberDemoComposition}
            durationInFrames={750}
            compositionWidth={1920}
            compositionHeight={1080}
            fps={30}
            style={{
              width: "100%",
              height: "100%",
            }}
            acknowledgeRemotionLicense={true}
            controls={false}
            autoPlay={true}
            loop={true}
            inputProps={{
              showAudio: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
