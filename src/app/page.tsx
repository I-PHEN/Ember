"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Paperclip } from "lucide-react";
import { useRouter } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import LaunchFilm from "@/components/landing/LaunchFilm";
import InteractiveComparison from "@/components/landing/InteractiveComparison";
import { useAuth } from "@/lib/firebase/auth-context";

export default function LandingPage() {
  const { user, loading, continueAsGuest, openAuthModal, signOut } = useAuth();
  const router = useRouter();
  const [heroInput, setHeroInput] = useState("");
  const [isPromptFocused, setIsPromptFocused] = useState(false);

  const promptContainerRef = useRef<HTMLFormElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-resize textarea height as content changes
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [heroInput]);

  // Once signed in, immediately navigate to studio
  useEffect(() => {
    if (!loading && user) {
      router.replace("/studio");
    }
  }, [user, loading, router]);

  const handleLaunchStudio = (prompt?: string) => {
    const targetUrl = prompt ? `/studio?prompt=${encodeURIComponent(prompt)}` : "/studio";
    setTimeout(() => {
      if (!user) {
        openAuthModal(() => {
          window.location.href = targetUrl;
        });
        return;
      }
      window.location.href = targetUrl;
    }, 150);
  };

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleLaunchStudio(heroInput.trim() || undefined);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handlePromptSubmit(e);
    }
  };

  // If authenticated or checking session, do not render hero section
  if (loading || user) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#090b0e] text-[#8b8d8f]">
        <div className="flex items-center gap-3 font-mono text-xs">
          <span className="h-2 w-2 rounded-full bg-[#e6b784] animate-pulse" />
          <span>Entering Ember Studio…</span>
        </div>
      </div>
    );
  }

  return (
    <main className="ember-home relative flex min-h-dvh flex-col text-[#f1eee7] selection:bg-[#e6b784]/25">
      {/* Top Navigation Bar: Fixed & Frosted Glass */}
      <header className="fixed top-0 left-0 right-0 z-50 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.08] bg-[#090b0e]/70 px-6 backdrop-blur-2xl sm:px-12">
        <div className="flex items-center gap-4">
          <Wordmark />
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-5 text-xs font-medium">
          <Link
            href="/gallery"
            className="text-[#8b919e] hover:text-[#f1eee7] transition-colors"
          >
            Gallery
          </Link>

          {!user ? (
            <>
              <button
                type="button"
                onClick={() => continueAsGuest()}
                className="rounded-lg border border-[#e6b784]/30 bg-[#e6b784]/10 px-3 py-1 text-xs font-semibold text-[#e6b784] hover:bg-[#e6b784]/20 transition-all"
              >
                Try as Guest
              </button>
              <button
                type="button"
                onClick={() => openAuthModal()}
                className="text-[#8b919e] hover:text-[#f1eee7] transition-colors"
              >
                Sign In
              </button>
            </>
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

      {/* 1. Hero Section: Focused Prompt Well */}
      <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 pt-24 pb-8 text-center sm:px-6 sm:pt-28 sm:pb-12">
        {/* Eyebrow Badge */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.02] px-3.5 py-1 text-xs text-[#e6b784]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#e6b784] shadow-[0_0_8px_#e6b784]" />
          Your question, taught on a blackboard.
        </div>

        {/* Headline */}
        <h1 className="mt-5 max-w-3xl text-4xl font-semibold tracking-tight text-[#f4f4f6] sm:text-6xl sm:leading-[1.1]">
          Understand the steps.{" "}
          <br />
          <span className="font-hand font-medium text-[#e6b784]">
            Not just the answer.
          </span>
        </h1>

        {/* Subline */}
        <p className="mt-4 max-w-xl text-base text-[#9aa1af] sm:text-lg sm:leading-relaxed">
          A lesson that writes, explains, and makes room for your questions. Follow the reasoning—and return to the step you need.
        </p>

        {/* Prompt Composer Bar — Exact Studio Dimensions & Styling */}
        <div className="mt-8 w-full max-w-[720px]">
          <form
            ref={promptContainerRef}
            onSubmit={handlePromptSubmit}
            className={`group relative rounded-2xl border bg-[#12151b]/95 p-3 sm:p-3.5 shadow-2xl shadow-black/50 transition-all ${
              isPromptFocused
                ? "border-[#e6b784]/60 ring-1 ring-[#e6b784]/20"
                : "border-white/[0.08] hover:border-white/[0.14]"
            }`}
          >
            <textarea
              ref={textareaRef}
              rows={2}
              maxLength={600}
              value={heroInput}
              onChange={(e) => setHeroInput(e.target.value)}
              onFocus={() => setIsPromptFocused(true)}
              onBlur={() => setIsPromptFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Paste any math, physics, chemistry, or engineering problem…"
              className="min-h-[64px] sm:min-h-[72px] w-full resize-none border-0 bg-transparent px-2.5 py-1 font-sans text-sm leading-relaxed text-[#f4f4f6] placeholder:text-[#6a7180] focus:outline-none"
            />

            {/* Inner Bottom Controls Strip */}
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-2.5 px-1 mt-1">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleLaunchStudio()}
                  title="Attach an image in the studio"
                  className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#8b919e] transition hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-[#f4f4f6]"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>

                {heroInput.trim() && (
                  <button
                    type="button"
                    onClick={() => setHeroInput("")}
                    className="rounded-xl px-2.5 py-1 text-xs text-[#8b919e] hover:text-[#f4f4f6] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-[#6a7180]">
                  <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1 py-0.5">⌘</span>
                  <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1 py-0.5">↵</span>
                  <span className="ml-0.5">to solve</span>
                </div>

                <span className="font-mono text-[11px] text-[#6a7180]">
                  {heroInput.length}/600
                </span>

                <Button
                  type="submit"
                  disabled={!heroInput.trim() || heroInput.length > 600}
                  className="h-8 rounded-xl bg-gradient-to-r from-[#e6b784] to-[#f2ca9e] px-4 text-xs font-semibold text-[#141619] shadow-md shadow-[#e6b784]/20 hover:shadow-[#e6b784]/35 transition-all active:scale-95 disabled:opacity-30"
                >
                  Start lesson
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </form>
        </div>

        {/* 3 Starter Chips */}
        <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2 text-xs">
          <span className="text-xs text-[#8b919e] mr-1">Try:</span>
          <button
            type="button"
            onClick={() => handleLaunchStudio("Evaluate the indefinite integral ∫ x · e^(2x) dx using integration by parts.")}
            className="rounded-lg border border-white/[0.06] bg-[#11141c] px-2.5 py-1 text-xs text-[#a0a6b2] hover:border-[#e6b784]/40 hover:text-[#f4f4f6] transition-colors font-mono"
          >
            ∫ x · e^(2x) dx
          </button>
          <button
            type="button"
            onClick={() => handleLaunchStudio("Derive the step response of an RLC underdamped circuit.")}
            className="rounded-lg border border-white/[0.06] bg-[#11141c] px-2.5 py-1 text-xs text-[#a0a6b2] hover:border-[#e6b784]/40 hover:text-[#f4f4f6] transition-colors"
          >
            RLC Underdamped Response
          </button>
          <button
            type="button"
            onClick={() => handleLaunchStudio("Derive pressure from the Kinetic Theory of Gases.")}
            className="rounded-lg border border-white/[0.06] bg-[#11141c] px-2.5 py-1 text-xs text-[#a0a6b2] hover:border-[#e6b784]/40 hover:text-[#f4f4f6] transition-colors"
          >
            Kinetic Theory Derivation
          </button>
        </div>

        {/* Guest Demo Invitation in Hero */}
        <div className="mt-5 flex items-center justify-center gap-2 text-xs text-[#8b919e]">
          <span>Evaluating Ember?</span>
          <button
            type="button"
            onClick={() => continueAsGuest()}
            className="inline-flex items-center gap-1 font-medium text-[#e6b784] hover:underline underline-offset-4"
          >
            Try Studio as Guest (No Email Required)
            <ArrowRight className="h-3 w-3" />
          </button>
        </div>
      </section>

      {/* 2. Product Demonstration Film (52s) */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-6 sm:px-6 sm:pb-12">
        <LaunchFilm />
      </section>

      {/* 3. Interactive Side-by-Side Comparison (Chat vs. Ember) */}
      <InteractiveComparison />
    </main>
  );
}
