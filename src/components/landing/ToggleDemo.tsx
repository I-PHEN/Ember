"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";

interface Step {
  math: string;
  caption: string;
}

const EMBER_STEPS: Step[] = [
  {
    math: "∫ x · e^(2x) dx",
    caption: "Pick u and dv.",
  },
  {
    math: "u = x, dv = e^(2x) dx",
    caption: "Choose u so it gets simpler when differentiated.",
  },
  {
    math: "du = dx, v = (1/2) e^(2x)",
    caption: "Differentiate u, integrate dv.",
  },
  {
    math: "x · (1/2) e^(2x) − ∫ (1/2) e^(2x) dx",
    caption: "Apply the parts formula.",
  },
  {
    math: "(1/2) x e^(2x) − (1/4) e^(2x) + C",
    caption: "Finish the last integral.",
  },
];

const TYPICAL_LINES = [
  "To evaluate ∫ x · e^(2x) dx using integration by parts:",
  "Use formula: ∫ u dv = uv − ∫ v du",
  "Let u = x  ⟹  du = dx",
  "Let dv = e^(2x) dx  ⟹  v = (1/2) e^(2x)",
  "Substitute into the formula:",
  "∫ x · e^(2x) dx = x · (1/2) e^(2x) − ∫ (1/2) e^(2x) dx",
  "= (1/2) x e^(2x) − (1/2) ∫ e^(2x) dx",
  "= (1/2) x e^(2x) − (1/2) · (1/2) e^(2x) + C",
  "= (1/2) x e^(2x) − (1/4) e^(2x) + C",
];

export default function ToggleDemo() {
  const [activeTab, setActiveTab] = useState<"typical" | "ember">("ember");
  const [currentStep, setCurrentStep] = useState(0);

  const handleTabChange = (tab: "typical" | "ember") => {
    setActiveTab(tab);
    setCurrentStep(0);
  };

  const handleKeyDownTab = (e: React.KeyboardEvent, targetTab: "typical" | "ember") => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      handleTabChange(targetTab);
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
      e.preventDefault();
      const nextTab = activeTab === "ember" ? "typical" : "ember";
      handleTabChange(nextTab);
    }
  };

  return (
    <section className="mx-auto w-full max-w-[720px] px-4 py-16 sm:px-6">
      {/* Label above */}
      <div className="mb-4 text-center">
        <span className="text-xs font-medium tracking-wide text-[#9aa1af] uppercase">
          Same problem, two ways.
        </span>
      </div>

      {/* Two-option Toggle */}
      <div className="mb-6 flex justify-center">
        <div
          role="tablist"
          aria-label="Comparison modes"
          className="inline-flex rounded-lg border border-white/[0.08] bg-[#0d1017] p-1"
        >
          <button
            type="button"
            role="tab"
            id="tab-typical"
            aria-selected={activeTab === "typical"}
            aria-controls="panel-typical"
            tabIndex={activeTab === "typical" ? 0 : -1}
            onClick={() => handleTabChange("typical")}
            onKeyDown={(e) => handleKeyDownTab(e, "typical")}
            className={`min-h-[44px] sm:min-h-0 rounded-md px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e6b784] ${
              activeTab === "typical"
                ? "bg-[#181c25] text-[#e6b784] border border-[#e6b784]/30"
                : "text-[#9aa1af] hover:text-[#f4f4f6]"
            }`}
          >
            Typical AI chat
          </button>
          <button
            type="button"
            role="tab"
            id="tab-ember"
            aria-selected={activeTab === "ember"}
            aria-controls="panel-ember"
            tabIndex={activeTab === "ember" ? 0 : -1}
            onClick={() => handleTabChange("ember")}
            onKeyDown={(e) => handleKeyDownTab(e, "ember")}
            className={`min-h-[44px] sm:min-h-0 rounded-md px-4 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e6b784] ${
              activeTab === "ember"
                ? "bg-[#181c25] text-[#e6b784] border border-[#e6b784]/30"
                : "text-[#9aa1af] hover:text-[#f4f4f6]"
            }`}
          >
            Ember
          </button>
        </div>
      </div>

      {/* Fixed-Height Container to prevent layout jumps */}
      <div className="h-[350px] w-full rounded-xl border border-white/[0.08] bg-[#0d1017] overflow-hidden">
        {/* Typical AI chat view */}
        {activeTab === "typical" && (
          <div
            role="tabpanel"
            id="panel-typical"
            aria-labelledby="tab-typical"
            className="flex h-full flex-col justify-between p-5 sm:p-6"
          >
            <div className="space-y-1.5 font-mono text-xs sm:text-[13px] leading-relaxed text-[#9aa1af] overflow-y-auto pr-1">
              {TYPICAL_LINES.map((line, idx) => (
                <div key={idx} className="whitespace-pre-wrap">
                  {line}
                </div>
              ))}
            </div>

            <div className="border-t border-white/[0.06] pt-3">
              <p className="text-[15px] text-[#9aa1af]">
                Everything at once. Hard to follow.
              </p>
            </div>
          </div>
        )}

        {/* Ember view */}
        {activeTab === "ember" && (
          <div
            role="tabpanel"
            id="panel-ember"
            aria-labelledby="tab-ember"
            className="flex h-full flex-col justify-between p-5 sm:p-6"
          >
            {/* Flat dark blackboard panel */}
            <div className="flex flex-1 flex-col items-center justify-center rounded-lg border border-white/[0.06] bg-[#090b0e] p-5 text-center">
              <div
                key={currentStep}
                className="font-mono text-[18px] sm:text-[20px] font-medium tracking-tight text-[#f4f4f6] transition-opacity duration-150 motion-reduce:transition-none"
              >
                {EMBER_STEPS[currentStep].math}
              </div>

              <p
                key={`caption-${currentStep}`}
                aria-live="polite"
                className="mt-3 text-[15px] text-[#9aa1af] transition-opacity duration-150 motion-reduce:transition-none"
              >
                {EMBER_STEPS[currentStep].caption}
              </p>
            </div>

            {/* Stepper Controls */}
            <div className="mt-4 flex items-center justify-between border-t border-white/[0.06] pt-3">
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => Math.max(0, prev - 1))}
                disabled={currentStep === 0}
                className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#12151d] px-3.5 py-1.5 text-xs font-medium text-[#d1d5db] transition-colors hover:border-white/[0.16] hover:bg-[#181c26] disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e6b784]"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                <span>Back</span>
              </button>

              <span className="text-xs font-sans text-[#9aa1af]">
                Step{" "}
                <span className="font-semibold text-[#e6b784]">
                  {currentStep + 1}
                </span>{" "}
                of {EMBER_STEPS.length}
              </span>

              <button
                type="button"
                onClick={() =>
                  setCurrentStep((prev) =>
                    Math.min(EMBER_STEPS.length - 1, prev + 1)
                  )
                }
                disabled={currentStep === EMBER_STEPS.length - 1}
                className="inline-flex min-h-[44px] sm:min-h-0 items-center gap-1.5 rounded-lg border border-white/[0.08] bg-[#12151d] px-3.5 py-1.5 text-xs font-medium text-[#d1d5db] transition-colors hover:border-white/[0.16] hover:bg-[#181c26] disabled:opacity-30 disabled:pointer-events-none focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#e6b784]"
              >
                <span>Next</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Link below */}
      <div className="mt-4 text-center">
        <Link
          href="/how-it-works"
          className="text-xs text-[#9aa1af] hover:text-[#e6b784] transition-colors underline-offset-4 hover:underline"
        >
          See how it works
        </Link>
      </div>
    </section>
  );
}
