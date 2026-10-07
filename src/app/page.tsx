"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { ArrowRight, Search } from "lucide-react";
import { useRouter } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import RemotionHeroPlayer from "@/components/remotion/RemotionHeroPlayer";
import { useAuth } from "@/lib/firebase/auth-context";

export default function LandingPage() {
  const { user, loading, openAuthModal, signOut } = useAuth();
  const router = useRouter();
  const [heroInput, setHeroInput] = useState("");

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

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLaunchStudio(heroInput.trim() || undefined);
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
      {/* Top Navigation Bar */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0b0d10]/90 px-6 backdrop-blur-xl sm:px-12">
        <div className="flex items-center gap-4">
          <Wordmark />
        </div>

        {/* Quiet Header Actions */}
        <div className="flex items-center gap-5 text-xs font-medium">
          <Link
            href="/gallery"
            className="text-[#8b919e] hover:text-[#f1eee7] transition-colors"
          >
            Gallery
          </Link>

          {!user ? (
            <button
              type="button"
              onClick={() => openAuthModal()}
              className="text-[#8b919e] hover:text-[#f1eee7] transition-colors"
            >
              Sign In
            </button>
          ) : (
            <button
              type="button"
              onClick={() => signOut()}
              className="text-[#8b919e] hover:text-[#f1eee7] transition-colors"
            >
              Sign Out
            </button>
          )}

          <Button
            size="sm"
            variant="outline"
            onClick={() => handleLaunchStudio()}
            className="h-8 rounded-xl border-white/[0.12] bg-[#14171d] px-3.5 text-xs font-semibold text-[#e8eaed] hover:border-white/[0.22] hover:bg-[#1a1e26] transition-all"
          >
            Open Studio
          </Button>
        </div>
      </header>

      {/* Simplistic Matte Hero Section */}
      <section className="relative mx-auto flex w-full max-w-4xl flex-col items-center px-4 pt-16 pb-10 text-center sm:px-6 sm:pt-24 sm:pb-14">
        {/* Eyebrow Label: Shortened, no sparkle icon, no glow */}
        <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] px-3.5 py-1 font-mono text-[11px] font-semibold tracking-wider text-[#e6b784]">
          AUTONOMOUS BLACKBOARD STEM TUTOR
        </div>

        {/* Headline: Clean, crisp, handwritten amber accent, zero glow */}
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-[#f4f4f6] sm:text-6xl sm:leading-[1.1]">
          Every problem,{" "}
          <span className="font-hand font-medium text-[#e6b784]">
            a lesson.
          </span>
        </h1>

        {/* One-Sentence Sub-headline */}
        <p className="mt-4 max-w-xl text-base text-[#a0a6b2] sm:text-lg sm:leading-relaxed">
          Type or paste any university STEM problem. Professor Ember plans the derivation, chalks
          the board stroke-by-stroke, and teaches it aloud with a calm, deliberate pace.
        </p>

        {/* Real Action Bar: One Input with the ONE Loud Peach Button */}
        <form
          onSubmit={handlePromptSubmit}
          className="relative mx-auto mt-7 flex w-full max-w-xl items-center rounded-2xl border border-white/[0.08] bg-[#14171e] p-1.5 focus-within:border-[#e6b784]/60 transition-all shadow-sm"
        >
          <Search className="h-4 w-4 ml-3 text-[#6a7180] shrink-0" />
          <input
            type="text"
            value={heroInput}
            onChange={(e) => setHeroInput(e.target.value)}
            placeholder="Paste a problem, formula, or question…"
            className="flex-1 bg-transparent px-3 py-2 text-sm text-[#f4f4f6] placeholder:text-[#6a7180] focus:outline-none"
          />
          <Button
            type="submit"
            className="h-10 rounded-xl bg-gradient-to-r from-[#e6b784] to-[#f2ca9e] px-5 text-xs font-semibold text-[#141619] hover:bg-[#f2ca9e] transition-all shrink-0"
          >
            Open Studio
            <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
          </Button>
        </form>

        {/* 3 Real Starter Chips beneath the input */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-[11px] text-[#6a7180] font-mono mr-1">Try:</span>
          <button
            type="button"
            onClick={() => handleLaunchStudio("Evaluate the indefinite integral ∫ x · e^(2x) dx using integration by parts.")}
            className="rounded-lg border border-white/[0.06] bg-[#14171d] px-2.5 py-1 text-xs text-[#a0a6b2] hover:border-[#e6b784]/40 hover:text-[#f4f4f6] transition-all font-mono"
          >
            ∫ x · e^(2x) dx
          </button>
          <button
            type="button"
            onClick={() => handleLaunchStudio("Derive the step response of an RLC underdamped circuit.")}
            className="rounded-lg border border-white/[0.06] bg-[#14171d] px-2.5 py-1 text-xs text-[#a0a6b2] hover:border-[#e6b784]/40 hover:text-[#f4f4f6] transition-all"
          >
            RLC Underdamped Response
          </button>
          <button
            type="button"
            onClick={() => handleLaunchStudio("Derive pressure from the Kinetic Theory of Gases.")}
            className="rounded-lg border border-white/[0.06] bg-[#14171d] px-2.5 py-1 text-xs text-[#a0a6b2] hover:border-[#e6b784]/40 hover:text-[#f4f4f6] transition-all"
          >
            Kinetic Theory Derivation
          </button>
        </div>
      </section>

      {/* Looping Product Tour Section — Single Matte Frame Peeking Above Fold */}
      <section className="mx-auto w-full max-w-5xl px-4 pb-14 sm:px-6 sm:pb-20">
        <RemotionHeroPlayer />
        <p className="mt-4 text-center text-xs text-[#707684]">
          Engineered for true comprehension, not AI speed-reading.
        </p>
      </section>

      {/* Clean Hairline Footer */}
      <footer className="mt-auto border-t border-white/[0.06] bg-[#090b0e] px-6 py-8 text-xs text-[#707684]">
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
              className="hover:text-[#f1eee7] transition-colors"
            >
              Studio
            </button>
            <Link href="/gallery" className="hover:text-[#f1eee7] transition-colors">
              Gallery
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
