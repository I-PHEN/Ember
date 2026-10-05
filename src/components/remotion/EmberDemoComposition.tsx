"use client";

import React, { useRef, useEffect } from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  Img,
  staticFile,
} from "remotion";
import { compileTimeline } from "@/lib/video/compile";
import { renderFrame } from "@/lib/video/render";
import { THEMES, BoardThemeId, Timeline } from "@/lib/video/types";
import { SAMPLE_CALCULUS } from "@/lib/samples";

// Pre-compile the flagship calculus timeline once
const TIMELINE: Timeline = compileTimeline(SAMPLE_CALCULUS);

export interface DemoProps {
  showAudio?: boolean;
}

/**
 * Embedded HTML5 Canvas rendering deterministic chalk strokes directly
 * from Ember's blackboard engine inside the real app player window
 */
const BlackboardCanvasView: React.FC<{
  currentTime: number;
  themeId: BoardThemeId;
}> = ({ currentTime, themeId }) => {
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

  // ================= SCENE BREAKDOWN (25s / 750 frames) =================
  // Scene 1: 0 - 180 (0:00 - 0:06) · Problem Composer & Typing
  // Scene 2: 180 - 360 (0:06 - 0:12) · AI Derivation Planner (Director)
  // Scene 3: 360 - 600 (0:12 - 0:20) · Blackboard Canvas Engine & Handwriting
  // Scene 4: 600 - 750 (0:20 - 0:25) · Interactive Office Hours

  let activeScene = 1;
  let sceneBadge = "01 · PROBLEM COMPOSER";
  let caption =
    "Problem Composer: Paste any calculus, physics, or engineering problem.";

  if (frame >= 600) {
    activeScene = 4;
    sceneBadge = "04 · OFFICE HOURS Q&A";
    caption =
      "Office Hours: Clarify any derivation step with Professor Ember in real time.";
  } else if (frame >= 360) {
    activeScene = 3;
    sceneBadge = "03 · BLACKBOARD STAGE";
    caption =
      "Blackboard Stage: Marker pen hand-writes derivations with calm teacher pacing.";
  } else if (frame >= 180) {
    activeScene = 2;
    sceneBadge = "02 · DERIVATION PLANNER";
    caption =
      "Derivation Planner: Shapes pedagogical steps, checks consistency, and coordinates chalk.";
  }

  // Realistic human cursor with smooth ease-in-out movement
  const getCursor = () => {
    // Scene 1 (0 to 180): Cursor in composer, then clicks "Start lesson" at (675, 455)
    if (frame < 180) {
      if (frame < 90) return { x: 575, y: 420, click: false, visible: true };
      if (frame < 120) {
        const p = Math.min(1, Math.max(0, (frame - 90) / 30));
        const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
        const x = 575 + (675 - 575) * ease;
        const y = 420 + (455 - 420) * ease;
        return { x, y, click: false, visible: true };
      }
      const click = frame >= 120 && frame <= 140;
      return { x: 675, y: 455, click, visible: true };
    }
    // Scene 2 & 3: Cursor hidden during planning and blackboard solve
    if (frame < 600) {
      return { x: -100, y: -100, click: false, visible: false };
    }
    // Scene 4 (600 to 750): Cursor moves to question chips in Office Hours (750, 498)
    if (frame < 620) return { x: 500, y: 350, click: false, visible: false };
    const p = Math.min(1, Math.max(0, (frame - 620) / 26));
    const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
    const x = 500 + (750 - 500) * ease;
    const y = 350 + (498 - 350) * ease;
    const click = frame >= 650 && frame <= 675;
    return { x, y, click, visible: true };
  };

  const cursor = getCursor();

  // Rapid typing in Scene 1 (frames 20 to 100)
  const fullPrompt =
    "Evaluate the indefinite integral ∫ x · e^(2x) dx using integration by parts.";
  const typeCount =
    frame < 20
      ? 0
      : Math.min(
          fullPrompt.length,
          Math.floor(
            interpolate(frame, [20, 100], [0, fullPrompt.length], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          )
        );
  const typedText = fullPrompt.slice(0, typeCount);

  // Director Progress in Scene 2 (frames 190 to 345: 6% -> 100%)
  const directorProgress = interpolate(frame, [190, 345], [6, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fast, energetic chalk derivation in Scene 3 (frames 360 to 600: 0 to 52 seconds)
  const boardTime = interpolate(frame, [360, 600], [0, 52], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Camera scale and pan in Scene 4 (frames 600 to 630: zoom into Office Hours)
  const officeZoom = interpolate(frame, [600, 630], [1, 1.32], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const officePanX = interpolate(frame, [600, 630], [0, -14], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#0d0f11",
        color: "#f1eee7",
        fontFamily:
          "ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Sleek Browser Shell Window */}
      <div
        style={{
          position: "absolute",
          inset: "18px 26px 54px 26px",
          backgroundColor: "#121517",
          borderRadius: 14,
          border: "1px solid #282c31",
          boxShadow: "0 24px 70px rgba(0,0,0,0.85)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {/* Browser Top Window Bar */}
        <div
          style={{
            height: 38,
            backgroundColor: "#16191c",
            borderBottom: "1px solid #26292d",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            flexShrink: 0,
            zIndex: 30,
          }}
        >
          {/* Real URL Bar */}
          <div
            style={{
              padding: "3px 18px",
              borderRadius: 8,
              backgroundColor: "#101214",
              border: "1px solid #23262a",
              fontSize: 11,
              fontFamily: "ui-monospace, monospace",
              color: "#8b8d8f",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <span style={{ color: "#5cdb95", fontSize: 10 }}>🔒</span>
            <span>https://ember.ai/studio</span>
          </div>

          {/* Active Stage Indicator */}
          <div
            style={{
              fontSize: 10,
              fontFamily: "ui-monospace, monospace",
              fontWeight: 700,
              color: "#e6b784",
              letterSpacing: "0.06em",
            }}
          >
            {sceneBadge}
          </div>
        </div>

        {/* Viewport Displaying the Real Screenshots */}
        <div
          style={{
            flex: 1,
            position: "relative",
            backgroundColor: "#121517",
            overflow: "hidden",
          }}
        >
          {/* ================= SCENE 1: REAL STUDIO COMPOSER SCREENSHOT ================= */}
          {activeScene === 1 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#121517",
              }}
            >
              <Img
                src={staticFile("demo-assets/2-composer.png")}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top center",
                }}
              />

              {/* Dynamic typing overlay inside the composer textarea */}
              {typedText && (
                <div
                  style={{
                    position: "absolute",
                    left: "29.2%",
                    top: "37.2%",
                    width: "41.5%",
                    height: "6%",
                    backgroundColor: "#121517",
                    display: "flex",
                    alignItems: "center",
                    padding: "0 4px",
                    fontSize: 14,
                    color: "#f1eee7",
                    fontFamily: "ui-sans-serif, system-ui",
                    zIndex: 20,
                  }}
                >
                  <span>{typedText}</span>
                  {frame < 230 && (
                    <span
                      style={{
                        display: "inline-block",
                        width: 7,
                        height: 16,
                        backgroundColor: "#e6b784",
                        marginLeft: 3,
                      }}
                    />
                  )}
                </div>
              )}
            </div>
          )}

          {/* ================= SCENE 2: REAL AI DIRECTOR SCREENSHOT ================= */}
          {activeScene === 2 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#0d0f11",
              }}
            >
              <Img
                src={staticFile("demo-assets/3-director.png")}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "center",
                }}
              />

              {/* Dynamic percentage counter overlay on top of 6% in screenshot */}
              <div
                style={{
                  position: "absolute",
                  left: "37.5%",
                  top: "31.5%",
                  width: "8%",
                  height: "5%",
                  backgroundColor: "#171a1d",
                  display: "flex",
                  alignItems: "center",
                  fontSize: 22,
                  fontWeight: 800,
                  fontFamily: "monospace",
                  color: "#f1eee7",
                  zIndex: 20,
                }}
              >
                {Math.round(directorProgress)}%
              </div>

              {/* Dynamic progress bar overlay */}
              <div
                style={{
                  position: "absolute",
                  left: "37.5%",
                  top: "36.8%",
                  width: "25%",
                  height: "6px",
                  backgroundColor: "#202428",
                  borderRadius: 3,
                  overflow: "hidden",
                  zIndex: 20,
                }}
              >
                <div
                  style={{
                    height: "100%",
                    width: `${directorProgress}%`,
                    backgroundColor: "#e6b784",
                  }}
                />
              </div>
            </div>
          )}

          {/* ================= SCENE 3: REAL BLACKBOARD CANVAS OVERLAY ================= */}
          {activeScene === 3 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#121517",
              }}
            >
              {/* Actual 4-studio.png screenshot */}
              <Img
                src={staticFile("demo-assets/4-studio.png")}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top center",
                }}
              />

              {/* Live Canvas Blackboard Engine writing on top of player box */}
              <div
                style={{
                  position: "absolute",
                  left: "4.8%",
                  top: "10.4%",
                  width: "59.2%",
                  height: "53.6%",
                  borderRadius: 8,
                  overflow: "hidden",
                  backgroundColor: "#121517",
                  boxShadow: "inset 0 0 20px rgba(0,0,0,0.8)",
                  zIndex: 20,
                }}
              >
                <BlackboardCanvasView
                  currentTime={boardTime}
                  themeId="blackboard"
                />
              </div>
            </div>
          )}

          {/* ================= SCENE 4: REAL OFFICE HOURS ZOOM ================= */}
          {activeScene === 4 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#121517",
                overflow: "hidden",
              }}
            >
              {/* Zoomed and panned to focus on Office Hours on the right */}
              <div
                style={{
                  width: "100%",
                  height: "100%",
                  transform: `scale(${officeZoom}) translateX(${officePanX}%)`,
                  transformOrigin: "right center",
                  transition: "transform 0.1s ease-out",
                  position: "relative",
                }}
              >
                <Img
                  src={staticFile("demo-assets/4-studio.png")}
                  style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    objectPosition: "top center",
                  }}
                />

                {/* Animated Voice Waveform Badge on top of Voice Mode */}
                <div
                  style={{
                    position: "absolute",
                    right: "12%",
                    top: "17%",
                    backgroundColor: "rgba(22, 25, 28, 0.95)",
                    border: "1px solid rgba(230, 183, 132, 0.4)",
                    borderRadius: 8,
                    padding: "4px 10px",
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    zIndex: 25,
                  }}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "#5cdb95" }} />
                  <span style={{ fontSize: 9, fontWeight: 700, color: "#e6b784", fontFamily: "monospace" }}>
                    VOICE ACTIVE
                  </span>
                  <div style={{ display: "flex", alignItems: "center", gap: 2, marginLeft: 4 }}>
                    {[10, 18, 12, 22, 14, 20, 8].map((h, i) => (
                      <div
                        key={i}
                        style={{
                          width: 2,
                          height: h,
                          backgroundColor: "#e6b784",
                          borderRadius: 1,
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Realistic Human Cursor Overlay */}
          {cursor.visible && (
            <div
              style={{
                position: "absolute",
                left: `${(cursor.x / 1024) * 100}%`,
                top: `${(cursor.y / 575) * 100}%`,
                pointerEvents: "none",
                zIndex: 60,
                transform: cursor.click ? "scale(0.88)" : "scale(1)",
                transition: "transform 0.08s ease",
              }}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5.65376 12.3673H5.46026L5.31717 12.4976L0.500002 16.8829L0.500002 1.19841L11.7841 12.3673H5.65376Z"
                  fill="#f1eee7"
                  stroke="#16181a"
                  strokeWidth="1.5"
                />
              </svg>
            </div>
          )}
        </div>
      </div>

      {/* Synchronized Bottom Caption / Subtitle Banner */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 36,
          right: 36,
          height: 36,
          backgroundColor: "#15181b",
          border: "1px solid #262a2e",
          borderRadius: 10,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 18px",
          zIndex: 40,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, overflow: "hidden" }}>
          <span
            style={{
              padding: "2px 6px",
              borderRadius: 4,
              backgroundColor: "#202428",
              color: "#e6b784",
              fontSize: 9,
              fontWeight: 800,
              fontFamily: "monospace",
              textTransform: "uppercase",
              flexShrink: 0,
            }}
          >
            WALKTHROUGH
          </span>
          <span
            style={{
              fontSize: 12,
              color: "#f1eee7",
              fontWeight: 500,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {caption}
          </span>
        </div>

        <span style={{ fontSize: 11, fontFamily: "monospace", color: "#8b8d8f", flexShrink: 0, marginLeft: 14 }}>
          {timeFormatted}
        </span>
      </div>
    </AbsoluteFill>
  );
};
