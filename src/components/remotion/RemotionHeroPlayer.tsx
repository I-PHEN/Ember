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
  { title: "Problem", frame: 0 },
  { title: "Plan", frame: 150 },
  { title: "Blackboard", frame: 300 },
  { title: "Ask questions", frame: 450 },
];

export default function RemotionHeroPlayer() {
  const playerRef = useRef<PlayerRef>(null);
  const [activePhase, setActivePhase] = useState(0);

  // Sync active phase in real-time as the loop plays (600 frames / 20 seconds @ 30fps)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current) return;
      const currentFrame = playerRef.current.getCurrentFrame();
      if (currentFrame >= 450) setActivePhase(3);
      else if (currentFrame >= 300) setActivePhase(2);
      else if (currentFrame >= 150) setActivePhase(1);
      else setActivePhase(0);
    }, 150);
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
      {/* Matte Workstation Frame */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0d1017]">
        {/* Top Bar with Plain Phase Tour Pills */}
        <div className="flex h-12 items-center justify-between border-b border-white/[0.06] bg-[#10131a] px-3 sm:px-5 text-xs">
          {/* Phase Switcher Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto py-1">
            {PHASES.map((p, idx) => (
              <button
                key={p.title}
                type="button"
                onClick={() => jumpToPhase(p.frame, idx)}
                className={cn(
                  "flex items-center rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e6b784]",
                  activePhase === idx
                    ? "border border-[#e6b784]/40 bg-[#e6b784]/15 text-[#e6b784]"
                    : "border border-transparent text-[#8b919e] hover:text-[#f4f4f6] hover:bg-white/[0.04]"
                )}
              >
                <span>{p.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* 16:9 Recurring Product Tour Canvas — 20s (600 frames @ 30fps) */}
        <div className="relative aspect-video w-full bg-[#090b0e]">
          <Player
            ref={playerRef}
            component={EmberDemoComposition}
            durationInFrames={600}
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
