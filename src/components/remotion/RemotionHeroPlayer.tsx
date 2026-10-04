"use client";

import React, { useRef, useState, useEffect } from "react";
import { Player, PlayerRef } from "@remotion/player";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { EmberDemoComposition } from "./EmberDemoComposition";
import { useAuth } from "@/lib/firebase/auth-context";

interface Chapter {
  title: string;
  frame: number;
  time: string;
}

const CHAPTERS: Chapter[] = [
  { title: "Gallery", frame: 0, time: "0:00" },
  { title: "Composer", frame: 300, time: "0:10" },
  { title: "AI Director", frame: 660, time: "0:22" },
  { title: "Blackboard", frame: 1020, time: "0:34" },
  { title: "Office Hours", frame: 1500, time: "0:50" },
  { title: "Outro", frame: 1740, time: "0:58" },
];

export default function RemotionHeroPlayer() {
  const { user, openAuthModal } = useAuth();
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeChapter, setActiveChapter] = useState(0);

  // Sync active chapter on frame update
  useEffect(() => {
    const interval = setInterval(() => {
      if (!playerRef.current) return;
      const currentFrame = playerRef.current.getCurrentFrame();
      if (currentFrame >= 1740) setActiveChapter(5);
      else if (currentFrame >= 1500) setActiveChapter(4);
      else if (currentFrame >= 1020) setActiveChapter(3);
      else if (currentFrame >= 660) setActiveChapter(2);
      else if (currentFrame >= 300) setActiveChapter(1);
      else setActiveChapter(0);

      setIsPlaying(playerRef.current.isPlaying());
    }, 200);
    return () => clearInterval(interval);
  }, []);

  const jumpToChapter = (ch: Chapter, idx: number) => {
    if (playerRef.current) {
      playerRef.current.seekTo(ch.frame);
      playerRef.current.play();
      setActiveChapter(idx);
    }
  };

  const handleLaunchStudio = () => {
    if (!user) {
      openAuthModal(() => {
        window.location.href = "/studio";
      });
      return;
    }
    window.location.href = "/studio";
  };

  return (
    <div className="relative mx-auto w-full max-w-5xl">
      {/* Subtle ambient lighting pool behind the player frame */}
      <div className="absolute -inset-1 rounded-3xl bg-gradient-to-b from-[#e6b784]/10 via-transparent to-transparent blur-2xl pointer-events-none" />

      {/* Studio Workstation Window Frame */}
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#111317] shadow-2xl shadow-black ring-1 ring-white/[0.03]">
        {/* Workstation Window Titlebar */}
        <div className="flex h-11 items-center justify-between border-b border-white/[0.06] bg-[#16191f]/90 px-4 text-xs backdrop-blur-md">
          {/* Mac Traffic Lights Window Controls */}
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#ff5f56]/90 border border-[#e0443e]/40 shadow-xs" />
            <span className="h-3 w-3 rounded-full bg-[#ffbd2e]/90 border border-[#dea123]/40 shadow-xs" />
            <span className="h-3 w-3 rounded-full bg-[#27c93f]/90 border border-[#1aab29]/40 shadow-xs" />
          </div>

          {/* Centered Workstation Title Pill */}
          <div className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#0d0f12]/70 px-3 py-0.5 font-mono text-[11px] text-[#a0a6b2]">
            <span className="text-[#e6b784]">ember-studio</span>
            <span className="text-white/20">/</span>
            <span>walkthrough.mp4</span>
            <span className="text-white/20">·</span>
            <span className="text-[#5cdb95]">1080p 30fps</span>
          </div>

          {/* Right Status & Launch Pill */}
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-[#7a8190] font-mono">
              <span className="h-1.5 w-1.5 rounded-full bg-[#5cdb95] animate-pulse" />
              <span>Canvas Engine</span>
            </div>
            <button
              type="button"
              onClick={handleLaunchStudio}
              className="flex items-center gap-1 font-semibold text-[#e6b784] hover:text-[#f2ca9e] transition-colors"
            >
              <span>Launch Studio</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>
        </div>

        {/* 16:9 Aspect Ratio Remotion Canvas with Subtle Inner Shadow */}
        <div className="relative aspect-video w-full bg-[#0a0b0e] shadow-[inset_0_2px_12px_rgba(0,0,0,0.8)]">
          <Player
            ref={playerRef}
            component={EmberDemoComposition}
            durationInFrames={1920}
            compositionWidth={1920}
            compositionHeight={1080}
            fps={30}
            style={{
              width: "100%",
              height: "100%",
            }}
            acknowledgeRemotionLicense={true}
            controls={true}
            autoPlay={true}
            loop={true}
            inputProps={{
              showAudio: false,
            }}
          />
        </div>

        {/* Chapter Quick Jump Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-white/[0.06] bg-[#14171d]/95 p-3 sm:px-4">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="mr-1 text-[10px] font-semibold uppercase tracking-wider text-[#6a7180] font-mono">
              Scenes:
            </span>
            {CHAPTERS.map((ch, idx) => (
              <button
                key={ch.title}
                type="button"
                onClick={() => jumpToChapter(ch, idx)}
                className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all ${
                  activeChapter === idx
                    ? "border-[#e6b784]/60 bg-[#e6b784]/15 text-[#e6b784] shadow-xs"
                    : "border-white/[0.06] bg-[#101217] text-[#8b919e] hover:border-white/[0.12] hover:text-[#f1eee7]"
                }`}
              >
                <span className="font-mono text-[10.5px] opacity-70">{ch.time}</span>
                <span>{ch.title}</span>
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="rounded-md border border-white/[0.06] bg-[#0f1116] px-2.5 py-1 text-[11px] font-mono text-[#5cdb95]">
              Real App Walkthrough
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
