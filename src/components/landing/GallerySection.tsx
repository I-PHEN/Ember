"use client";

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useScroll, useSpring, useMotionValueEvent } from "framer-motion";
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

// Strong ease-out from the animate skill: cubic-bezier(0.23, 1, 0.32, 1) approximation
function easeOutStrong(t: number) {
  return 1 - Math.pow(1 - clamp(t, 0, 1), 3);
}

// Smooth ease-in-out for cursor travel between beats
function easeInOutCubic(t: number) {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

export default function GallerySection() {
  const trackRef = useRef<HTMLDivElement>(null);
  const phraseSlotRef = useRef<HTMLSpanElement>(null);
  const phraseFloatingRef = useRef<HTMLSpanElement>(null);
  const blockRef = useRef<HTMLParagraphElement>(null);
  const sentenceContainerRef = useRef<HTMLParagraphElement>(null);
  const wordRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const highlightRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  const cursorRef = useRef<HTMLDivElement>(null);
  const cursorInnerRef = useRef<SVGSVGElement>(null);
  const cursorPathRef = useRef<SVGPathElement>(null);

  const [isEnabled, setIsEnabled] = useState(false);

  // Gate on desktop pointer devices and respect prefers-reduced-motion
  useEffect(() => {
    const checkCapabilities = () => {
      const isDesktopWidth = window.innerWidth >= 768;
      const hasFinePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setIsEnabled(isDesktopWidth && hasFinePointer && !prefersReducedMotion);
    };

    checkCapabilities();
    window.addEventListener("resize", checkCapabilities);
    return () => window.removeEventListener("resize", checkCapabilities);
  }, []);

  // Scroll progress across the pinned Gallery runway
  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ["start 25%", "end 95%"],
  });

  // Weighty spring physics (animate skill: mass 0.5, stiffness 130, damping 24)
  const smoothProgress = useSpring(scrollYProgress, {
    stiffness: 130,
    damping: 24,
    mass: 0.5,
    restDelta: 0.0005,
  });

  // Apply initial displaced states when enabled, or reset to final state if disabled
  useEffect(() => {
    const applyChoreography = (p: number) => {
      const phraseEl = phraseFloatingRef.current;
      const blockEl = blockRef.current;
      const cursorEl = cursorRef.current;

      if (!isEnabled) {
        if (phraseEl) {
          phraseEl.style.transform = "translate3d(0px, 0px, 0px) rotate(0deg)";
          phraseEl.style.filter = "none";
          phraseEl.style.opacity = "1";
        }
        if (blockEl) {
          blockEl.style.transform = "translate3d(0px, 0px, 0px) rotate(0deg)";
          blockEl.style.filter = "none";
          blockEl.style.opacity = "1";
        }
        highlightRefs.current.forEach((hl) => {
          if (hl) hl.style.transform = "scaleX(1)";
        });
        if (cursorEl) {
          cursorEl.style.opacity = "0";
        }
        return;
      }

      const slotRect = phraseSlotRef.current?.getBoundingClientRect();
      const blockRect = blockEl?.getBoundingClientRect();
      const ctaRect = ctaRef.current?.getBoundingClientRect();

      if (!slotRect || !blockRect) return;

      // Check if section is in viewport
      const inView = slotRect.top < window.innerHeight && blockRect.bottom > 0;
      if (!inView || p <= 0.005) {
        if (cursorEl) cursorEl.style.opacity = "0";
      }

      // -------------------------------------------------------------
      // BEAT 1: DRAG_PHRASE (0.08 -> 0.34)
      // -------------------------------------------------------------
      const PHRASE_INIT_X = 44;
      const PHRASE_INIT_Y = -18;
      const PHRASE_INIT_ROT = -2.2;
      const PHRASE_INIT_BLUR = 2.5;
      const PHRASE_INIT_OPACITY = 0.42;

      const beat1DragT = easeOutStrong((p - 0.1) / 0.24);
      const pDx = PHRASE_INIT_X * (1 - beat1DragT);
      const pDy = PHRASE_INIT_Y * (1 - beat1DragT);
      const pRot = PHRASE_INIT_ROT * (1 - beat1DragT);
      const pBlur = PHRASE_INIT_BLUR * (1 - beat1DragT);
      const pOpacity = PHRASE_INIT_OPACITY + (1 - PHRASE_INIT_OPACITY) * beat1DragT;

      if (phraseEl) {
        phraseEl.style.transform = `translate3d(${pDx.toFixed(2)}px, ${pDy.toFixed(2)}px, 0px) rotate(${pRot.toFixed(2)}deg)`;
        phraseEl.style.filter = pBlur > 0.08 ? `blur(${pBlur.toFixed(2)}px)` : "none";
        phraseEl.style.opacity = pOpacity.toFixed(3);
      }

      // -------------------------------------------------------------
      // BEAT 2: DRAG_BLOCK (0.42 -> 0.68)
      // -------------------------------------------------------------
      const BLOCK_INIT_X = 52;
      const BLOCK_INIT_Y = 16;
      const BLOCK_INIT_ROT = 2.0;
      const BLOCK_INIT_BLUR = 2.2;
      const BLOCK_INIT_OPACITY = 0.38;

      const beat2DragT = easeOutStrong((p - 0.44) / 0.24);
      const bDx = BLOCK_INIT_X * (1 - beat2DragT);
      const bDy = BLOCK_INIT_Y * (1 - beat2DragT);
      const bRot = BLOCK_INIT_ROT * (1 - beat2DragT);
      const bBlur = BLOCK_INIT_BLUR * (1 - beat2DragT);
      const bOpacity = BLOCK_INIT_OPACITY + (1 - BLOCK_INIT_OPACITY) * beat2DragT;

      if (blockEl) {
        blockEl.style.transformOrigin = "76% 65%";
        blockEl.style.transform = `translate3d(${bDx.toFixed(2)}px, ${bDy.toFixed(2)}px, 0px) rotate(${bRot.toFixed(2)}deg)`;
        blockEl.style.filter = bBlur > 0.08 ? `blur(${bBlur.toFixed(2)}px)` : "none";
        blockEl.style.opacity = bOpacity.toFixed(3);
      }

      // -------------------------------------------------------------
      // BEAT 3: SELECT_TEXT (0.74 -> 0.94)
      // -------------------------------------------------------------
      const selectT = clamp((p - 0.74) / 0.2, 0, 1);
      const totalWords = HIGHLIGHT_WORDS.length;
      const exactWordFloat = selectT * totalWords;

      highlightRefs.current.forEach((hl, idx) => {
        if (!hl) return;
        const wordProgress = clamp(exactWordFloat - idx, 0, 1);
        hl.style.transform = `scaleX(${wordProgress.toFixed(3)})`;
      });

      // -------------------------------------------------------------
      // GHOST CURSOR WAYPOINT INTERPOLATION & POSTURE
      // -------------------------------------------------------------
      if (!cursorEl || !cursorInnerRef.current || !cursorPathRef.current) return;

      // Anchor points in viewport space:
      // 1. Phrase handle (near middle-right of phrase)
      const phraseHandleX = slotRect.left + slotRect.width * 0.58 + pDx;
      const phraseHandleY = slotRect.top + slotRect.height * 0.52 + pDy;

      // 2. Block handle (near end of line 2 — 76% x, 65% y of natural block)
      // Note: blockRect already includes current transform bDx/bDy, so use blockRect directly!
      const blockHandleX = blockRect.left + blockRect.width * 0.76;
      const blockHandleY = blockRect.top + blockRect.height * 0.65;

      // 3. Sentence start and active word position
      const firstWordRect = wordRefs.current[0]?.getBoundingClientRect();
      const lastWordRect = wordRefs.current[totalWords - 1]?.getBoundingClientRect();
      const activeWordIdx = clamp(Math.floor(exactWordFloat), 0, totalWords - 1);
      const activeWordRect = wordRefs.current[activeWordIdx]?.getBoundingClientRect();
      const wordSubT = exactWordFloat - activeWordIdx;

      const sentenceStartX = firstWordRect ? firstWordRect.left - 8 : slotRect.left;
      const sentenceStartY = firstWordRect ? firstWordRect.top + firstWordRect.height * 0.55 : slotRect.bottom + 80;

      const activeSweepX = activeWordRect
        ? activeWordRect.left + activeWordRect.width * wordSubT
        : sentenceStartX;
      const activeSweepY = activeWordRect
        ? activeWordRect.top + activeWordRect.height * 0.55
        : sentenceStartY;

      const sentenceEndX = lastWordRect ? lastWordRect.right + 6 : activeSweepX;
      const sentenceEndY = lastWordRect ? lastWordRect.top + lastWordRect.height * 0.55 : activeSweepY;

      let cx = phraseHandleX;
      let cy = phraseHandleY;
      let cursorScale = 1;
      let cursorBankDeg = 0;
      let cursorOpacity = 1;
      let isActionActive = false;

      if (p < 0.1) {
        // Approach Beat 1 from upper left
        const t = easeInOutCubic(p / 0.1);
        const startX = slotRect.left - 70;
        const startY = slotRect.top - 65;
        cx = startX + (phraseHandleX - startX) * t;
        cy = startY + (phraseHandleY - startY) * t;
        cursorOpacity = clamp(p / 0.04, 0, 1);
        cursorBankDeg = 8 * (1 - t);
      } else if (p >= 0.1 && p < 0.34) {
        // Dragging Beat 1 Phrase
        cx = phraseHandleX;
        cy = phraseHandleY;
        cursorScale = 0.88;
        cursorBankDeg = -4;
        isActionActive = true;
      } else if (p >= 0.34 && p < 0.44) {
        // Hold briefly at settled phrase (0.34 -> 0.37), then glide to Beat 2 Block handle (0.37 -> 0.44)
        const glideT = easeInOutCubic((p - 0.37) / 0.07);
        cx = phraseHandleX + (blockHandleX - phraseHandleX) * glideT;
        cy = phraseHandleY + (blockHandleY - phraseHandleY) * glideT;
        cursorBankDeg = glideT > 0 && glideT < 1 ? 6 : 0;
      } else if (p >= 0.44 && p < 0.68) {
        // Dragging Beat 2 Paragraph Block
        cx = blockHandleX;
        cy = blockHandleY;
        cursorScale = 0.88;
        cursorBankDeg = -3;
        isActionActive = true;
      } else if (p >= 0.68 && p < 0.74) {
        // Release block and glide to start of Beat 3 Sentence
        const glideT = easeInOutCubic((p - 0.69) / 0.05);
        cx = blockHandleX + (sentenceStartX - blockHandleX) * glideT;
        cy = blockHandleY + (sentenceStartY - blockHandleY) * glideT;
        cursorBankDeg = glideT > 0 && glideT < 1 ? -10 : 0;
      } else if (p >= 0.74 && p < 0.94) {
        // Sweeping across Beat 3 Sentence word-by-word
        cx = activeSweepX;
        cy = activeSweepY;
        cursorScale = 0.92;
        cursorBankDeg = 4;
        isActionActive = true;
      } else {
        // Settle near the CTA button and fade gently at the very end
        const restT = easeOutStrong((p - 0.94) / 0.06);
        const targetX = ctaRect ? ctaRect.right + 28 : sentenceEndX + 24;
        const targetY = ctaRect ? ctaRect.top + ctaRect.height * 0.5 : sentenceEndY + 30;
        cx = sentenceEndX + (targetX - sentenceEndX) * restT;
        cy = sentenceEndY + (targetY - sentenceEndY) * restT;
        cursorOpacity = clamp(1 - (p - 0.97) / 0.03, 0.35, 1);
      }

      cursorEl.style.opacity = cursorOpacity.toFixed(3);
      cursorEl.style.transform = `translate3d(${cx.toFixed(1)}px, ${cy.toFixed(1)}px, 0px)`;
      cursorInnerRef.current.style.transform = `scale(${cursorScale}) rotate(${cursorBankDeg.toFixed(1)}deg)`;
      cursorPathRef.current.setAttribute(
        "fill",
        isActionActive ? "rgba(255, 255, 255, 0.22)" : "rgba(255, 255, 255, 0.06)"
      );
    };

    // Run once on mount / capability change
    applyChoreography(smoothProgress.get());

    const handleScrollOrResize = () => {
      applyChoreography(smoothProgress.get());
    };

    window.addEventListener("scroll", handleScrollOrResize, { passive: true });
    window.addEventListener("resize", handleScrollOrResize, { passive: true });
    return () => {
      window.removeEventListener("scroll", handleScrollOrResize);
      window.removeEventListener("resize", handleScrollOrResize);
    };
  }, [isEnabled, smoothProgress]);

  // Subscribe directly to spring changes (zero React re-renders)
  useMotionValueEvent(smoothProgress, "change", (latest) => {
    if (!isEnabled) return;
    // Trigger synchronous frame update
    const event = new Event("scroll");
    window.dispatchEvent(event);
  });

  return (
    <>
      {/* Global Fixed Ghost Cursor Element */}
      {isEnabled && (
        <div
          ref={cursorRef}
          aria-hidden="true"
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            pointerEvents: "none",
            zIndex: 9999,
            opacity: 0,
            willChange: "transform, opacity",
          }}
        >
          <svg
            ref={cursorInnerRef}
            width="22"
            height="22"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{
              transformOrigin: "3.5px 3.5px",
              transition: "transform 140ms cubic-bezier(0.23, 1, 0.32, 1)",
              filter: "drop-shadow(0 3px 8px rgba(0, 0, 0, 0.65))",
            }}
          >
            <path
              ref={cursorPathRef}
              d="M3.5 3.5L19.5 10.2L11.8 12.8L8.8 20.5L3.5 3.5Z"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
              fill="rgba(255, 255, 255, 0.06)"
            />
          </svg>
        </div>
      )}

      {/* Scroll Runway for the Final Gallery Part (No Cards — Pure Editorial Choreography) */}
      <div ref={trackRef} className="relative w-full h-[165vh]">
        <section
          aria-labelledby="gallery-editorial-heading"
          className="sticky top-24 z-10 mx-auto flex min-h-[calc(100vh-8rem)] w-full max-w-3xl flex-col items-center justify-center px-6 py-12 text-center"
        >
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
              {/* Reserved slot — prevents any layout shift */}
              <span
                className="invisible opacity-0 select-none pointer-events-none font-hand font-medium"
                aria-hidden="true"
              >
                preserved in the Gallery.
              </span>

              {/* Displaced phrase dragged into the slot by Ghost Cursor */}
              <span
                ref={phraseFloatingRef}
                className="absolute top-0 left-0 whitespace-nowrap font-hand font-medium text-[#e6b784]"
                style={{ willChange: "transform, opacity, filter" }}
              >
                preserved in the Gallery.
              </span>
            </span>
          </h2>

          {/* BEAT 2: DRAG_BLOCK Paragraph */}
          <p
            ref={blockRef}
            className="mt-6 max-w-2xl text-base leading-relaxed text-[#a2a8b4] sm:text-lg sm:leading-relaxed"
            style={{ willChange: "transform, opacity, filter" }}
          >
            Step inside a living archive of university derivations across calculus, classical mechanics, electrodynamics, and quantum physics—each lesson planned like a lecture, hand-written on the blackboard, and spoken aloud step by step.
          </p>

          {/* BEAT 3: SELECT_TEXT Key Sentence */}
          <p
            ref={sentenceContainerRef}
            className="mt-6 max-w-xl text-sm leading-relaxed text-[#e8eaed] sm:text-base"
          >
            {HIGHLIGHT_WORDS.map((word, idx) => (
              <React.Fragment key={`${word}-${idx}`}>
                <span
                  ref={(el) => {
                    wordRefs.current[idx] = el;
                  }}
                  className="relative inline-block py-0.5"
                >
                  {/* Desaturated native-selection blue highlight layer behind word */}
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

          {/* Single Clean Gallery Action */}
          <div className="mt-9">
            <Link
              ref={ctaRef}
              href="/gallery"
              className="group inline-flex items-center gap-2.5 rounded-xl border border-white/[0.12] bg-[#14171d] px-6 py-3 text-xs font-semibold text-[#f1eee7] shadow-lg shadow-black/40 transition-all hover:border-[#e6b784]/40 hover:bg-[#1a1e26]"
            >
              <span>Explore the Studio Gallery</span>
              <ArrowRight className="h-3.5 w-3.5 text-[#e6b784] transition-transform duration-150 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </section>
      </div>
    </>
  );
}
