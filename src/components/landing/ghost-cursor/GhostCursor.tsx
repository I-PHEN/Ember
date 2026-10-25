"use client";

import React, { useEffect, useRef } from "react";
import { motion, useSpring, useMotionValue } from "framer-motion";
import { useGhostCursor } from "./GhostCursorContext";

export default function GhostCursor() {
  const { activeBeat, isEnabled } = useGhostCursor();

  const prevPosRef = useRef<{ x: number; y: number } | null>(null);

  // Spring physics for smooth acceleration and weighty settling
  const springX = useSpring(0, { stiffness: 160, damping: 22, mass: 0.65 });
  const springY = useSpring(0, { stiffness: 160, damping: 22, mass: 0.65 });
  const springRotate = useSpring(0, { stiffness: 180, damping: 20 });
  const springScale = useSpring(1, { stiffness: 240, damping: 18 });
  const springOpacity = useSpring(0, { stiffness: 200, damping: 25 });

  useEffect(() => {
    if (!isEnabled || !activeBeat || !activeBeat.cursorTarget || activeBeat.mode === "hidden") {
      springOpacity.set(0);
      return;
    }

    const { x, y } = activeBeat.cursorTarget;
    springOpacity.set(1);

    // Compute direction vector and angle to face direction of travel
    if (prevPosRef.current) {
      const dx = x - prevPosRef.current.x;
      const dy = y - prevPosRef.current.y;
      const distance = Math.hypot(dx, dy);

      if (distance > 1.5) {
        // SVG base angle: triangle tip points top-left (-135deg).
        // Align rotation so tip points in the travel direction.
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = (angleRad * 180) / Math.PI + 135;
        springRotate.set(angleDeg);
      }
    }

    prevPosRef.current = { x, y };
    springX.set(x);
    springY.set(y);

    // Tactile grab pinch when grabbing an element
    if (activeBeat.mode === "grabbing") {
      springScale.set(0.88);
    } else {
      springScale.set(1.0);
    }
  }, [activeBeat, isEnabled, springX, springY, springRotate, springScale, springOpacity]);

  if (!isEnabled) return null;

  return (
    <motion.div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        x: springX,
        y: springY,
        rotate: springRotate,
        scale: springScale,
        opacity: springOpacity,
        pointerEvents: "none",
        zIndex: 9999,
        willChange: "transform, opacity",
      }}
      aria-hidden="true"
    >
      {/* 20px Rounded-Triangle Cursor with 1.5px crisp white outline */}
      <svg
        width="22"
        height="22"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="filter drop-shadow-[0_2px_6px_rgba(0,0,0,0.6)]"
      >
        {/* Rounded Precision Arrow Pointer */}
        <path
          d="M3.5 3.5L20 10.5L12 13L8.5 21L3.5 3.5Z"
          fill={activeBeat?.mode === "grabbing" ? "rgba(230,183,132,0.2)" : "rgba(255,255,255,0.08)"}
          stroke={activeBeat?.mode === "grabbing" ? "#e6b784" : "#ffffff"}
          strokeWidth="1.5"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
    </motion.div>
  );
}
