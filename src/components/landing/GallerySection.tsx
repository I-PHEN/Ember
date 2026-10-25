"use client";

import React, { useRef } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Clock, Sparkles } from "lucide-react";
import DragPhrase from "./ghost-cursor/DragPhrase";

interface LessonPreview {
  title: string;
  course: string;
  duration: string;
  steps: number;
  question: string;
  formula: string;
  prompt: string;
}

const FEATURED_LESSONS: LessonPreview[] = [
  {
    title: "Integration by Parts",
    course: "MATH 102 · CALCULUS",
    duration: "3m 40s",
    steps: 5,
    question: "Evaluate ∫ x · e^(2x) dx using integration by parts.",
    formula: "½ x e^(2x) − ¼ e^(2x) + C",
    prompt: "Evaluate the indefinite integral ∫ x · e^(2x) dx using integration by parts.",
  },
  {
    title: "RLC Underdamped Response",
    course: "EE 201 · CIRCUITS",
    duration: "4m 50s",
    steps: 5,
    question: "Derive step response for series RLC with complex conjugate poles.",
    formula: "v(t) = V₀ [1 − e^(−αt) cos(ω_d t)]",
    prompt: "Derive the step response of an RLC underdamped circuit.",
  },
  {
    title: "Kinetic Theory & Pressure",
    course: "PHYS 140 · THERMO",
    duration: "5m 20s",
    steps: 6,
    question: "Derive macroscopic gas pressure from microscopic momentum transfer.",
    formula: "P = ⅓ (N/V) m ⟨v²⟩",
    prompt: "Derive pressure from the Kinetic Theory of Gases.",
  },
  {
    title: "Quantum Harmonic Oscillator",
    course: "PHYS 310 · QUANTUM",
    duration: "6m 10s",
    steps: 5,
    question: "Construct energy eigenstates using raising and lowering operators.",
    formula: "E_n = ℏω (n + ½)",
    prompt: "Construct energy eigenvalues for the quantum harmonic oscillator using ladder operators.",
  },
];

export default function GallerySection() {
  const sectionRef = useRef<HTMLElement>(null);

  return (
    <section
      ref={sectionRef}
      className="relative z-10 mx-auto w-full max-w-6xl px-4 py-12 sm:px-6 sm:py-16"
      aria-labelledby="gallery-section-heading"
    >
      {/* Section Header with Ghost Cursor Drag Phrase Choreography */}
      <div className="mx-auto max-w-2xl text-center mb-8 sm:mb-10">
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-xs text-[#e6b784]">
          <BookOpen className="h-3.5 w-3.5 text-[#e6b784]" />
          <span>Studio Gallery · Real Lectures</span>
        </div>

        <h2
          id="gallery-section-heading"
          className="mt-3 text-2xl font-semibold tracking-tight text-[#f4f4f6] sm:text-4xl sm:leading-[1.15]"
        >
          Real university lessons,{" "}
          <DragPhrase
            phrase="preserved in ink."
            className="font-hand font-medium text-[#e6b784]"
            sectionRef={sectionRef}
            id="gallery-drag-phrase"
          />
        </h2>

        <p className="mt-2 text-xs text-[#9aa1af] sm:text-sm leading-relaxed max-w-xl mx-auto">
          Explore curated blackboard derivations across mathematics, physics, and electrical engineering. Each lesson planned, hand-written, and taught by Ember.
        </p>
      </div>

      {/* 4 Gallery Lesson Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
        {FEATURED_LESSONS.map((lesson) => (
          <div
            key={lesson.title}
            className="group relative flex flex-col justify-between rounded-2xl border border-white/[0.08] bg-[#0c0e12]/90 p-4 sm:p-5 shadow-lg shadow-black/30 backdrop-blur-sm transition-all duration-200 hover:border-[#e6b784]/40 hover:bg-[#101319]"
          >
            <div>
              <div className="flex items-center justify-between text-[11px] font-mono text-[#8b919e] mb-2.5">
                <span className="rounded bg-white/[0.04] px-2 py-0.5 border border-white/[0.06] text-[#e6b784]/90 font-medium">
                  {lesson.course}
                </span>
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {lesson.duration}
                  </span>
                  <span>{lesson.steps} steps</span>
                </div>
              </div>

              <h3 className="text-base font-semibold text-[#f4f4f6] group-hover:text-[#e6b784] transition-colors">
                {lesson.title}
              </h3>

              <p className="mt-1 text-xs text-[#9aa1af] line-clamp-2">
                {lesson.question}
              </p>

              {/* Board equation snippet */}
              <div className="mt-3 rounded-xl border border-white/[0.05] bg-black/40 px-3 py-2 font-hand text-base text-[#e8eaed]">
                {lesson.formula}
              </div>
            </div>

            {/* Card Footer Link */}
            <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
              <span className="text-[11px] font-mono text-[#717682] flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-[#e6b784]" />
                Full audio derivation
              </span>
              <Link
                href={`/studio?prompt=${encodeURIComponent(lesson.prompt)}`}
                className="inline-flex items-center gap-1 text-xs font-semibold text-[#e6b784] hover:text-[#f4d1a6] transition-colors"
              >
                Open in Studio
                <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>

      {/* Gallery Bottom CTA */}
      <div className="mt-8 sm:mt-10 text-center">
        <Link
          href="/gallery"
          className="inline-flex items-center gap-2 rounded-xl border border-white/[0.12] bg-[#14171d] px-5 py-2.5 text-xs font-semibold text-[#f1eee7] shadow-md hover:border-white/[0.22] hover:bg-[#1b2028] transition-all"
        >
          Explore All Curated Lessons in Gallery
          <ArrowRight className="h-3.5 w-3.5 text-[#e6b784]" />
        </Link>
      </div>
    </section>
  );
}
