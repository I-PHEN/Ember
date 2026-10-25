"use client";

import React, { useRef, useEffect } from "react";
import { useGhostCursor } from "./GhostCursorContext";

interface DragPhraseProps {
  phrase: string;
  className?: string;
  sectionRef: React.RefObject<HTMLElement | null>;
  id?: string;
}

export default function DragPhrase({
  phrase,
  className = "",
  sectionRef,
  id = "hero-drag-phrase",
}: DragPhraseProps) {
  const { registerBeat, updateBeat, unregisterBeat, isEnabled } = useGhostCursor();
  const slotRef = useRef<HTMLSpanElement>(null);
  const floatingRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    registerBeat(id, {
      type: "DRAG_PHRASE",
      progress: 0,
      cursorTarget: null,
      mode: "hidden",
      active: false,
    });

    return () => unregisterBeat(id);
  }, [id, registerBeat, unregisterBeat]);

  // Track section scroll progress and update choreography
  useEffect(() => {
    if (!isEnabled) return;

    const handleScroll = () => {
      const section = sectionRef.current;
      const slot = slotRef.current;
      if (!section || !slot) return;

      const sectionRect = section.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Section visibility progress from entering bottom (0) to passing top (1)
      const totalRange = sectionRect.height + viewportHeight;
      const currentScroll = viewportHeight - sectionRect.top;
      const rawProgress = currentScroll / totalRange;

      // Active choreo window: when the section is centered in viewport
      // e.g. sectionRect.top between 0.8 * vh down to 0.1 * vh
      const startTrigger = viewportHeight * 0.75;
      const endTrigger = viewportHeight * 0.15;
      const choreoRange = startTrigger - endTrigger;
      const choreoDist = startTrigger - sectionRect.top;
      const progress = Math.max(0, Math.min(1, choreoDist / choreoRange));

      const slotRect = slot.getBoundingClientRect();
      const isVisible = slotRect.top < viewportHeight && slotRect.bottom > 0;

      if (!isVisible) {
        updateBeat(id, { active: false, mode: "hidden", cursorTarget: null });
        if (floatingRef.current) {
          floatingRef.current.style.transform = "none";
          floatingRef.current.style.filter = "none";
          floatingRef.current.style.opacity = "1";
        }
        return;
      }

      // Drag phrase animation calculations
      const START_X = 45;
      const START_Y = 22;
      const START_BLUR = 3; // px
      const START_OPACITY = 0.45;

      // Grab handle coordinate relative to phrase
      const handleOffsetX = Math.min(slotRect.width * 0.6, 60);
      const handleOffsetY = slotRect.height * 0.5;

      let dx = 0;
      let dy = 0;
      let blur = 0;
      let opacity = 1;
      let cursorX = slotRect.left + handleOffsetX;
      let cursorY = slotRect.top + handleOffsetY;
      let mode: "moving" | "grabbing" | "idle" = "idle";

      if (progress < 0.2) {
        // Phase 1: Cursor approaches displaced phrase
        const t = Math.max(0, progress / 0.2);
        const easeT = t * t * (3 - 2 * t); // smoothstep
        dx = START_X;
        dy = START_Y;
        blur = START_BLUR;
        opacity = START_OPACITY;

        const cursorStartX = slotRect.left - 50;
        const cursorStartY = slotRect.top - 80;
        const targetX = slotRect.left + dx + handleOffsetX;
        const targetY = slotRect.top + dy + handleOffsetY;

        cursorX = cursorStartX + (targetX - cursorStartX) * easeT;
        cursorY = cursorStartY + (targetY - cursorStartY) * easeT;
        mode = "moving";
      } else if (progress >= 0.2 && progress < 0.75) {
        // Phase 2: Cursor grabs and drags phrase to natural slot
        const t = (progress - 0.2) / 0.55;
        // Cubic ease out for weighty physical drag
        const easeOut = 1 - Math.pow(1 - t, 2.5);

        dx = START_X * (1 - easeOut);
        dy = START_Y * (1 - easeOut);
        blur = START_BLUR * (1 - easeOut);
        opacity = START_OPACITY + (1 - START_OPACITY) * easeOut;

        cursorX = slotRect.left + dx + handleOffsetX;
        cursorY = slotRect.top + dy + handleOffsetY;
        mode = "grabbing";
      } else {
        // Phase 3: Settled exactly on normal layout position, cursor releases & holds
        dx = 0;
        dy = 0;
        blur = 0;
        opacity = 1;

        const t = (progress - 0.75) / 0.25;
        cursorX = slotRect.left + handleOffsetX + t * 40;
        cursorY = slotRect.top + handleOffsetY + t * 15;
        mode = "idle";
      }

      // Apply transform & filter to floating element (No layout shift!)
      if (floatingRef.current) {
        floatingRef.current.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
        floatingRef.current.style.filter = blur > 0.05 ? `blur(${blur}px)` : "none";
        floatingRef.current.style.opacity = `${opacity}`;
      }

      updateBeat(id, {
        active: true,
        progress,
        cursorTarget: { x: cursorX, y: cursorY },
        mode,
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleScroll, { passive: true });
    handleScroll();

    return () => {
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [id, isEnabled, sectionRef, updateBeat]);

  return (
    <span ref={slotRef} className="inline-block relative align-baseline">
      {/* Invisible placeholder reserving exact inline width & height */}
      <span className="invisible opacity-0 select-none pointer-events-none" aria-hidden="true">
        {phrase}
      </span>

      {/* Animated floating phrase dragged by ghost cursor */}
      <span
        ref={floatingRef}
        className={`absolute top-0 left-0 whitespace-nowrap ${className}`}
        style={{
          willChange: "transform, opacity, filter",
          transition: isEnabled ? "none" : "none", // Driven purely by scroll scrub
        }}
      >
        {phrase}
      </span>
    </span>
  );
}
