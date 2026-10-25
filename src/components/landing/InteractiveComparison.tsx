"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import katex from "katex";
import { ArrowLeft, ArrowRight, HelpCircle, MessageSquare, Sparkles, MoveDown, CheckCircle2 } from "lucide-react";

function MathView({ math, display = false, className = "" }: { math: string; display?: boolean; className?: string }) {
  const html = useMemo(() => {
    try {
      return katex.renderToString(math, {
        displayMode: display,
        throwOnError: false,
      });
    } catch {
      return math;
    }
  }, [math, display]);

  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

interface StepData {
  title: string;
  badge: string;
  stepNum: string;
  previousLatex?: string;
  chalkLatex: string;
  subLatex?: string;
  subText?: string;
  explanation: string;
  teacherVoice: string;
}

const STEPS: StepData[] = [
  {
    title: "Problem Statement",
    badge: "Step 1 of 5",
    stepNum: "01",
    chalkLatex: "\\int x e^{2x} \\, dx",
    subText: "Integrand: polynomial x × exponential e^(2x)",
    explanation: "Identify the integrand as a product of two distinct families of functions: polynomial (x) and exponential (e^(2x)).",
    teacherVoice: "We have an integral that cannot be solved with basic substitution because of the product x · e^(2x). Integration by parts is our tool.",
  },
  {
    title: "Choose u and dv",
    badge: "Step 2 of 5",
    stepNum: "02",
    previousLatex: "\\int x e^{2x} \\, dx",
    chalkLatex: "u = x \\qquad dv = e^{2x} \\, dx",
    subLatex: "\\text{LIATE: Algebra } (x) \\text{ before Exponential } (e^{2x})",
    explanation: "Using LIATE priority: Algebra (x) takes precedence for u over Exponential (e^(2x)) for dv.",
    teacherVoice: "We pick u = x because its derivative is simply 1, removing the polynomial factor entirely. dv takes the remaining e^(2x) dx.",
  },
  {
    title: "Differentiate & Integrate",
    badge: "Step 3 of 5",
    stepNum: "03",
    previousLatex: "u = x \\qquad dv = e^{2x} \\, dx",
    chalkLatex: "du = dx \\qquad v = \\frac{1}{2} e^{2x}",
    subLatex: "\\frac{d}{dx}[x] = 1 \\qquad \\int e^{2x} \\, dx = \\frac{1}{2} e^{2x}",
    explanation: "Compute the derivative of u and the antiderivative of dv to prepare all four terms for substitution.",
    teacherVoice: "Now we compute our pieces: du is dx. Integrating e^(2x) introduces a factor of one half, giving v = 1/2 e^(2x).",
  },
  {
    title: "Apply Parts Formula",
    badge: "Step 4 of 5",
    stepNum: "04",
    previousLatex: "\\int u \\, dv = u \\cdot v - \\int v \\, du",
    chalkLatex: "x \\left(\\frac{1}{2} e^{2x}\\right) - \\int \\frac{1}{2} e^{2x} \\, dx",
    subLatex: "\\text{Formula: } \\int u \\, dv = u \\cdot v - \\int v \\, du",
    explanation: "Substitute the four components into the standard integration by parts identity.",
    teacherVoice: "Now plug into u times v minus integral of v du. Notice how the new remaining integral no longer has the variable x inside!",
  },
  {
    title: "Evaluate & Finalize",
    badge: "Step 5 of 5",
    stepNum: "05",
    previousLatex: "x \\left(\\frac{1}{2} e^{2x}\\right) - \\frac{1}{2} \\int e^{2x} \\, dx",
    chalkLatex: "\\frac{1}{2} x e^{2x} - \\frac{1}{4} e^{2x} + C",
    subLatex: "\\frac{d}{dx}\\left[\\frac{1}{2} x e^{2x} - \\frac{1}{4} e^{2x}\\right] = x e^{2x} \\quad \\checkmark",
    explanation: "Integrate the remaining exponential and attach the constant of integration C.",
    teacherVoice: "The integral of 1/2 e^(2x) is 1/4 e^(2x). We subtract it, add the constant C, and our derivation is complete.",
  },
];

export default function InteractiveComparison() {
  const [currentStep, setCurrentStep] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
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
        setScrollProgress(0);
        return;
      }

      // Height of sticky card content
      const cardHeight = sectionRef.current?.offsetHeight || 580;
      // Scrollable distance while pinned
      const totalPinScroll = Math.max(1, rect.height - cardHeight - stickyOffset);
      const scrolled = stickyOffset - rect.top;
      const progress = Math.max(0, Math.min(0.999, scrolled / totalPinScroll));
      setScrollProgress(progress);

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
    // Outer scroll track: 190vh to 210vh provides optimal scroll travel
    <div ref={trackRef} className="relative w-full h-[190vh] sm:h-[210vh]">
      {/* Sticky pinned container: locks 80px from viewport top while visitor scrolls through steps */}
      <section
        ref={sectionRef}
        className="sticky top-20 z-20 mx-auto flex w-full max-w-6xl flex-col justify-start px-4 py-3 sm:px-6"
      >
        {/* Section Header */}
        <div className="mx-auto max-w-2xl text-center mb-3 sm:mb-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-xs text-[#e6b784]">
            <span className="h-1.5 w-1.5 rounded-full bg-[#e6b784]" />
            Same question, two different learning outcomes
          </div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#f4f4f6] sm:text-3xl sm:leading-[1.15]">
            Getting an answer vs.{" "}
            <span className="font-hand font-medium text-[#e6b784]">
              understanding the step.
            </span>
          </h2>
        </div>

        {/* Side-by-Side Comparison Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5 items-stretch">
          {/* LEFT COLUMN: Standard AI Chat (Properly formatted math & text) */}
          <div className="flex flex-col rounded-3xl border border-white/[0.08] bg-[#0c0e12]/95 p-4 sm:p-5 shadow-xl shadow-black/40 backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5 mb-3">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#80868b]" />
                <span className="font-mono text-xs font-semibold text-[#bdc1c6] uppercase tracking-wider">
                  Standard AI Chat
                </span>
              </div>
              <span className="inline-flex items-center rounded-md border border-white/[0.08] bg-white/[0.03] px-2 py-0.5 text-[10px] font-mono text-[#8b919e]">
                Static Text Dump · All at once
              </span>
            </div>

            {/* User Chat Bubble */}
            <div className="mb-3 flex justify-end">
              <div className="max-w-[85%] rounded-2xl rounded-tr-sm bg-[#202124] px-3.5 py-2 text-xs leading-relaxed text-[#f1f3f4] border border-white/[0.04]">
                Evaluate <MathView math="\int x e^{2x} \, dx" /> using integration by parts.
              </div>
            </div>

            {/* Bot Response with Beautiful Math Typesetting */}
            <div className="flex-1 space-y-2.5 font-sans text-xs leading-relaxed text-[#bdc1c6]">
              <p>
                To evaluate the integral <span className="text-[#f1f3f4] font-medium"><MathView math="\int x e^{2x} \, dx" /></span>, we apply the integration by parts formula:
              </p>

              {/* Integration by parts formula card */}
              <div className="rounded-xl border border-white/[0.06] bg-black/40 py-2 px-3 text-center text-[#f1f3f4] text-xs">
                <MathView math="\int u \, dv = u \cdot v - \int v \, du" display />
              </div>

              {/* Step 1: LIATE */}
              <div>
                <p className="font-medium text-[#f1f3f4] mb-1">
                  1. Choose <MathView math="u" /> and <MathView math="dv" /> using LIATE:
                </p>
                <ul className="space-y-1 pl-2 text-[#a8adb7] text-[11px]">
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#6b7280]">•</span>
                    <span>Let <MathView math="u = x \implies du = dx" /></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <span className="text-[#6b7280]">•</span>
                    <span>Let <MathView math="dv = e^{2x} dx \implies v = \frac{1}{2} e^{2x}" /></span>
                  </li>
                </ul>
              </div>

              {/* Step 2: Derivation */}
              <div>
                <p className="font-medium text-[#f1f3f4] mb-1">
                  2. Substitute into formula:
                </p>
                <div className="rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2 text-left space-y-1 text-[#e2e4e8] text-[11px] overflow-x-auto">
                  <div>
                    <MathView math="\int x e^{2x} dx = x \left(\frac{1}{2} e^{2x}\right) - \int \frac{1}{2} e^{2x} dx" display />
                  </div>
                  <div className="pt-0.5">
                    <MathView math="= \frac{1}{2} x e^{2x} - \frac{1}{2} \int e^{2x} dx" display />
                  </div>
                  <div className="pt-0.5">
                    <MathView math="= \frac{1}{2} x e^{2x} - \frac{1}{4} e^{2x} + C" display />
                  </div>
                </div>
              </div>

              {/* Final Answer */}
              <div className="flex items-center gap-2 pt-1 font-medium text-[#f1f3f4]">
                <span>Final Answer:</span>
                <span className="text-[#f4f4f6] font-semibold">
                  <MathView math="\frac{1}{2} x e^{2x} - \frac{1}{4} e^{2x} + C" />
                </span>
              </div>
            </div>

            {/* Drawback Note */}
            <div className="mt-2.5 pt-2 border-t border-white/[0.05] flex items-center justify-between text-[11px] text-[#70757e]">
              <span>❌ Instant 5-step dump</span>
              <span>No pedagogical pacing</span>
            </div>
          </div>

          {/* RIGHT COLUMN: Ember Synchronized Blackboard (Clean Matte Aesthetic, No Neon Glowing) */}
          <div className="flex flex-col rounded-3xl border border-white/[0.12] bg-[#111317] p-4 sm:p-5 shadow-xl shadow-black/50 relative overflow-hidden backdrop-blur-md">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5 mb-2.5">
              <div className="flex items-center gap-2.5">
                <span className="h-2 w-2 rounded-full bg-[#e6b784]" />
                <span className="font-mono text-xs font-semibold text-[#e6b784] uppercase tracking-wider">
                  Ember Classroom
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.12] bg-white/[0.03] px-2.5 py-0.5 font-mono text-[10px] font-medium text-[#e6b784]">
                <Sparkles className="h-3 w-3" />
                Live Blackboard Pacing
              </span>
            </div>

            {/* Interactive Step Milestone Progress Bar */}
            <div className="mb-2.5">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="flex items-center gap-1.5">
                  <span className="rounded bg-[#e6b784]/15 px-1.5 py-0.5 font-mono text-[10px] font-bold text-[#e6b784] border border-[#e6b784]/30">
                    {step.stepNum}
                  </span>
                  <span className="font-mono text-[11px] text-[#f4f4f6] font-semibold">
                    {step.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="hidden sm:flex items-center gap-1 text-[10px] font-mono text-[#8b919e]">
                    <MoveDown className="h-3 w-3 animate-bounce text-[#e6b784]" />
                    <span>Scroll to solve</span>
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

              {/* Segmented Milestone Progress Pills (Matte, no glow shadow) */}
              <div className="grid grid-cols-5 gap-1.5">
                {STEPS.map((s, idx) => (
                  <button
                    key={s.title}
                    type="button"
                    onClick={() => setCurrentStep(idx)}
                    className={`group relative h-2 rounded-full transition-all duration-200 ${
                      idx === currentStep
                        ? "bg-[#e6b784] scale-105"
                        : idx < currentStep
                        ? "bg-[#e6b784]/50 hover:bg-[#e6b784]/70"
                        : "bg-white/[0.08] hover:bg-white/[0.15]"
                    }`}
                    title={`${s.badge}: ${s.title}`}
                  />
                ))}
              </div>
            </div>

            {/* Simulated Blackboard Canvas View (Matte slate aesthetic) */}
            <div className="flex-1 flex flex-col justify-center rounded-2xl border border-white/[0.08] bg-[#090b0e] p-3.5 sm:p-4 text-center relative shadow-inner min-h-[160px]">
              {/* Blackboard Header Indicator */}
              <div className="absolute top-2.5 left-3 flex items-center gap-1.5 text-[10px] font-mono text-[#6c7280]">
                <span className="h-1.5 w-1.5 rounded-full bg-[#e6b784]" />
                BLACKBOARD · STAGE {step.stepNum} OF 05
              </div>

              {/* Dynamic Math Chalkboard Display */}
              <div key={currentStep} className="py-2.5 flex flex-col items-center justify-center min-h-[100px]">
                {step.previousLatex && (
                  <div className="mb-1.5 text-xs text-[#8a919e] tracking-wide line-through decoration-white/20 opacity-60">
                    <MathView math={step.previousLatex} />
                  </div>
                )}

                <div
                  className={`transition-all duration-200 ${
                    currentStep === 4
                      ? "text-[#f8f9fa] inline-block rounded-xl border border-[#e6b784]/60 bg-[#e6b784]/10 px-5 py-2 text-lg sm:text-xl font-medium shadow-sm shadow-[#e6b784]/10"
                      : "text-[#f4f4f6] text-lg sm:text-xl font-medium"
                  }`}
                >
                  <MathView math={step.chalkLatex} display />
                </div>

                {step.subLatex && (
                  <div className="mt-2 text-xs text-[#e6b784]/95 tracking-wide">
                    <MathView math={step.subLatex} />
                  </div>
                )}

                {step.subText && (
                  <div className="mt-1.5 text-[11px] font-mono text-[#a6adb9]">
                    {step.subText}
                  </div>
                )}

                {currentStep === 4 && (
                  <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-[#e6b784]/15 border border-[#e6b784]/30 px-3 py-0.5 text-[11px] font-mono font-medium text-[#e6b784]">
                    <CheckCircle2 className="h-3 w-3" />
                    Verified by differentiation ✓
                  </div>
                )}
              </div>

              {/* Teacher Narration Bubble */}
              <div key={`narr-${currentStep}`} className="mt-auto pt-2.5 border-t border-white/[0.08] text-left">
                <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-wider text-[#e6b784]">
                  <MessageSquare className="h-3 w-3" />
                  Teacher Voiced Narration
                </div>
                <p className="mt-1 text-xs text-[#d8dde6] leading-relaxed">
                  “{step.teacherVoice}”
                </p>
              </div>
            </div>

            {/* Interactive Office Hours Accordion / "Ask Why" Callout */}
            <div className="mt-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2 text-xs">
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
                <p className="mt-2 text-xs leading-relaxed text-[#c6cbd6] border-t border-white/[0.06] pt-2">
                  If you chose <MathView math="u = e^{2x}" className="text-[#e6b784] font-medium" /> and{" "}
                  <MathView math="dv = x \, dx" className="text-[#e6b784] font-medium" />, integrating <MathView math="x" className="text-[#e6b784]" /> would produce{" "}
                  <MathView math="\frac{1}{2} x^2" className="text-[#e6b784] font-medium" />. The resulting integral would become{" "}
                  <MathView math="\int \frac{1}{2} x^2 e^{2x} \, dx" className="text-[#e6b784] font-medium" />—making the problem harder rather than simpler!
                </p>
              )}
            </div>

            {/* Ember Advantage Note */}
            <div className="mt-2.5 pt-2 border-t border-white/[0.08] flex items-center justify-between text-[11px] text-[#e6b784]">
              <span>✓ Synchronized ink + voice pacing</span>
              <span>Pause, scrub & ask questions</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
