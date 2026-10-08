import React from "react";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { ArrowLeft } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#0b0d10] text-[#f1eee7]">
      <header className="sticky top-0 z-40 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#090b0e]/80 px-6 backdrop-blur-xl sm:px-12">
        <Link href="/">
          <Wordmark />
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-[#8b919e] hover:text-[#f1eee7] transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to home</span>
        </Link>
      </header>

      <section className="mx-auto flex w-full max-w-xl flex-1 flex-col items-center justify-center px-4 py-24 text-center">
        <h1 className="text-3xl font-semibold tracking-tight text-[#f4f4f6] sm:text-4xl">
          How Ember Works
        </h1>
        <p className="mt-4 text-base text-[#9aa1af]">
          From your question to a board you can follow.
        </p>
        <div className="mt-10 space-y-8 text-left text-sm leading-7 text-[#9aa1af]">
          <article><h2 className="text-lg text-[#f4f4f6]">Solve and review</h2><p>Ember separates the mathematical solution from its review. The lesson needs a sound answer before it can teach the reasoning.</p></article>
          <article><h2 className="text-lg text-[#f4f4f6]">Plan the explanation</h2><p>A lesson plan breaks the reasoning into chapters. Board-writing instructions describe what to write, keep visible, and refer back to.</p></article>
          <article><h2 className="text-lg text-[#f4f4f6]">Bring board and voice together</h2><p>The player schedules the writing around recorded speech timing. It preserves natural writing speed and uses pauses where the explanation needs room.</p></article>
          <article><h2 className="text-lg text-[#f4f4f6]">Learn at your pace</h2><p>Pause, seek, change playback speed, or return to a chapter. In the studio, you can ask follow-up questions about the lesson.</p></article>
          <p className="border-t border-white/10 pt-6 text-xs">AI-generated lessons can still contain mistakes. Check important results against your course materials. Introductory university STEM is our current focus; school-age experiences are planned.</p>
        </div>
      </section>

      <footer className="border-t border-white/[0.06] bg-[#07080a] px-6 py-8 text-xs text-[#707684]">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Wordmark />
            <span className="text-white/20">·</span>
            <span>Every problem, a lesson.</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
