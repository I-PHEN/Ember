import React from "react";
import Link from "next/link";
import Wordmark from "@/components/Wordmark";
import { ArrowLeft } from "lucide-react";

export default function HowItWorksPage() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#090b0e] text-[#f1eee7]">
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
          Coming soon.
        </p>
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
