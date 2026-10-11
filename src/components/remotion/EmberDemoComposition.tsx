"use client";

import React, { useRef, useEffect } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
} from "remotion";
import { compileTimeline } from "@/lib/video/compile";
import { renderFrame } from "@/lib/video/render";
import { THEMES, BoardThemeId, Timeline } from "@/lib/video/types";
import { SAMPLE_CALCULUS } from "@/lib/samples";

// Pre-compile the calculus timeline once
const TIMELINE: Timeline = compileTimeline(SAMPLE_CALCULUS);

export interface DemoProps {
  showAudio?: boolean;
}

/**
 * Embedded HTML5 Canvas rendering deterministic chalk strokes directly
 * from Ember's blackboard engine inside the Remotion frame
 */
const BlackboardCanvasView: React.FC<{
  currentTime: number;
  themeId?: BoardThemeId;
}> = ({ currentTime, themeId = "blackboard" }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const theme = THEMES[themeId] || THEMES.blackboard;
    renderFrame(ctx, TIMELINE, currentTime, theme, { pen: true });
  }, [currentTime, themeId]);

  return (
    <canvas
      ref={canvasRef}
      width={1280}
      height={720}
      style={{
        width: "100%",
        height: "100%",
        objectFit: "contain",
        display: "block",
        backgroundColor: "#121517",
      }}
    />
  );
};

export const EmberDemoComposition: React.FC<DemoProps> = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  const currentSec = Math.floor(frame / fps);
  const totalSec = Math.floor(durationInFrames / fps);
  const timeFormatted = `${String(Math.floor(currentSec / 60)).padStart(2, "0")}:${String(currentSec % 60).padStart(2, "0")} / ${String(Math.floor(totalSec / 60)).padStart(2, "0")}:${String(totalSec % 60).padStart(2, "0")}`;

  // ================= 4 SCENES (20s / 600 frames total) =================
  // Scene 1: 0   - 150 (0:00 - 0:05) · Problem
  // Scene 2: 150 - 300 (0:05 - 0:10) · Plan
  // Scene 3: 300 - 450 (0:10 - 0:15) · Blackboard
  // Scene 4: 450 - 600 (0:15 - 0:20) · Ask questions

  let activeScene = 1;
  let sceneBadge = "Problem";

  if (frame >= 450) {
    activeScene = 4;
    sceneBadge = "Ask questions";
  } else if (frame >= 300) {
    activeScene = 3;
    sceneBadge = "Blackboard";
  } else if (frame >= 150) {
    activeScene = 2;
    sceneBadge = "Plan";
  }

  // Scene 1 typing simulation
  const fullPrompt = "Evaluate the indefinite integral ∫ x · e^(2x) dx using integration by parts.";
  const typeCount = frame < 15
    ? 0
    : Math.min(
        fullPrompt.length,
        Math.floor(interpolate(frame, [15, 95], [0, fullPrompt.length], { extrapolateRight: "clamp" }))
      );
  const typedText = fullPrompt.slice(0, typeCount);

  // Cursor coordinates calibrated for 1920x1080 resolution
  const getCursor = () => {
    if (frame < 150) {
      if (frame < 75) return { x: 700, y: 530, click: false, visible: true };
      if (frame < 120) {
        const p = (frame - 75) / 45;
        const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
        return {
          x: 700 + (1320 - 700) * ease,
          y: 530 + (610 - 530) * ease,
          click: false,
          visible: true,
        };
      }
      const click = frame >= 120 && frame <= 135;
      return { x: 1320, y: 610, click, visible: true };
    }
    // Scene 4 cursor
    if (frame >= 450) {
      if (frame < 490) return { x: 1380, y: 780, click: false, visible: false };
      const p = Math.min(1, (frame - 490) / 30);
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      const click = frame >= 520 && frame <= 540;
      return {
        x: 1380 + (1480 - 1380) * ease,
        y: 780 + (840 - 780) * ease,
        click,
        visible: true,
      };
    }
    return { x: -100, y: -100, click: false, visible: false };
  };

  const cursor = getCursor();

  // Scene 2 planning progress (150 -> 300)
  const directorProgress = interpolate(frame, [155, 280], [0, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Scene 3 blackboard time (300 -> 450)
  const boardTime = interpolate(frame, [300, 450], [0, 52], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#07090c",
        color: "#f4f4f6",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Outer Studio Frame */}
      <div
        style={{
          position: "absolute",
          inset: "16px 20px",
          backgroundColor: "#0d1017",
          borderRadius: 18,
          border: "1px solid rgba(255, 255, 255, 0.08)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Top Technical Header */}
        <div
          style={{
            height: 56,
            backgroundColor: "#0b0d13",
            borderBottom: "1px solid rgba(255, 255, 255, 0.07)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 28px",
            flexShrink: 0,
            zIndex: 30,
          }}
        >
          {/* Window dots & App Identity */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ display: "flex", gap: 7 }}>
              <div style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.2)" }} />
              <div style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.12)" }} />
              <div style={{ width: 11, height: 11, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.12)" }} />
            </div>
            <div style={{ fontSize: 13, fontFamily: "ui-monospace, monospace", color: "#8a909d", display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ color: "#e6b784", fontWeight: 700 }}>EMBER</span>
              <span style={{ opacity: 0.35 }}>/</span>
              <span>calculus-integral-parts.ember</span>
            </div>
          </div>

          {/* Center Stage Pill */}
          <div
            style={{
              padding: "5px 18px",
              borderRadius: 20,
              backgroundColor: "rgba(230, 183, 132, 0.12)",
              border: "1px solid rgba(230, 183, 132, 0.35)",
              fontSize: 12,
              fontFamily: "ui-monospace, monospace",
              fontWeight: 700,
              color: "#e6b784",
              letterSpacing: "0.04em",
            }}
          >
            {sceneBadge}
          </div>

          {/* Right Status Indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12, fontFamily: "ui-monospace, monospace" }}>
            <span style={{ color: "#8a909d" }}>{timeFormatted}</span>
          </div>
        </div>

        {/* ================= VIEWPORT CONTENT ================= */}
        <div style={{ flex: 1, position: "relative", overflow: "hidden", backgroundColor: "#090b10" }}>

          {/* ================= SCENE 1: PROBLEM ================= */}
          {activeScene === 1 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                padding: "48px",
                backgroundColor: "#0d1017",
              }}
            >
              {/* Center Composer Box */}
              <div
                style={{
                  width: "100%",
                  maxWidth: 1180,
                  backgroundColor: "#12151e",
                  borderRadius: 24,
                  border: "1px solid rgba(255, 255, 255, 0.1)",
                  padding: "40px 48px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 30,
                }}
              >
                {/* Header tag */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ color: "#e6b784", fontSize: 14, fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                      Problem
                    </span>
                    <span style={{ fontSize: 13, color: "#6b7280" }}>AI blackboard tutor</span>
                  </div>
                </div>

                {/* Prompt Input Window */}
                <div
                  style={{
                    backgroundColor: "#080a0e",
                    borderRadius: 16,
                    border: "1px solid rgba(255, 255, 255, 0.09)",
                    padding: "26px 32px",
                    minHeight: 140,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                  }}
                >
                  <div style={{ fontSize: 24, lineHeight: 1.5, color: "#f4f4f6", fontFamily: "ui-sans-serif, system-ui", fontWeight: 500 }}>
                    {typedText}
                    {frame < 120 && (
                      <span
                        style={{
                          display: "inline-block",
                          width: 3,
                          height: 26,
                          backgroundColor: "#e6b784",
                          marginLeft: 4,
                          verticalAlign: "middle",
                          opacity: frame % 16 < 8 ? 1 : 0,
                        }}
                      />
                    )}
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22 }}>
                    <div style={{ fontSize: 13, color: "#6a7180", fontFamily: "ui-monospace, monospace" }}>
                      {"Step-by-step blackboard lesson"}
                    </div>
                    {/* Action Button */}
                    <div
                      style={{
                        padding: "12px 28px",
                        borderRadius: 14,
                        backgroundColor: "#e6b784",
                        color: "#141619",
                        fontWeight: 700,
                        fontSize: 14,
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        transform: cursor.click ? "scale(0.96)" : "scale(1)",
                        transition: "transform 0.1s ease",
                      }}
                    >
                      <span>Start lesson</span>
                      <span>→</span>
                    </div>
                  </div>
                </div>

                {/* Starter Chips */}
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <span style={{ fontSize: 13, color: "#6a7180", fontFamily: "ui-monospace, monospace" }}>Suggested:</span>
                  {["∫ x · e^(2x) dx", "RLC Underdamped Response", "Kinetic Theory Derivation"].map((chip, idx) => (
                    <div
                      key={chip}
                      style={{
                        padding: "8px 18px",
                        borderRadius: 10,
                        backgroundColor: idx === 0 ? "rgba(230, 183, 132, 0.15)" : "#161922",
                        border: idx === 0 ? "1px solid rgba(230, 183, 132, 0.4)" : "1px solid rgba(255,255,255,0.06)",
                        fontSize: 13,
                        color: idx === 0 ? "#e6b784" : "#9ea4b1",
                        fontFamily: "ui-monospace, monospace",
                      }}
                    >
                      {chip}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================= SCENE 2: PLAN ================= */}
          {activeScene === 2 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                padding: "44px 54px",
                backgroundColor: "#0d1017",
                justifyContent: "space-between",
              }}
            >
              {/* Header */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <div style={{ fontSize: 24, fontWeight: 600, color: "#f4f4f6" }}>
                    Ember plans the lesson step by step
                  </div>
                </div>
              </div>

              {/* 4 Step Cards Pipeline */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(4, 1fr)",
                  gap: 20,
                  margin: "28px 0",
                  flex: 1,
                }}
              >
                {[
                  {
                    step: "01",
                    title: "Identify parts",
                    math: "u = x,  dv = e^(2x) dx",
                  },
                  {
                    step: "02",
                    title: "Differentiate and integrate",
                    math: "du = dx,  v = ½ e^(2x)",
                  },
                  {
                    step: "03",
                    title: "Apply the formula",
                    math: "∫ u dv = uv − ∫ v du",
                  },
                  {
                    step: "04",
                    title: "Finish the integral",
                    math: "½ x e^(2x) − ¼ e^(2x) + C",
                  },
                ].map((node, idx) => {
                  const threshold = [25, 50, 75, 95][idx];
                  const isActive = directorProgress >= threshold;
                  return (
                    <div
                      key={node.step}
                      style={{
                        backgroundColor: isActive ? "#131926" : "#0f1118",
                        borderRadius: 16,
                        border: isActive ? "1px solid rgba(230, 183, 132, 0.45)" : "1px solid rgba(255, 255, 255, 0.06)",
                        padding: "28px 24px",
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        height: "100%",
                        transition: "all 0.3s ease",
                      }}
                    >
                      <div>
                        <span style={{ fontSize: 12, fontFamily: "ui-monospace, monospace", color: isActive ? "#e6b784" : "#6a7180", fontWeight: 700 }}>
                          STEP {node.step}
                        </span>
                        <div style={{ fontSize: 20, fontWeight: 600, color: "#f4f4f6", marginTop: 12, lineHeight: 1.3 }}>
                          {node.title}
                        </div>
                      </div>

                      <div
                        style={{
                          backgroundColor: "#07090e",
                          borderRadius: 10,
                          padding: "16px 18px",
                          fontFamily: "ui-monospace, monospace",
                          fontSize: 15,
                          color: isActive ? "#e6b784" : "#9ea4b1",
                          border: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        {node.math}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Flat orange progress bar (2px) */}
              <div style={{ backgroundColor: "rgba(255, 255, 255, 0.08)", height: 2, borderRadius: 1, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${directorProgress}%`,
                    backgroundColor: "#e6b784",
                    transition: "width 0.1s ease",
                  }}
                />
              </div>
            </div>
          )}

          {/* ================= SCENE 3: BLACKBOARD ================= */}
          {activeScene === 3 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                backgroundColor: "#121517",
              }}
            >
              {/* Live Canvas Blackboard Engine */}
              <div style={{ width: "100%", height: "100%", position: "relative" }}>
                <BlackboardCanvasView currentTime={boardTime} themeId="blackboard" />
              </div>
            </div>
          )}

          {/* ================= SCENE 4: ASK QUESTIONS ================= */}
          {activeScene === 4 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "grid",
                gridTemplateColumns: "1.2fr 0.8fr",
                backgroundColor: "#0d1017",
                overflow: "hidden",
              }}
            >
              {/* Left pane: Blackboard reference */}
              <div style={{ height: "100%", borderRight: "1px solid rgba(255, 255, 255, 0.08)", position: "relative" }}>
                <BlackboardCanvasView currentTime={48} themeId="blackboard" />
                <div
                  style={{
                    position: "absolute",
                    top: 18,
                    left: 18,
                    padding: "5px 12px",
                    borderRadius: 8,
                    backgroundColor: "rgba(0,0,0,0.65)",
                    fontSize: 11,
                    fontFamily: "ui-monospace, monospace",
                    color: "#8a909d",
                  }}
                >
                  DERIVATION BOARD CHECKPOINT
                </div>
              </div>

              {/* Right pane: Conversational Q&A */}
              <div
                style={{
                  height: "100%",
                  padding: "40px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  backgroundColor: "#11141c",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ fontSize: 13, fontFamily: "ui-monospace, monospace", color: "#e6b784", fontWeight: 700 }}>
                      Ask questions
                    </div>
                    <div style={{ fontSize: 11, color: "#8a909d", fontFamily: "ui-monospace, monospace" }}>
                      ● AUDIO LIVE
                    </div>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "#f4f4f6", marginTop: 8 }}>
                    Ask Ember about any step
                  </div>

                  {/* Student Question Card */}
                  <div
                    style={{
                      marginTop: 26,
                      backgroundColor: "#161b26",
                      borderRadius: 16,
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      padding: "18px 22px",
                    }}
                  >
                    <div style={{ fontSize: 11, color: "#8a909d", fontFamily: "ui-monospace, monospace", marginBottom: 6 }}>
                      {"STUDENT QUESTION · 0:14"}
                    </div>
                    <div style={{ fontSize: 15, color: "#f4f4f6", lineHeight: 1.5 }}>
                      {"“Why did we choose u = x instead of u = e^(2x)?”"}
                    </div>
                  </div>

                  {/* Ember Socratic Answer */}
                  <div
                    style={{
                      marginTop: 20,
                      backgroundColor: "rgba(230, 183, 132, 0.09)",
                      borderRadius: 16,
                      border: "1px solid rgba(230, 183, 132, 0.28)",
                      padding: "20px 24px",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      <span style={{ fontSize: 12, color: "#e6b784", fontFamily: "ui-monospace, monospace", fontWeight: 700 }}>
                        EMBER
                      </span>
                    </div>
                    <div style={{ fontSize: 14, color: "#e8eaed", lineHeight: 1.6 }}>
                      {"“Notice LIATE rule: algebraic terms (x) simplify upon differentiation (du = dx). If you set u = e^(2x), the polynomial power multiplies rather than terminates!”"}
                    </div>
                  </div>
                </div>

                {/* Question Chips */}
                <div>
                  <div style={{ fontSize: 12, color: "#6a7180", fontFamily: "ui-monospace, monospace", marginBottom: 12 }}>
                    Follow-up drill-downs:
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: 10,
                        backgroundColor: "#171c28",
                        border: "1px solid rgba(255,255,255,0.06)",
                        fontSize: 13,
                        color: "#9ea4b1",
                      }}
                    >
                      {"→ What if this was a definite integral from 0 to 1?"}
                    </div>
                    <div
                      style={{
                        padding: "12px 16px",
                        borderRadius: 10,
                        backgroundColor: "#171c28",
                        border: "1px solid rgba(255,255,255,0.06)",
                        fontSize: 13,
                        color: "#9ea4b1",
                      }}
                    >
                      {"→ Show tabular method integration by parts."}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Dynamic cursor rendering */}
        {cursor.visible && (
          <div
            style={{
              position: "absolute",
              left: cursor.x,
              top: cursor.y,
              pointerEvents: "none",
              zIndex: 100,
              transition: "transform 0.05s ease-out",
            }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
              <path
                d="M4 4L11 20L14 13L21 10L4 4Z"
                fill="#f4f4f6"
                stroke="#121517"
                strokeWidth="2"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
    </AbsoluteFill>
  );
};
