import React from "react";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Film,
  Sparkles,
  Volume2,
  Cpu,
  Layers,
  Activity,
  CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HowItWorksPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#090b0e] text-[#f1eee7] selection:bg-[#e6b784]/25">
      {/* Header */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#090b0e]/85 px-6 backdrop-blur-xl sm:px-12">
        <Link href="/">
          <Wordmark />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/gallery"
            className="text-xs text-[#8b919e] hover:text-[#f1eee7] transition-colors hidden sm:inline-block"
          >
            Gallery
          </Link>
          <Link
            href="/studio"
            className="rounded-full bg-[#e6b784] px-4 py-1.5 text-xs font-semibold text-[#12151c] hover:bg-[#ebd0b0] transition-colors"
          >
            Launch Studio
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-6 pt-20 pb-16 text-center sm:pt-24 sm:pb-20">
        <div className="inline-flex items-center gap-2 rounded-full border border-[#e6b784]/20 bg-[#e6b784]/10 px-3 py-1 text-xs font-mono text-[#e6b784] mb-6">
          <Activity className="h-3.5 w-3.5" />
          <span>System Architecture & Mathematical Foundations</span>
        </div>
        <h1 className="text-4xl font-semibold tracking-tight text-[#f4f4f6] sm:text-5xl lg:text-6xl max-w-3xl leading-[1.15]">
          How Ember Works
        </h1>
        <p className="mt-6 max-w-2xl text-base text-[#9aa1af] leading-relaxed sm:text-lg">
          Ember is the first autonomous whiteboard lecture engine built from verified mathematical truth,
          biological motor control kinematics, and ear-first acoustic synthesis.
        </p>
      </section>

      {/* 5-Stage Architecture Grid */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-24">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          {/* Stage 1: CAS Verification */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#12151c]/60 p-7 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400/80">Stage 1</span>
                  <h3 className="text-lg font-semibold text-[#f4f4f6]">One Verified Source of Truth</h3>
                </div>
              </div>
              <p className="text-sm text-[#9aa1af] leading-relaxed mb-4">
                Before a single frame is drawn, the problem is solved and mathematically verified through a deterministic
                Computer Algebra System (CAS sandbox with SymPy) alongside an independent blind solver.
              </p>
              <ul className="space-y-2 text-xs text-[#c5c8d0] font-mono">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Symbolic equivalence & boundary condition verification</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                  <span>Eliminates arithmetic and algebraic hallucination at t=0</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 rounded-lg bg-black/40 border border-white/[0.04] p-3 text-xs font-mono text-emerald-300/90">
              <code>CAS.verify(step[i], step[i+1]) → [0 algebraic error]</code>
            </div>
          </div>

          {/* Stage 2: Dynamic Micro-Scenes */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#12151c]/60 p-7 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
                  <Film className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-blue-400/80">Stage 2</span>
                  <h3 className="text-lg font-semibold text-[#f4f4f6]">Dynamic Micro-Scene Planning</h3>
                </div>
              </div>
              <p className="text-sm text-[#9aa1af] leading-relaxed mb-4">
                Rather than generating monolithic video scripts that drift over time, Ember dynamically structures lessons
                into 2 to 8 focused pedagogical micro-scenes based on problem complexity.
              </p>
              <ul className="space-y-2 text-xs text-[#c5c8d0] font-mono">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>Elementary problems: 2–3 scenes (60–90s total)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>Undergraduate proofs: 5–8 distinct mathematical hinges</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 rounded-lg bg-black/40 border border-white/[0.04] p-3 text-xs font-mono text-blue-300/90">
              <code>Cadence: Spoken Lead-in → Synchronous Ink → Coda</code>
            </div>
          </div>

          {/* Stage 3: Motor Control Kinematics */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#12151c]/60 p-7 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400/80">Stage 3</span>
                  <h3 className="text-lg font-semibold text-[#f4f4f6]">The Two-Thirds Power Law</h3>
                </div>
              </div>
              <p className="text-sm text-[#9aa1af] leading-relaxed mb-4">
                Human handwriting is non-linear: real hands slow down in sharp curves and accelerate along straightaways.
                Ember enforces the motor-control Two-Thirds Power Law with ballistic stroke bursts.
              </p>
              <ul className="space-y-2 text-xs text-[#c5c8d0] font-mono">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Velocity law: v(t) = α · κ(t)^(-1/3)</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>Burst writing (180–240 px/s) + macro-pauses for absorption</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 rounded-lg bg-black/40 border border-white/[0.04] p-3 text-xs font-mono text-[#e6b784]">
              <code>3D Deictic Pointers: z ≥ 18px elevation + ground shadow</code>
            </div>
          </div>

          {/* Stage 4: Spoken Math & Gemini Audio */}
          <div className="rounded-2xl border border-white/[0.08] bg-[#12151c]/60 p-7 backdrop-blur-md flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400">
                  <Volume2 className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[11px] font-mono uppercase tracking-wider text-purple-400/80">Stage 4</span>
                  <h3 className="text-lg font-semibold text-[#f4f4f6]">Spoken Math & Gemini 3.8 Flash</h3>
                </div>
              </div>
              <p className="text-sm text-[#9aa1af] leading-relaxed mb-4">
                Robotic TTS reads LaTeX literally. Ember normalizes mathematical symbols for the ear into conversational
                phrasing, synthesized via Gemini 3.8 Flash Lite TTS at 24kHz.
              </p>
              <ul className="space-y-2 text-xs text-[#c5c8d0] font-mono">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>∫ e^(-x²) dx → &quot;the integral of e to the negative x squared dx&quot;</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>Monotonic word alignment & say-tag time boundaries</span>
                </li>
              </ul>
            </div>
            <div className="mt-6 rounded-lg bg-black/40 border border-white/[0.04] p-3 text-xs font-mono text-purple-300/90">
              <code>Audio: 24kHz Gemini Neural Voice (Aoede model)</code>
            </div>
          </div>

          {/* Stage 5: Real-Time 60fps Canvas */}
          <div className="md:col-span-2 rounded-2xl border border-white/[0.08] bg-[#12151c]/60 p-7 backdrop-blur-md">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <Cpu className="h-5 w-5" />
              </div>
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-rose-400/80">Stage 5</span>
                <h3 className="text-lg font-semibold text-[#f4f4f6]">Real-Time 60fps Canvas Engine</h3>
              </div>
            </div>
            <p className="text-sm text-[#9aa1af] leading-relaxed mb-4 max-w-2xl">
              Unlike video engines like Manim or Code2Video that take 2+ hours to compile video files, Ember renders pure
              mathematical vectors directly on an HTML5 2D Canvas at a locked 60 frames per second. Zero video transcoding wait time.
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
                <div className="text-lg font-semibold text-[#f1eee7]">0 ms</div>
                <div className="text-[11px] text-[#787f8d]">Video Transcode Lag</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
                <div className="text-lg font-semibold text-[#f1eee7]">60 fps</div>
                <div className="text-[11px] text-[#787f8d]">Native Canvas Refresh</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
                <div className="text-lg font-semibold text-[#f1eee7]">183</div>
                <div className="text-[11px] text-[#787f8d]">Automated Tests Passing</div>
              </div>
              <div className="rounded-xl border border-white/[0.06] bg-black/30 p-3">
                <div className="text-lg font-semibold text-[#f1eee7]">100%</div>
                <div className="text-[11px] text-[#787f8d]">Vector Centerline Ink</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Roadmap & Coming Soon */}
      <section className="mx-auto w-full max-w-5xl px-6 pb-24 border-t border-white/[0.06] pt-16">
        <h2 className="text-2xl font-semibold text-[#f4f4f6] mb-2">Platform Roadmap</h2>
        <p className="text-sm text-[#9aa1af] mb-8">
          The next frontiers of conversational, multimodal whiteboard tutoring.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <div className="rounded-xl border border-white/[0.06] bg-[#12151c]/40 p-5">
            <h4 className="text-sm font-semibold text-[#f1eee7] mb-2">Interactive Student Interruptions</h4>
            <p className="text-xs text-[#8b919e] leading-relaxed mb-3">
              Ask questions mid-lesson: &quot;Wait, why did we multiply by 2?&quot; and the professor pauses and explains.
            </p>
            <span className="inline-block rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-mono text-amber-400">
              Coming soon.
            </span>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[#12151c]/40 p-5">
            <h4 className="text-sm font-semibold text-[#f1eee7] mb-2">Multimodal Homework Vision</h4>
            <p className="text-xs text-[#8b919e] leading-relaxed mb-3">
              Snap a photo of your messy handwritten calculus or chemistry exam and Ember reconstructs the lesson instantly.
            </p>
            <span className="inline-block rounded bg-blue-500/10 px-2 py-0.5 text-[10px] font-mono text-blue-400">
              In Development
            </span>
          </div>

          <div className="rounded-xl border border-white/[0.06] bg-[#12151c]/40 p-5">
            <h4 className="text-sm font-semibold text-[#f1eee7] mb-2">4K Headless Cloud Render</h4>
            <p className="text-xs text-[#8b919e] leading-relaxed mb-3">
              High-resolution ProRes & MP4 export via background distributed Web Workers and serverless GPU clusters.
            </p>
            <span className="inline-block rounded bg-emerald-500/10 px-2 py-0.5 text-[10px] font-mono text-emerald-400">
              Q4 2026
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] bg-[#07080a] px-6 py-8 text-xs text-[#707684] mt-auto">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="text-white/20">·</span>
            <span>Every problem, a lesson.</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/" className="hover:text-[#f1eee7] transition-colors">
              Home
            </Link>
            <Link href="/gallery" className="hover:text-[#f1eee7] transition-colors">
              Gallery
            </Link>
            <Link href="/studio" className="hover:text-[#f1eee7] transition-colors text-[#e6b784]">
              Studio
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
