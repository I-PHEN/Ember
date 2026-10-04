"use client";

import React from "react";
import Link from "next/link";
import {
  Sparkles,
  ArrowRight,
  Play,
  Clapperboard,
  BookOpen,
  MessageSquare,
  Volume2,
  Check,
  Layers,
  GraduationCap,
  Lock,
} from "lucide-react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import RemotionHeroPlayer from "@/components/remotion/RemotionHeroPlayer";
import { SAMPLE_LESSONS } from "@/lib/samples";
import { formatMathTitle } from "@/lib/format-math";
import { useAuth } from "@/lib/firebase/auth-context";

export default function LandingPage() {
  const { user, loading, openAuthModal, signOut } = useAuth();
  const router = useRouter();

  // Once signed in, the hero section is detached — users immediately enter the studio app
  useEffect(() => {
    if (!loading && user) {
      router.replace("/studio");
    }
  }, [user, loading, router]);

  const handleLaunchStudio = (prompt?: string) => {
    const targetUrl = prompt ? `/studio?prompt=${encodeURIComponent(prompt)}` : "/studio";
    if (!user) {
      openAuthModal(() => {
        window.location.href = targetUrl;
      });
      return;
    }
    window.location.href = targetUrl;
  };

  // If authenticated or checking session, do not render hero section
  if (loading || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#121517] text-[#8b8d8f]">
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="h-2 w-2 rounded-full bg-[#e6b784] animate-pulse" />
          <span>Entering Ember Studio…</span>
        </div>
      </div>
    );
  }

  return (
    <main className="ember-home flex min-h-dvh flex-col bg-[#121517] text-[#f1eee7]">
      {/* Top Navigation Bar — Frosted Obsidian Glass */}
      <header className="sticky top-0 z-40 flex h-18 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0b0d10]/80 px-6 backdrop-blur-xl sm:px-12">
        <div className="flex items-center gap-8">
          <div className="flex items-center gap-2.5">
            <Wordmark />
            <span className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 font-mono text-[10px] text-[#e6b784]">
              v2.4
            </span>
          </div>
          <nav className="hidden items-center gap-6 text-xs font-medium text-[#8b919e] md:flex">
            <a href="#demo" className="transition hover:text-[#f1eee7]">
              Demo Video
            </a>
            <a href="#features" className="transition hover:text-[#f1eee7]">
              Pedagogy
            </a>
            <a href="#solves" className="transition hover:text-[#f1eee7]">
              Curated Solves
            </a>
            <Link
              href="/gallery"
              className="flex items-center gap-1 transition hover:text-[#e6b784]"
            >
              Community Gallery ↗
            </Link>
          </nav>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-2.5">
              <span className="hidden text-xs text-[#a0a6b2] sm:inline font-medium">
                {user.displayName || user.email}
              </span>
              <button
                type="button"
                onClick={() => signOut()}
                className="rounded-xl border border-white/[0.08] bg-[#14171d] px-3 py-1.5 text-xs font-semibold text-[#8b919e] hover:text-[#f1eee7] hover:border-white/[0.16] transition-all"
              >
                Sign Out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="rounded-xl border border-white/[0.08] bg-[#14171d] px-3.5 py-1.5 text-xs font-semibold text-[#f1eee7] hover:border-[#e6b784]/50 hover:bg-[#1a1e26] transition-all"
            >
              Sign In
            </button>
          )}

          <Button
            size="sm"
            onClick={() => handleLaunchStudio()}
            className="rounded-xl bg-gradient-to-r from-[#e6b784] to-[#f2ca9e] font-semibold text-[#141619] shadow-md shadow-[#e6b784]/20 hover:shadow-[#e6b784]/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Launch Studio
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </div>
      </header>

      {/* Editorial Hero Section */}
      <section className="relative mx-auto flex w-full max-w-5xl flex-col items-center px-4 pt-16 pb-14 text-center sm:px-6 sm:pt-24 sm:pb-20">
        {/* Subtle Ambient Radial Glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[320px] bg-gradient-to-b from-[#e6b784]/10 via-[#e6b784]/5 to-transparent blur-3xl rounded-full pointer-events-none -z-10" />

        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-xs font-semibold text-[#e6b784] tracking-wide shadow-xs backdrop-blur-md">
          <Sparkles className="h-3.5 w-3.5" />
          <span>AUTONOMOUS STEM BLACKBOARD TUTOR</span>
        </div>

        {/* Main Headline */}
        <h1 className="mt-6 max-w-3xl text-4xl font-semibold tracking-tight text-[#f4f4f6] sm:text-6xl lg:text-7xl sm:leading-[1.1]">
          Every problem,{" "}
          <span className="font-hand font-medium text-[#e6b784] relative inline-block">
            a lesson.
          </span>
        </h1>

        {/* Concise Value Proposition */}
        <p className="mt-5 max-w-2xl text-base text-[#a0a6b2] sm:text-lg sm:leading-relaxed">
          Type or paste any STEM problem. Professor Ember plans the derivation, chalks
          the board stroke-by-stroke, and teaches it aloud with natural pedagogical pacing.
        </p>

        {/* Primary Call to Actions */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
          <Button
            size="lg"
            onClick={() => handleLaunchStudio()}
            className="h-12 rounded-xl bg-gradient-to-r from-[#e6b784] to-[#f2ca9e] px-7 text-sm font-semibold text-[#141619] shadow-lg shadow-[#e6b784]/20 hover:shadow-[#e6b784]/35 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            Open Blackboard Studio
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>

          <a href="#demo">
            <Button
              size="lg"
              variant="outline"
              className="h-12 rounded-xl border-white/[0.08] bg-[#14171d] px-6 text-sm font-semibold text-[#f1eee7] hover:border-white/[0.18] hover:bg-[#1a1e26] transition-all"
            >
              <Play className="h-4 w-4 mr-2 text-[#e6b784]" />
              Watch Product Walkthrough
            </Button>
          </a>
        </div>

        {/* Value Prop Check Pills */}
        <div className="mt-10 flex flex-wrap items-center justify-center gap-3 text-xs text-[#8b919e]">
          <span className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#12151b] px-3.5 py-1.5 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5cdb95]" />
            Organic Chemistry Tutor Cadence (~110 WPM)
          </span>
          <span className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#12151b] px-3.5 py-1.5 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5cdb95]" />
            Synchronous Chalkboard Writing
          </span>
          <span className="flex items-center gap-2 rounded-full border border-white/[0.06] bg-[#12151b] px-3.5 py-1.5 shadow-xs">
            <span className="h-1.5 w-1.5 rounded-full bg-[#5cdb95]" />
            Interactive Office Hours Q&amp;A
          </span>
        </div>
      </section>

      {/* Product Walkthrough Video Showcase */}
      <section id="demo" className="mx-auto w-full max-w-5xl px-4 pb-20 sm:px-6 sm:pb-28">
        <div className="mb-8 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-0.5 text-[11px] font-semibold text-[#e6b784] uppercase tracking-wider font-mono">
            <Clapperboard className="h-3 w-3" />
            Product Walkthrough · Live Engine Demo
          </div>
          <h2 className="mt-3 text-2xl font-semibold tracking-tight text-[#f4f4f6] sm:text-3xl">
            See the actual app in action
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-[#8b919e] max-w-lg leading-relaxed">
            Interactive Remotion walkthrough showing the problem composer, multi-step derivation planner, blackboard player stage, and Office Hours conversation.
          </p>
        </div>

        {/* Embedded Interactive Remotion Player */}
        <RemotionHeroPlayer />
      </section>

      {/* Linear-Inspired Bento Grid: Pedagogical Architecture */}
      <section id="features" className="border-t border-white/[0.06] bg-[#0c0e12] py-20 px-4 sm:px-6 sm:py-28">
        <div className="mx-auto max-w-5xl">
          <div className="text-center max-w-xl mx-auto mb-16">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#e6b784] font-mono">
              Pedagogical Architecture
            </span>
            <h2 className="mt-2.5 text-2xl font-semibold text-[#f4f4f6] sm:text-3xl tracking-tight">
              Engineered for true comprehension, not AI speed-reading
            </h2>
            <p className="mt-2 text-sm text-[#8b919e] leading-relaxed">
              Every detail is calibrated against world-class human teaching — from intuition lead-ins to exact chalk placement.
            </p>
          </div>

          {/* Asymmetric Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Bento Card 1: Deterministic Chalkboard (Span 2 cols) */}
            <div className="md:col-span-2 group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12151b] p-6 sm:p-8 transition-all hover:border-white/[0.16] shadow-sm">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#e6b784]">
                <Layers className="h-5 w-5" />
              </div>
              <h3 className="mt-5 text-lg font-semibold text-[#f4f4f6]">
                Deterministic Blackboard Handwriting
              </h3>
              <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#8b919e] max-w-md">
                No generic bullet points or wall of slides. Real mathematical strokes, bracket curves, coordinate axes, and line clears. Exactly one final boxed answer per derivation.
              </p>

              {/* Interactive Visual Element: Chalk Proof Card */}
              <div className="mt-6 rounded-xl border border-white/[0.06] bg-[#090b0e] p-4 font-mono text-xs text-[#e6b784]/90 shadow-inner">
                <div className="flex items-center justify-between text-[10px] text-[#6a7180] pb-2 border-b border-white/[0.04]">
                  <span>STEP 3 · INTEGRATION BY PARTS</span>
                  <span className="text-[#5cdb95]">STROKE SYNC: 100%</span>
                </div>
                <div className="mt-3 space-y-1.5 text-xs text-[#e8eaed]">
                  <div className="text-[#8b919e] font-hand text-sm">
                    ∫ x · e^(2x) dx = u·v - ∫ v·du
                  </div>
                  <div className="text-[#e6b784] font-hand text-sm">
                    = ½ x e^(2x) - ∫ ½ e^(2x) dx
                  </div>
                  <div className="inline-block mt-2 border-2 border-[#e6b784] rounded-md px-3 py-1 font-hand text-sm text-[#f1eee7] bg-[#e6b784]/10">
                    = ½ x e^(2x) - ¼ e^(2x) + C
                  </div>
                </div>
              </div>
            </div>

            {/* Bento Card 2: Voice Cadence (Span 1 col) */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12151b] p-6 transition-all hover:border-white/[0.16] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#e6b784]">
                  <Volume2 className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-[#f4f4f6]">
                  The Organic Chemistry Tutor Cadence
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#8b919e]">
                  Spoken voice lead-ins (~2-3s) frame the intuition before chalk touches board. Deliberate, calm pacing (~108–114 WPM).
                </p>
              </div>

              {/* Visual Element: Audio Waveform Equalizer */}
              <div className="mt-6 rounded-xl border border-white/[0.06] bg-[#090b0e] p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between text-[10px] text-[#6a7180] font-mono">
                  <span>VOICE PROFILE</span>
                  <span className="text-[#e6b784]">112 WPM</span>
                </div>
                <div className="flex items-end justify-between h-9 gap-1 pt-1">
                  {[40, 65, 85, 45, 95, 70, 30, 80, 60, 90, 50, 75, 40].map((h, i) => (
                    <span
                      key={i}
                      className="w-full rounded-full bg-[#e6b784]/70 transition-all duration-300"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* Bento Card 3: Interactive Office Hours (Span 1 col) */}
            <div className="group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12151b] p-6 transition-all hover:border-white/[0.16] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#e6b784]">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-base font-semibold text-[#f4f4f6]">
                  Interactive Office Hours
                </h3>
                <p className="mt-2 text-xs leading-relaxed text-[#8b919e]">
                  Ask Professor Ember follow-up questions at any timestamp. Request alternative proofs, intuition checks, or voice mode.
                </p>
              </div>

              {/* Visual Element: Mini Chat Dialogue */}
              <div className="mt-6 rounded-xl border border-white/[0.06] bg-[#090b0e] p-3 space-y-2 text-[11px]">
                <div className="rounded-lg bg-white/[0.05] p-2 text-[#f1eee7]/90 text-right">
                  "Why choose u = x here?"
                </div>
                <div className="rounded-lg bg-[#e6b784]/15 border border-[#e6b784]/30 p-2 text-[#e6b784]">
                  "Because differentiating x reduces its degree to 1, leaving a direct exponential!"
                </div>
              </div>
            </div>

            {/* Bento Card 4: Multi-Theme Blackboard (Span 2 cols) */}
            <div className="md:col-span-2 group relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#12151b] p-6 sm:p-8 transition-all hover:border-white/[0.16] shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] text-[#e6b784]">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-[#f4f4f6]">
                  Interchangeable Pedagogical Canvas Themes
                </h3>
                <p className="mt-2 text-xs sm:text-sm leading-relaxed text-[#8b919e] max-w-md">
                  Choose between Classic Green Slate, Midnight Obsidian, and Warm Academic backgrounds. Full timeline scrub bar with named chapter marks and speeds from 0.75x to 2x.
                </p>
              </div>

              {/* Visual Element: Theme Swatches */}
              <div className="mt-6 grid grid-cols-3 gap-3">
                <div className="rounded-xl border border-white/[0.08] bg-[#18231c] p-3 text-center">
                  <div className="h-4 w-4 rounded-full bg-[#27c93f] mx-auto mb-1.5 opacity-80" />
                  <span className="text-[11px] font-medium text-[#f1eee7]">Green Slate</span>
                </div>
                <div className="rounded-xl border border-[#e6b784]/50 bg-[#121518] p-3 text-center shadow-xs">
                  <div className="h-4 w-4 rounded-full bg-[#e6b784] mx-auto mb-1.5 opacity-80" />
                  <span className="text-[11px] font-medium text-[#e6b784]">Blackboard</span>
                </div>
                <div className="rounded-xl border border-white/[0.08] bg-[#1c1a17] p-3 text-center">
                  <div className="h-4 w-4 rounded-full bg-[#f59e0b] mx-auto mb-1.5 opacity-80" />
                  <span className="text-[11px] font-medium text-[#f1eee7]">Warm Charcoal</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Curated Solves Showcase */}
      <section id="solves" className="mx-auto w-full max-w-5xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="flex flex-col items-center text-center mb-12">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#e6b784] font-mono">
            Pre-Computed Masterclasses
          </span>
          <h2 className="mt-2.5 text-2xl font-semibold text-[#f4f4f6] sm:text-3xl tracking-tight">
            Explore Curated Starters
          </h2>
          <p className="mt-1.5 text-xs sm:text-sm text-[#8b919e] max-w-md leading-relaxed">
            Click any problem to launch it directly in the Blackboard Studio.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          {SAMPLE_LESSONS.map((item) => (
            <div
              key={item.title}
              className="group flex flex-col rounded-2xl border border-white/[0.08] bg-[#12151b] p-5 transition-all duration-200 hover:border-[#e6b784]/50 hover:shadow-lg hover:shadow-black/40 hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-between text-xs text-[#8b919e]">
                <span className="rounded-md border border-white/[0.06] bg-white/[0.04] px-2 py-0.5 font-medium text-[#e6b784] text-[11px]">
                  {item.subject}
                </span>
                <span className="font-mono text-[11px] text-[#6a7180]">
                  {item.scenes.length} steps
                </span>
              </div>

              <h3 className="mt-3.5 text-sm font-semibold text-[#f4f4f6] group-hover:text-[#e6b784] transition-colors leading-snug">
                {formatMathTitle(item.title)}
              </h3>

              <p className="mt-2 text-xs text-[#8b919e] leading-relaxed line-clamp-2">
                {item.question}
              </p>

              <div className="mt-auto pt-5">
                <button
                  type="button"
                  onClick={() => handleLaunchStudio(item.title)}
                  className="flex w-full items-center justify-between rounded-xl border border-white/[0.08] bg-[#151922] px-3.5 py-2.5 text-xs font-semibold text-[#e6b784] transition-all hover:border-[#e6b784]/40 hover:bg-[#1a1f2a]"
                >
                  <span>Solve in Studio</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Final Call to Action */}
      <section className="relative border-t border-white/[0.06] bg-[#0c0e12] py-20 px-4 text-center sm:px-6 overflow-hidden">
        {/* Ambient Warm Aura */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[250px] bg-[#e6b784]/5 blur-3xl rounded-full pointer-events-none" />

        <div className="relative mx-auto max-w-2xl space-y-4">
          <h2 className="text-3xl font-semibold tracking-tight text-[#f4f4f6] sm:text-4xl">
            Ready to turn any problem into a masterclass?
          </h2>
          <p className="text-sm text-[#8b919e] max-w-lg mx-auto leading-relaxed">
            Paste any STEM problem in calculus, physics, or chemistry and watch Professor Ember teach it.
          </p>
          <div className="pt-3">
            <Button
              size="lg"
              onClick={() => handleLaunchStudio()}
              className="h-12 rounded-xl bg-gradient-to-r from-[#e6b784] to-[#f2ca9e] px-8 text-sm font-semibold text-[#141619] shadow-lg shadow-[#e6b784]/20 hover:shadow-[#e6b784]/35 hover:scale-[1.02] active:scale-[0.98] transition-all"
            >
              Launch Blackboard Studio Free
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Minimal Footer */}
      <footer className="border-t border-white/[0.06] bg-[#090b0e] px-6 py-10 text-xs text-[#707684]">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="text-white/20">·</span>
            <span>Every problem, a lesson.</span>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={() => handleLaunchStudio()}
              className="hover:text-[#f1eee7] transition"
            >
              Studio
            </button>
            <Link href="/gallery" className="hover:text-[#f1eee7] transition">
              Gallery
            </Link>
            <a href="#demo" className="hover:text-[#f1eee7] transition">
              Demo
            </a>
          </div>
        </div>
      </footer>
    </main>
  );
}
