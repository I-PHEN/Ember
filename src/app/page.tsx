"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import Wordmark from "@/components/Wordmark";
import { Button } from "@/components/ui/button";
import RemotionHeroPlayer from "@/components/remotion/RemotionHeroPlayer";
import ToggleDemo from "@/components/landing/ToggleDemo";
import { useAuth } from "@/lib/firebase/auth-context";

export default function LandingPage() {
  const { user, loading, openAuthModal, signOut } = useAuth();
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
    <main
      className="ember-home relative flex min-h-dvh flex-col text-[#f1eee7] overflow-x-hidden selection:bg-[#e6b784]/25"
      style={{
        background: "radial-gradient(120% 80% at 50% 0%, #12151c 0%, #080a0e 100%)",
      }}
    >
      {/* Top Navigation Bar with Hairline Border */}
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#090b0e]/80 px-6 backdrop-blur-xl sm:px-12">
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

      {/* 1. Hero Section: Focused Prompt Well */}
      <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center px-4 pt-16 pb-8 text-center sm:px-6 sm:pt-20 sm:pb-12">
        {/* Simplified Eyebrow Badge */}
        <div className="inline-flex items-center rounded-full border border-white/[0.08] bg-white/[0.02] px-3.5 py-1 text-xs text-[#9aa1af]">
          AI blackboard tutor
        </div>

        {/* Headline */}
        <h1 className="mt-5 max-w-2xl text-4xl font-semibold tracking-tight text-[#f4f4f6] sm:text-6xl sm:leading-[1.1]">
          Every problem,{" "}
          <span className="font-hand font-medium text-[#e6b784]">
            a lesson.
          </span>
        </h1>

        {/* Simplified Subline */}
        <p className="mt-4 max-w-xl text-base text-[#9aa1af] sm:text-lg sm:leading-relaxed">
          Paste any STEM problem. Ember plans the lesson, writes it on the board by hand, and explains it aloud.
        </p>

        {/* Prompt Composer Bar */}
        <form
          ref={promptContainerRef}
          onSubmit={handlePromptSubmit}
          className={`relative mx-auto mt-8 flex w-full max-w-2xl flex-col rounded-2xl border bg-[#11141b]/95 p-2 transition-all duration-200 ${
            isPromptFocused
              ? "border-[#e6b784]/60 ring-1 ring-[#e6b784]/30"
              : "border-white/[0.08] hover:border-white/[0.14]"
          }`}
        >
          <div className="flex items-start gap-2 px-2 pt-1">
            <textarea
              ref={textareaRef}
              rows={1}
              value={heroInput}
              onChange={(e) => setHeroInput(e.target.value)}
              onFocus={() => setIsPromptFocused(true)}
              onBlur={() => setIsPromptFocused(false)}
              onKeyDown={handleKeyDown}
              placeholder="Paste a problem, formula, or question… (e.g. ∫ x · e^(2x) dx)"
              className="flex-1 resize-none bg-transparent py-1.5 text-sm leading-relaxed text-[#f4f4f6] placeholder:text-[#6a7180] focus:outline-none"
              style={{ minHeight: "36px", maxHeight: "180px" }}
            />
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-white/[0.05] pt-2 px-1">
            <span className="font-sans text-xs text-[#8b919e]">
              Press <kbd className="rounded bg-white/[0.06] px-1 py-0.5 font-mono text-[11px] text-[#9ea4b1]">Enter</kbd> to start
            </span>

            <Button
              type="submit"
              className="h-9 rounded-xl bg-[#e6b784] px-4 text-xs font-semibold text-[#141619] hover:bg-[#d8a873] transition-all shrink-0 active:scale-98"
            >
              Start lesson
              <ArrowRight className="h-3.5 w-3.5 ml-1.5" />
            </Button>
          </div>
        </form>

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
      </section>

      {/* 2. Product Tour Section */}
      <section className="relative z-10 mx-auto w-full max-w-5xl px-4 pb-8 sm:px-6 sm:pb-12">
        <RemotionHeroPlayer />
      </section>

      {/* 3. Toggle Demo: "Same problem, two ways" */}
      <section className="relative z-10">
        <ToggleDemo />
      </section>

      {/* 4. Hairline Technical Footer */}
      <footer className="relative z-10 mt-auto border-t border-white/[0.06] bg-[#07080a] px-6 py-8 text-xs text-[#707684]">
        <div className="mx-auto max-w-5xl flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="text-white/20">·</span>
            <span>Every problem, a lesson.</span>
          </div>

          <div className="flex items-center gap-6 font-mono text-[11px]">
            <button
              type="button"
              onClick={() => handleLaunchStudio()}
              className="hover:text-[#f1eee7] transition-colors"
            >
              STUDIO
            </button>
            <Link href="/gallery" className="hover:text-[#f1eee7] transition-colors">
              GALLERY
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}
