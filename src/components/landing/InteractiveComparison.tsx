"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, HelpCircle, MessageSquare, Sparkles, MoveDown } from "lucide-react";

interface StepData {
  title: string;
  badge: string;
  chalkMath: string;
  subMath?: string;
  explanation: string;
  teacherVoice: string;
}

const STEPS: StepData[] = [
  {
    title: "Problem Statement",
    badge: "Step 1 of 5",
    chalkMath: "∫ x · e^(2x) dx",
    explanation: "Identify the integrand as a product of two distinct families of functions: polynomial (x) and exponential (e^(2x)).",
    teacherVoice: "We have an integral that cannot be solved with basic substitution because of the product x · e^(2x). Integration by parts is our tool.",
  },
  {
    title: "Choose u and dv",
    badge: "Step 2 of 5",
    chalkMath: "u = x,   dv = e^(2x) dx",
    subMath: "Rule: Choose u so that differentiating it simplifies the polynomial.",
    explanation: "Using LIATE priority: Algebra (x) takes precedence for u over Exponential (e^(2x)) for dv.",
    teacherVoice: "We pick u = x because its derivative is simply 1, removing the polynomial factor entirely. dv takes the remaining e^(2x) dx.",
  },
  {
    title: "Differentiate & Integrate",
    badge: "Step 3 of 5",
    chalkMath: "du = dx,   v = ½ e^(2x)",
    subMath: "d/dx(x) = 1  ·  ∫ e^(2x) dx = ½ e^(2x)",
    explanation: "Compute the derivative of u and the antiderivative of dv to prepare all four terms for substitution.",
    teacherVoice: "Now we compute our pieces: du is dx. Integrating e^(2x) introduces a factor of one half, giving v = 1/2 e^(2x).",
  },
  {
    title: "Apply Parts Formula",
    badge: "Step 4 of 5",
    chalkMath: "x · (½ e^(2x)) − ∫ ½ e^(2x) dx",
    subMath: "Formula: ∫ u dv = u·v − ∫ v du",
    explanation: "Substitute the four components into the standard integration by parts identity.",
    teacherVoice: "Now plug into u times v minus integral of v du. Notice how the new remaining integral no longer has the variable x inside!",
  },
  {
    title: "Evaluate & Finalize",
    badge: "Step 5 of 5",
    chalkMath: "½ x e^(2x) − ¼ e^(2x) + C",
    subMath: "Checked by differentiation: d/dx [½ x e^(2x) − ¼ e^(2x)] = x e^(2x) ✓",
    explanation: "Integrate the remaining exponential and attach the constant of integration C.",
    teacherVoice: "The integral of 1/2 e^(2x) is 1/4 e^(2x). We subtract it, add the constant C, and our derivation is complete.",
  },
];

export default function InteractiveComparison() {
  const [currentStep, setCurrentStep] = useState(0);
  const [showOfficeHours, setShowOfficeHours] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const sectionRef = useRef<HTMLElement>(null);

  // Scroll-driven step progression (sticky pinned section)
  useEffect(() => {
    const handleScroll = () => {
      const el = trackRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const stickyOffset = 80; // top-20 (80px) accounts for fixed 64px header + 16px buffer

      // If comparison has not reached sticky pin threshold, remain on step 0
      if (rect.top > stickyOffset) {
        setCurrentStep(0);
        return;
      }

      // Height of sticky card content
      const cardHeight = sectionRef.current?.offsetHeight || 580;
      // Scrollable distance while pinned
      const totalPinScroll = Math.max(1, rect.height - cardHeight - stickyOffset);
      const scrolled = stickyOffset - rect.top;
      const progress = Math.max(0, Math.min(0.999, scrolled / totalPinScroll));

      // Map progress smoothly into the 5 derivation steps
      const stepIndex = Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length));
      setCurrentStep(stepIndex);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const step = STEPS[currentStep];

  return (
    // Outer scroll track: 190vh to 210vh provides optimal scroll distance without empty black gaps
    <div ref={trackRef} className="relative w-full h-[190vh] sm:h-[210vh]">
      {/* Sticky pinned container: locks 80px from viewport top while visitor scrolls through steps */}
      <section
        ref={sectionRef}
        className="sticky top-20 z-20 mx-auto flex w-full max-w-6xl flex-col justify-start px-4 py-4 sm:px-6"
      >
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-4 sm:mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-xs text-[#e6b784]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e6b784] shadow-[0_0_8px_#e6b784]" />
            Same question, two different learning outcomes
          </div>
          <h2 className="mt-2.5 text-2xl font-semibold tracking-tight text-[#f4f4f6] sm:text-3xl sm:leading-[1.15]">
            Getting an answer vs.{" "}
            <span className="font-hand font-medium text-[#e6b784]">
              understanding the step.
            </span>
          </h2>
          <p className="mt-1.5 text-xs text-[#9aa1af] sm:text-sm leading-relaxed max-w-xl mx-auto">
            Scroll down to watch Ember unroll the derivation step by step on the blackboard, while standard chat dumps a static wall of text.
          </p>
        </div>

        {/* Side-by-Side Comparison Grid (Modeled directly after reference image) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
          {/* LEFT COLUMN: Standard AI Chat (Dumps text immediately, static) */}
          <div className="flex flex-col rounded-3xl border border-white/[0.08] bg-[#0c0e12]/95 p-4 sm:p-6 shadow-xl shadow-black/40 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#80868b]" />
                <span className="font-mono text-xs font-semibold text-[#bdc1c6] uppercase tracking-wider">
                  Standard AI Chat
                </span>
              </div>
              <span className="text-[11px] font-mono text-[#60646c]">Static Text Dump</span>
            </div>

            {/* User Chat Bubble */}
            <div className="mb-3.5 flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#202124] px-3.5 py-2 text-xs leading-relaxed text-[#f1f3f4] border border-white/[0.04]">
                Evaluate ∫ x · e^(2x) dx using integration by parts.
              </div>
            </div>

            {/* Bot Wall-of-Text Response */}
            <div className="flex-1 space-y-2.5 font-sans text-xs leading-relaxed text-[#bdc1c6]">
              <p>
                To evaluate the integral <code className="font-mono text-[#e8eaed] bg-white/[0.05] px-1 py-0.5 rounded">∫ x · e^(2x) dx</code>, we apply the integration by parts formula:
              </p>
              <div className="rounded-xl border border-white/[0.05] bg-black/30 p-2 font-mono text-xs text-[#e8eaed] text-center">
                ∫ u dv = u·v − ∫ v du
              </div>

              <p className="font-medium text-[#f1f3f4]">
                1. Choose u and dv using LIATE:
              </p>
              <ul className="list-disc list-inside pl-1 space-y-0.5 text-[#9aa0a6] font-mono text-[11px]">
                <li>Let u = x ⟹ du = dx</li>
                <li>Let dv = e^(2x) dx ⟹ v = (1/2) e^(2x)</li>
              </ul>

              <p className="font-medium text-[#f1f3f4]">
                2. Substitute into formula:
              </p>
              <div className="rounded-xl border border-white/[0.05] bg-black/30 p-2 font-mono text-[11px] leading-relaxed text-[#bdc1c6]">
                ∫ x · e^(2x) dx = x · (1/2) e^(2x) − ∫ (1/2) e^(2x) dx<br />
                = (1/2) x e^(2x) − (1/2) ∫ e^(2x) dx<br />
                = (1/2) x e^(2x) − (1/4) e^(2x) + C
              </div>

              <p>
                <strong>Final Answer:</strong> <span className="font-mono text-[#e8eaed]">½ x e^(2x) − ¼ e^(2x) + C</span>
              </p>
            </div>

            {/* Drawback Note */}
            <div className="mt-3 pt-2.5 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-[#70757e]">
              <span>❌ Passive text dump</span>
              <span>No derivation pacing</span>
            </div>
          </div>

          {/* RIGHT COLUMN: Ember Synchronized Blackboard (Unrolls on Scroll) */}
          <div className="flex flex-col rounded-3xl border border-[#e6b784]/35 bg-gradient-to-b from-[#151922] via-[#10131a] to-[#0c0e13] p-4 sm:p-6 shadow-2xl shadow-black/70 relative overflow-hidden ring-1 ring-[#e6b784]/20 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-3 mb-3.5">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#e6b784] shadow-[0_0_8px_#e6b784]" />
                <span className="font-mono text-xs font-semibold text-[#e6b784] uppercase tracking-wider">
                  Ember Classroom
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e6b784]/30 bg-[#e6b784]/10 px-2.5 py-0.5 font-mono text-[10px] font-medium text-[#e6b784]">
                <Sparkles className="h-3 w-3" />
                Step-by-Step Scroll Reveal
              </span>
            </div>

            {/* Interactive Step Milestone Progress Bar */}
            <div className="mb-3.5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="font-mono text-[11px] text-[#e6b784] font-medium">
                  {step.badge} · {step.title}
                </span>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-[#8b919e]">
                    <MoveDown className="h-3 w-3 animate-bounce text-[#e6b784]" />
                    <span>Scroll to advance</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                      disabled={currentStep === 0}
                      className="rounded-lg p-1 text-[#8b919e] hover:bg-white/[0.06] hover:text-[#f4f4f6] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      aria-label="Previous step"
                    >
                      <ArrowLeft className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentStep((prev) => Math.min(STEPS.length - 1, prev + 1))}
                      disabled={currentStep === STEPS.length - 1}
                      className="rounded-lg p-1 text-[#8b919e] hover:bg-white/[0.06] hover:text-[#f4f4f6] disabled:opacity-30 disabled:pointer-events-none transition-colors"
                      aria-label="Next step"
                    >
                      <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Segmented Milestone Progress Pills */}
              <div className="grid grid-cols-5 gap-1.5">
                {STEPS.map((s, idx) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    className={`group relative h-2 rounded-full transition-all duration-300 ${
                      idx === currentStep
                        ? "bg-[#e6b784] ring-2 ring-[#e6b784]/40"
                        : idx < currentStep
                        ? "bg-[#e6b784]/50"
                        : "bg-white/[0.08] hover:bg-white/[0.15]"
                    }`}
                    title={`${s.badge}: ${s.title}`}
                  />
                ))}
              </div>
            </div>

            {/* Simulated Blackboard Canvas View */}
            <div className="flex-1 flex flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#090b0e] p-4 sm:p-5 text-center relative shadow-inner min-h-[160px]">
              {/* Blackboard Coordinate Grid Indicator */}
              <div className="absolute top-2.5 left-3 flex items-center gap-1.5 text-[10px] font-mono text-[#5a606d]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#e6b784]" />
                BLACKBOARD CANVAS · ACTIVE PHASE
              </div>

              {/* Dynamic Math Chalkboard Display */}
              <div className="py-3">
                <div className="font-hand text-2xl sm:text-3xl tracking-wide text-[#f4f4f6] transition-all duration-300 transform scale-100">
                  {step.chalkMath}
                </div>
                {step.subMath && (
                  <div className="mt-1.5 text-xs font-mono text-[#e6b784]/80">
                    {step.subMath}
                  </div>
                )}
              </div>

              {/* Teacher Narration Bubble */}
              <div className="mt-auto pt-2.5 border-t border-white/[0.06] text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#e6b784]">
                  <MessageSquare className="h-3 w-3" />
                  Teacher Voiced Narration
                </div>
                <p className="mt-1 text-xs text-[#a6adb9] italic leading-relaxed">
                  “{step.teacherVoice}”
                </p>
              </div>
            </div>

            {/* Interactive Office Hours Accordion / "Ask Why" Callout */}
            <div className="mt-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5 text-xs">
              <button
                type="button"
                onClick={() => setShowOfficeHours(!showOfficeHours)}
                className="flex w-full items-center justify-between text-left text-[#d8dadf] hover:text-[#e6b784] transition-colors"
              >
                <span className="flex items-center gap-1.5 font-medium">
                  <HelpCircle className="h-3.5 w-3.5 text-[#e6b784]" />
                  Ask Why: “Why not pick u = e^(2x) instead?”
                </span>
                <span className="text-[11px] font-mono text-[#8b919e]">
                  {showOfficeHours ? "Hide" : "Show answer"}
                </span>
              </button>
              {showOfficeHours && (
                <p className="mt-2 text-[11px] leading-relaxed text-[#9aa1af] border-t border-white/[0.05] pt-2">
                  If you chose <code className="font-mono text-[#e6b784]">u = e^(2x)</code> and <code className="font-mono text-[#e6b784]">dv = x dx</code>, integrating x would produce <code className="font-mono text-[#e6b784]">½x²</code>. The resulting integral would become <code className="font-mono text-[#e6b784]">∫ x² e^(2x) dx</code>—making the problem harder rather than simpler!
                </p>
              )}
            </div>

            {/* Ember Advantage Note */}
            <div className="mt-3 pt-2.5 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#e6b784]">
              <span>✓ Synchronized ink + voice pacing</span>
              <span>Pause, scrub & ask questions</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
