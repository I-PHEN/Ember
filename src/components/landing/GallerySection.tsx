"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useScroll, useSpring } from "framer-motion";
import { ArrowRight, BookOpen } from "lucide-react";

const HIGHLIGHT_WORDS = [
  "Replay",
  "any",
  "lecture,",
  "scrub",
  "to",
  "the",
  "exact",
  "moment",
  "a",
  "concept",
  "clicks,",
  "or",
  "ask",
  "your",
  "own",
  "question",
  "right",
  "on",
  "the",
  "board.",
];

function clamp(val: number, min: number, max: number) {
  return Math.max(min, Math.min(max, val));
}

// cubic-bezier(0.23, 1, 0.32, 1) ease-out curve from animate skill
function easeOutStrong(t: number) {
  const x = clamp(t, 0, 1);
  return 1 - Math.pow(1 - x, 3);
}

// cubic-bezier(0.77, 0, 0.175, 1) ease-in-out curve from animate skill
function easeInOutStrong(t: number) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

interface LineGroup {
  startIndex: number;
  endIndex: number;
  top: number;
  height: number;
  left: number;
  right: number;
}

export default function GallerySection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLElement>(null);
  const phraseSlotRef = useRef<HTMLSpanElement>(null);
  const phraseFloatingRef = useRef<HTMLSpanElement>(null);
  const blockContainerRef = useRef<HTMLDivElement>(null);
  const blockRef = useRef<HTMLParagraphElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const highlightRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorInnerRef = useRef<SVGSVGElement>(null);
  const cursorPathRef = useRef<SVGPathElement>(null);

  // Default to true so cursor always renders immediately
  const [isEnabled, setIsEnabled] = useState(true);

  // Cached layout geometry relative to stage container
  const geometryCache = useRef<{
    slot: { left: number; top: number; width: number; height: number };
    block: { left: number; top: number; width: number; height: number };
    words: { left: number; top: number; width: number; height: number }[];
    lines: LineGroup[];
    cta: { left: number; top: number; width: number; height: number };
  } | null>(null);

  // Gate motion only behind explicit reduced-motion preference
  useEffect(() => {
    const checkCapabilities = () => {
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setIsEnabled(!prefersReducedMotion);
    };

    checkCapabilities();
    window.addEventListener("resize", checkCapabilities);
    return () => window.removeEventListener("resize", checkCapabilities);
  }, []);

  // Framer Motion useScroll hook on the pinned runway
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 80%", "end 95%"],
  });

  // Spring physics from animate skill: mass 0.25, stiffness 120, damping 24 (swift, silky smooth, weighty)
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 24,
    mass: 0.25,
    restDelta: 0.0001,
  });

  // Measure stable layout geometry relative to stageRef
  const updateGeometryCache = useCallback(() => {
    const stage = stageRef.current;
    const slot = phraseSlotRef.current;
    const blockContainer = blockContainerRef.current;
    const cta = ctaRef.current;
    if (!stage || !slot || !blockContainer || !cta) return;

    const stageRect = stage.getBoundingClientRect();
    const slotRect = slot.getBoundingClientRect();
    const blockRect = blockContainer.getBoundingClientRect();
    const ctaRect = cta.getBoundingClientRect();

    const words = wordRefs.current.map((w) => {
      if (!w) return { left: 0, top: 0, width: 0, height: 0 };
      const r = w.getBoundingClientRect();
      return {
        left: r.left - stageRect.left,
        top: r.top - stageRect.top,
        width: r.width,
        height: r.height,
      };
    });

    // Group words into lines for multiline-aware sweeping
    const lines: LineGroup[] = [];
    words.forEach((w, idx) => {
      if (idx === 0) {
        lines.push({
          startIndex: 0,
          endIndex: 0,
          top: w.top,
          height: w.height,
          left: w.left,
          right: w.left + w.width,
        });
        return;
      }
      const curLine = lines[lines.length - 1];
      if (Math.abs(w.top - curLine.top) <= 8) {
        curLine.endIndex = idx;
        curLine.right = Math.max(curLine.right, w.left + w.width);
      } else {
        lines.push({
          startIndex: idx,
          endIndex: idx,
          top: w.top,
          height: w.height,
          left: w.left,
          right: w.left + w.width,
        });
      }
    });

    geometryCache.current = {
      slot: {
        left: slotRect.left - stageRect.left,
        top: slotRect.top - stageRect.top,
        width: slotRect.width,
        height: slotRect.height,
      },
      block: {
        left: blockRect.left - stageRect.left,
        top: blockRect.top - stageRect.top,
        width: blockRect.width,
        height: blockRect.height,
      },
      words,
      lines,
      cta: {
        left: ctaRect.left - stageRect.left,
        top: ctaRect.top - stageRect.top,
        width: ctaRect.width,
        height: ctaRect.height,
      },
    };
  }, []);

  useEffect(() => {
    updateGeometryCache();
    window.addEventListener("resize", updateGeometryCache);
    return () => window.removeEventListener("resize", updateGeometryCache);
  }, [updateGeometryCache]);

  // Main rendering loop directly subscribed to the spring
  useEffect(() => {
    const renderChoreography = (p: number) => {
      const phraseEl = phraseFloatingRef.current;
      const blockEl = blockRef.current;
      const cursorEl = cursorRef.current;
      const cursorInner = cursorInnerRef.current;
      const cursorPath = cursorPathRef.current;

      // Fallback for reduced motion: show settled layout
      if (!isEnabled) {
        if (phraseEl) {
          phraseEl.style.transform = "translate3d(0, 0, 0)";
          phraseEl.style.filter = "none";
          phraseEl.style.opacity = "1";
        }
        if (blockEl) {
          blockEl.style.transform = "translate3d(0, 0, 0)";
          blockEl.style.filter = "none";
          blockEl.style.opacity = "1";
        }
        highlightRefs.current.forEach((hl) => {
          if (hl) hl.style.transform = "scaleX(1)";
        });
        if (cursorEl) cursorEl.style.opacity = "0";
        return;
      }

      if (!geometryCache.current) {
        updateGeometryCache();
      }
      const geo = geometryCache.current;
      if (!geo || !cursorEl || !cursorInner || !cursorPath) return;

      // -----------------------------------------------------------
      // BEAT 1: DRAG_PHRASE (Heading) — Drag window: 0.12 -> 0.34
      // -----------------------------------------------------------
      const P_INIT_X = 42;
      const P_INIT_Y = -18;
      const P_INIT_ROT = -2;
      const P_INIT_BLUR = 2.5;
      const P_INIT_OPACITY = 0.45;

      const b1T = clamp((p - 0.12) / 0.22, 0, 1);
      const b1Ease = easeOutStrong(b1T);

      const pX = P_INIT_X * (1 - b1Ease);
      const pY = P_INIT_Y * (1 - b1Ease);
      const pRot = P_INIT_ROT * (1 - b1Ease);
      const pBlur = P_INIT_BLUR * (1 - b1Ease);
      const pOpacity = P_INIT_OPACITY + (1 - P_INIT_OPACITY) * b1Ease;

      if (phraseEl) {
        phraseEl.style.transform = `translate3d(${pX.toFixed(2)}px, ${pY.toFixed(2)}px, 0) rotate(${pRot.toFixed(2)}deg)`;
        phraseEl.style.filter = pBlur > 0.08 ? `blur(${pBlur.toFixed(2)}px)` : "none";
        phraseEl.style.opacity = pOpacity.toFixed(3);
      }

      // -----------------------------------------------------------
      // BEAT 2: DRAG_BLOCK (Paragraph) — Drag window: 0.52 -> 0.70
      // -----------------------------------------------------------
      const B_INIT_X = 44;
      const B_INIT_Y = 14;
      const B_INIT_ROT = 1.8;
      const B_INIT_BLUR = 2.2;
      const B_INIT_OPACITY = 0.45;

      const b2T = clamp((p - 0.52) / 0.18, 0, 1);
      const b2Ease = easeOutStrong(b2T);

      const bX = B_INIT_X * (1 - b2Ease);
      const bY = B_INIT_Y * (1 - b2Ease);
      const bRot = B_INIT_ROT * (1 - b2Ease);
      const bBlur = B_INIT_BLUR * (1 - b2Ease);
      const bOpacity = B_INIT_OPACITY + (1 - B_INIT_OPACITY) * b2Ease;

      if (blockEl) {
        blockEl.style.transformOrigin = "72% 56%";
        blockEl.style.transform = `translate3d(${bX.toFixed(2)}px, ${bY.toFixed(2)}px, 0) rotate(${bRot.toFixed(2)}deg)`;
        blockEl.style.filter = bBlur > 0.08 ? `blur(${bBlur.toFixed(2)}px)` : "none";
        blockEl.style.opacity = bOpacity.toFixed(3);
      }

      // -----------------------------------------------------------
      // BEAT 3: SELECT_TEXT Multiline Highlighting (0.82 -> 0.94)
      // -----------------------------------------------------------
      const b3T = clamp((p - 0.82) / 0.12, 0, 1);
      const lines = geo.lines;
      const lineCount = lines.length;

      // Coordinate anchors inside stage container
      const phraseHandleDisplacedX = geo.slot.left + geo.slot.width * 0.72 + P_INIT_X;
      const phraseHandleDisplacedY = geo.slot.top + geo.slot.height * 0.48 + P_INIT_Y;
      const phraseHandleCurrentX = geo.slot.left + geo.slot.width * 0.72 + pX;
      const phraseHandleCurrentY = geo.slot.top + geo.slot.height * 0.48 + pY;
      const phraseHandleSettledX = geo.slot.left + geo.slot.width * 0.72;
      const phraseHandleSettledY = geo.slot.top + geo.slot.height * 0.48;

      const blockHandleDisplacedX = geo.block.left + geo.block.width * 0.72 + B_INIT_X;
      const blockHandleDisplacedY = geo.block.top + geo.block.height * 0.56 + B_INIT_Y;
      const blockHandleCurrentX = geo.block.left + geo.block.width * 0.72 + bX;
      const blockHandleCurrentY = geo.block.top + geo.block.height * 0.56 + bY;
      const blockHandleSettledX = geo.block.left + geo.block.width * 0.72;
      const blockHandleSettledY = geo.block.top + geo.block.height * 0.56;

      const sentenceStartX = lines.length > 0 ? lines[0].left - 4 : geo.slot.left;
      const sentenceStartY = lines.length > 0 ? lines[0].top + lines[0].height * 0.52 : geo.slot.top;
      const sentenceEndX =
        lines.length > 0
          ? lines[lines.length - 1].right + 4
          : geo.slot.left + geo.slot.width;
      const sentenceEndY =
        lines.length > 0
          ? lines[lines.length - 1].top + lines[lines.length - 1].height * 0.52
          : geo.slot.top;

      let b3CursorX = sentenceStartX;
      let b3CursorY = sentenceStartY;
      let b3Bank = 1.5;

      // Multiline-aware sweeping
      if (lineCount <= 1) {
        const totalWords = HIGHLIGHT_WORDS.length;
        const exactWordFloat = b3T * totalWords;

        highlightRefs.current.forEach((hl, i) => {
          if (!hl) return;
          const wT = clamp(exactWordFloat - i, 0, 1);
          hl.style.transform = `scaleX(${wT.toFixed(3)})`;
        });

        const activeIdx = clamp(Math.floor(exactWordFloat), 0, totalWords - 1);
        const activeWord = geo.words[activeIdx] || geo.words[0];
        const wFrac = clamp(exactWordFloat - activeIdx, 0, 1);

        b3CursorX = activeWord.left + activeWord.width * wFrac;
        b3CursorY = activeWord.top + activeWord.height * 0.52;
      } else {
        const crWeight = 0.16; // carriage return fraction
        const lineWeight = 1.0;
        const totalWeight = lineCount * lineWeight + (lineCount - 1) * crWeight;

        let accumProgress = 0;
        let activeLineFound = false;

        for (let l = 0; l < lineCount; l++) {
          const curLine = lines[l];
          const lineFraction = lineWeight / totalWeight;
          const lineStartT = accumProgress;
          const lineEndT = accumProgress + lineFraction;
          accumProgress = lineEndT;

          const lineWordCount = curLine.endIndex - curLine.startIndex + 1;

          if (b3T < lineStartT) {
            for (let w = curLine.startIndex; w <= curLine.endIndex; w++) {
              const hl = highlightRefs.current[w];
              if (hl) hl.style.transform = "scaleX(0)";
            }
          } else if (b3T >= lineEndT) {
            for (let w = curLine.startIndex; w <= curLine.endIndex; w++) {
              const hl = highlightRefs.current[w];
              if (hl) hl.style.transform = "scaleX(1)";
            }
          } else {
            activeLineFound = true;
            const lineLocalT = (b3T - lineStartT) / (lineEndT - lineStartT);
            const floatWord = lineLocalT * lineWordCount;

            for (let w = curLine.startIndex; w <= curLine.endIndex; w++) {
              const hl = highlightRefs.current[w];
              if (hl) {
                const localWordIdx = w - curLine.startIndex;
                const wT = clamp(floatWord - localWordIdx, 0, 1);
                hl.style.transform = `scaleX(${wT.toFixed(3)})`;
              }
            }

            const activeLocalIdx = clamp(Math.floor(floatWord), 0, lineWordCount - 1);
            const activeGlobalIdx = curLine.startIndex + activeLocalIdx;
            const activeWord = geo.words[activeGlobalIdx] || geo.words[0];
            const wFrac = clamp(floatWord - activeLocalIdx, 0, 1);

            b3CursorX = activeWord.left + activeWord.width * wFrac;
            b3CursorY = curLine.top + curLine.height * 0.52;
            b3Bank = 1.8;
          }

          if (l < lineCount - 1) {
            const crFraction = crWeight / totalWeight;
            const crStartT = accumProgress;
            const crEndT = accumProgress + crFraction;
            accumProgress = crEndT;

            if (!activeLineFound && b3T >= crStartT && b3T < crEndT) {
              activeLineFound = true;
              const nextLine = lines[l + 1];
              const crLocalT = (b3T - crStartT) / (crEndT - crStartT);
              const crEase = easeInOutStrong(crLocalT);

              const fromX = curLine.right;
              const fromY = curLine.top + curLine.height * 0.52;
              const toX = nextLine.left;
              const toY = nextLine.top + nextLine.height * 0.52;

              b3CursorX = fromX + (toX - fromX) * crEase;
              b3CursorY = fromY + (toY - fromY) * crEase;
              b3Bank = -6 * Math.sin(crLocalT * Math.PI);
            }
          }
        }

        if (b3T >= 1) {
          const lastLine = lines[lines.length - 1];
          b3CursorX = lastLine.right + 2;
          b3CursorY = lastLine.top + lastLine.height * 0.52;
        }
      }

      // -----------------------------------------------------------
      // GHOST CURSOR TRAJECTORY — ALWAYS VISIBLE, MATHEMATICALLY CONTINUOUS
      // -----------------------------------------------------------
      let cx = phraseHandleDisplacedX;
      let cy = phraseHandleDisplacedY;
      let scale = 1.0;
      let bank = 0;
      let opacity = 1.0;
      let isGrabbing = false;

      if (p < 0.08) {
        // Pre-drag state: Cursor is visibly touching the displaced phrase handle
        cx = phraseHandleDisplacedX;
        cy = phraseHandleDisplacedY;
        scale = 1.0;
        bank = 0;
        opacity = 1.0;
      } else if (p >= 0.08 && p < 0.12) {
        // Grab Hold Beat 1: Tactile press scale to 0.96 (better-ui rule)
        const t = (p - 0.08) / 0.04;
        cx = phraseHandleDisplacedX;
        cy = phraseHandleDisplacedY;
        scale = 1.0 - 0.04 * t;
        bank = -1 * t;
        isGrabbing = true;
      } else if (p >= 0.12 && p < 0.34) {
        // Beat 1: DRAG_PHRASE into reserved slot
        cx = phraseHandleCurrentX;
        cy = phraseHandleCurrentY;
        scale = 0.96;
        bank = -2 * (1 - b1Ease);
        isGrabbing = true;
      } else if (p >= 0.34 && p < 0.40) {
        // Release & Hold Beat 1 (Generous hold so reader can absorb completed headline)
        const t = (p - 0.34) / 0.06;
        cx = phraseHandleSettledX;
        cy = phraseHandleSettledY;
        scale = 0.96 + 0.04 * t;
        bank = 0;
        isGrabbing = false;
      } else if (p >= 0.40 && p < 0.48) {
        // Glide from settled phrase to displaced block handle
        const t = easeInOutStrong((p - 0.40) / 0.08);
        cx = phraseHandleSettledX + (blockHandleDisplacedX - phraseHandleSettledX) * t;
        cy = phraseHandleSettledY + (blockHandleDisplacedY - phraseHandleSettledY) * t;
        bank = 6 * Math.sin(t * Math.PI); // Organic banking mid-flight
        scale = 1.0;
      } else if (p >= 0.48 && p < 0.52) {
        // Grab Hold Beat 2: Tactile press scale to 0.96
        const t = (p - 0.48) / 0.04;
        cx = blockHandleDisplacedX;
        cy = blockHandleDisplacedY;
        scale = 1.0 - 0.04 * t;
        bank = -1 * t;
        isGrabbing = true;
      } else if (p >= 0.52 && p < 0.70) {
        // Beat 2: DRAG_BLOCK into true layout position
        cx = blockHandleCurrentX;
        cy = blockHandleCurrentY;
        scale = 0.96;
        bank = -1.5 * (1 - b2Ease);
        isGrabbing = true;
      } else if (p >= 0.70 && p < 0.76) {
        // Release & Hold Beat 2 (Generous hold so reader can absorb paragraph)
        const t = (p - 0.70) / 0.06;
        cx = blockHandleSettledX;
        cy = blockHandleSettledY;
        scale = 0.96 + 0.04 * t;
        bank = 0;
        isGrabbing = false;
      } else if (p >= 0.76 && p < 0.82) {
        // Glide from settled block to start of key sentence
        const t = easeInOutStrong((p - 0.76) / 0.06);
        cx = blockHandleSettledX + (sentenceStartX - blockHandleSettledX) * t;
        cy = blockHandleSettledY + (sentenceStartY - blockHandleSettledY) * t;
        bank = -6 * Math.sin(t * Math.PI);
        scale = 1.0;
      } else if (p >= 0.82 && p < 0.94) {
        // Beat 3: SELECT_TEXT sweeping sentence
        cx = b3CursorX;
        cy = b3CursorY;
        scale = 0.96;
        bank = b3Bank;
        isGrabbing = true;
      } else if (p >= 0.94 && p < 0.98) {
        // Release & glide towards Studio Gallery CTA
        const t = easeInOutStrong((p - 0.94) / 0.04);
        const targetX = geo.cta.left + geo.cta.width + 20;
        const targetY = geo.cta.top + geo.cta.height * 0.5;
        cx = sentenceEndX + (targetX - sentenceEndX) * t;
        cy = sentenceEndY + (targetY - sentenceEndY) * t;
        scale = 0.96 + 0.04 * t;
        bank = 4 * Math.sin(t * Math.PI);
        isGrabbing = false;
      } else {
        // Settle near CTA button
        const targetX = geo.cta.left + geo.cta.width + 20;
        const targetY = geo.cta.top + geo.cta.height * 0.5;
        cx = targetX;
        cy = targetY;
        scale = 1.0;
        bank = 0;
        opacity = 0.85;
      }

      // Optical hotspot offset: tip of path is at (3.5, 3.5), so translate by -3.5px
      const tipOffsetX = -3.5;
      const tipOffsetY = -3.5;

      cursorEl.style.opacity = opacity.toFixed(3);
      cursorEl.style.transform = `translate3d(${(cx + tipOffsetX).toFixed(1)}px, ${(cy + tipOffsetY).toFixed(1)}px, 0)`;
      cursorInner.style.transform = `scale(${scale.toFixed(3)}) rotate(${bank.toFixed(1)}deg)`;
      cursorPath.setAttribute(
        "fill",
        isGrabbing ? "rgba(255, 255, 255, 0.25)" : "rgba(255, 255, 255, 0.08)"
      );
    };

    // Synchronous dispatch with Framer Motion spring updates
    const unsubscribe = smoothProgress.on("change", (latest) => {
      renderChoreography(latest);
    });

    // Update on scroll / resize
    const handleUpdate = () => {
      updateGeometryCache();
      renderChoreography(smoothProgress.get());
    };

    window.addEventListener("scroll", handleUpdate, { passive: true });
    window.addEventListener("resize", handleUpdate, { passive: true });

    // Initial render
    updateGeometryCache();
    renderChoreography(smoothProgress.get());

    return () => {
      unsubscribe();
      window.removeEventListener("scroll", handleUpdate);
      window.removeEventListener("resize", handleUpdate);
    };
  }, [isEnabled, smoothProgress, updateGeometryCache]);

  return (
    <div ref={trackRef} className="relative w-full h-[260vh] sm:h-[280vh]">
      <section
        ref={stageRef}
        aria-labelledby="gallery-editorial-heading"
        className="sticky top-20 sm:top-24 z-10 relative mx-auto flex min-h-[calc(100vh-7rem)] w-full max-w-3xl flex-col items-center justify-center px-6 py-10 text-center"
      >
        {/* Crisp White Ghost Cursor Element — Positioned absolute inside stageRef so it NEVER gets lost off-screen */}
        {isEnabled && (
          <div
            ref={cursorRef}
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 z-50"
            style={{
              opacity: 1,
              willChange: "transform, opacity",
            }}
          >
            <svg
              ref={cursorInnerRef}
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
              style={{
                transformOrigin: "3.5px 3.5px", // Hotspot at exact pointer tip
                filter:
                  "drop-shadow(0 2px 8px rgba(0, 0, 0, 0.9)) drop-shadow(0 0 3px rgba(255, 255, 255, 0.5))",
                willChange: "transform",
              }}
            >
              <path
                ref={cursorPathRef}
                d="M3.5 3.5L19.5 10.2L11.8 12.8L8.8 20.5L3.5 3.5Z"
                stroke="#ffffff"
                strokeWidth="1.6"
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="rgba(255, 255, 255, 0.08)"
              />
            </svg>
          </div>
        )}

        {/* Eyebrow */}
        <div className="inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3.5 py-1 text-xs text-[#e6b784]">
          <BookOpen className="h-3.5 w-3.5 text-[#e6b784]" />
          <span>Studio Gallery</span>
        </div>

        {/* BEAT 1: DRAG_PHRASE inside Heading */}
        <h2
          id="gallery-editorial-heading"
          className="mt-5 text-3xl font-semibold tracking-tight text-[#f4f4f6] sm:text-5xl sm:leading-[1.15]"
        >
          Every solved problem,{" "}
          <span
            ref={phraseSlotRef}
            className="relative inline-block align-baseline"
          >
            {/* Reserved slot — prevents layout shift */}
            <span
              className="invisible opacity-0 select-none pointer-events-none font-hand font-medium"
              aria-hidden="true"
            >
              preserved in the Gallery.
            </span>

            {/* Floating phrase dragged into slot with pixel precision */}
            <span
              ref={phraseFloatingRef}
              className="absolute top-0 left-0 whitespace-nowrap font-hand font-medium text-[#e6b784]"
              style={{ willChange: "transform, opacity, filter" }}
            >
              preserved in the Gallery.
            </span>
          </span>
        </h2>

        {/* BEAT 2: DRAG_BLOCK Paragraph inside stable untransformed container */}
        <div ref={blockContainerRef} className="mt-6 max-w-2xl w-full">
          <p
            ref={blockRef}
            className="text-base leading-relaxed text-[#a2a8b4] sm:text-lg sm:leading-relaxed"
            style={{ willChange: "transform, opacity, filter" }}
          >
            Step inside a living archive of university derivations across calculus, classical mechanics, electrodynamics, and quantum physics—each lesson planned like a lecture, hand-written on the blackboard, and spoken aloud step by step.
          </p>
        </div>

        {/* BEAT 3: SELECT_TEXT Key Sentence */}
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-[#e8eaed] sm:text-base">
          {HIGHLIGHT_WORDS.map((word, idx) => (
            <React.Fragment key={`${word}-${idx}`}>
              <span
                ref={(el) => {
                  wordRefs.current[idx] = el;
                }}
                className="relative inline-block py-0.5"
              >
                {/* Native selection blue highlight layer behind word */}
                <span
                  ref={(el) => {
                    highlightRefs.current[idx] = el;
                  }}
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0.5 -inset-x-[3px] -z-10 rounded-[3px] bg-[#3b82f6]/30"
                  style={{
                    transformOrigin: "left center",
                    transform: "scaleX(0)",
                    willChange: "transform",
                  }}
                />
                <span className="relative z-10">{word}</span>
              </span>{" "}
            </React.Fragment>
          ))}
        </p>

        {/* Clean CTA Action */}
        <div className="mt-9">
          <Link
            ref={ctaRef}
            href="/gallery"
            className="group inline-flex items-center gap-2.5 rounded-xl border border-white/[0.12] bg-[#14171d] px-6 py-3 text-xs font-semibold text-[#f1eee7] shadow-lg shadow-black/40 transition-all hover:border-[#e6b784]/40 hover:bg-[#1a1e26] active:scale-[0.96]"
          >
            <span>Explore the Studio Gallery</span>
            <ArrowRight className="h-3.5 w-3.5 text-[#e6b784] transition-transform duration-150 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>
    </div>
  );
}
