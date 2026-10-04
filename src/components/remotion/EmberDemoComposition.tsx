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

  // ================= SCENE BREAKDOWN (64s / 1920 frames) =================
  // Scene 1: 0 - 300 (0:00 - 0:10) · Real Community Gallery
  // Scene 2: 300 - 660 (0:10 - 0:22) · Real Studio Composer & Problem Entry
  // Scene 3: 660 - 1020 (0:22 - 0:34) · Real AI Director (GenerateOverlay)
  // Scene 4: 1020 - 1500 (0:34 - 0:50) · Real Blackboard Engine & Roadmap
  // Scene 5: 1500 - 1740 (0:50 - 0:58) · Real Office Hours Interactive Chat
  // Scene 6: 1740 - 1920 (0:58 - 1:04) · Real App Launch Outro

  let activeScene = 1;
  let sceneBadge = "01 · COMMUNITY GALLERY";
  let caption =
    "The Library of Thought: Search and explore peer-reviewed university STEM lectures.";

  if (frame >= 1740) {
    activeScene = 6;
    sceneBadge = "06 · LAUNCH STUDIO";
    caption =
      "Ember: Every problem, a lesson. Built for student and university problem solving.";
  } else if (frame >= 1500) {
    activeScene = 5;
    sceneBadge = "05 · OFFICE HOURS INTERACTIVE CHAT";
    caption =
      "Office Hours: Clarify any derivation step with Professor Ember in real-time LaTeX & Voice Mode.";
  } else if (frame >= 1020) {
    activeScene = 4;
    sceneBadge = "04 · SYNCHRONOUS BLACKBOARD & ROADMAP";
    caption =
      "Live blackboard player: marker pen hand-writes derivations with teacher pacing and chapter roadmap.";
  } else if (frame >= 660) {
    activeScene = 3;
    sceneBadge = "03 · AI PEDAGOGICAL DIRECTOR";
    caption =
      "AI Director shapes the pedagogical arc, checks mathematical consistency, and synthesizes chalk coordinates.";
  } else if (frame >= 300) {
    activeScene = 2;
    sceneBadge = "02 · STUDIO COMPOSER";
    caption =
      "Interactive Blackboard Studio: Paste any calculus, physics, or engineering problem.";
  }

  // Realistic human cursor with smooth ease-in-out movement
  const getCursor = () => {
    // Scene 1 (0 to 300): Cursor moves to "Create Solve" button at top right (915, 36) in 1024-space
    if (frame < 300) {
      if (frame < 80) return { x: 500, y: 350, click: false, visible: true };
      const p = Math.min(1, Math.max(0, (frame - 80) / 32));
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      const x = 500 + (915 - 500) * ease;
      const y = 350 + (36 - 350) * ease;
      const click = frame >= 220 && frame <= 250;
      return { x, y, click, visible: true };
    }
    // Scene 2 (300 to 660): Cursor moves to prompt pill at (575, 515), clicks at 410, then moves to "Start lesson" at (675, 455), clicks at 580
    if (frame < 660) {
      if (frame < 350) return { x: 915, y: 36, click: false, visible: true };
      if (frame < 460) {
        const p = Math.min(1, Math.max(0, (frame - 350) / 30));
        const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
        const x = 915 + (575 - 915) * ease;
        const y = 36 + (515 - 36) * ease;
        const click = frame >= 405 && frame <= 430;
        return { x, y, click, visible: true };
      }
      if (frame < 520) return { x: 575, y: 515, click: false, visible: true };
      const p = Math.min(1, Math.max(0, (frame - 520) / 28));
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      const x = 575 + (675 - 575) * ease;
      const y = 515 + (455 - 515) * ease;
      const click = frame >= 575 && frame <= 605;
      return { x, y, click, visible: true };
    }
    // Scene 3: Generating overlay (cursor hidden)
    if (frame < 1020) {
      return { x: -100, y: -100, click: false, visible: false };
    }
    // Scene 4 to 5 (1450 to 1540): Cursor moves to prompt chips in Office Hours (750, 498)
    if (frame < 1740) {
      if (frame < 1470) return { x: -100, y: -100, click: false, visible: false };
      const p = Math.min(1, Math.max(0, (frame - 1470) / 26));
      const ease = p < 0.5 ? 2 * p * p : -1 + (4 - 2 * p) * p;
      const x = 500 + (750 - 500) * ease;
      const y = 250 + (498 - 250) * ease;
      const click = frame >= 1515 && frame <= 1540;
      return { x, y, click, visible: true };
    }
    return { x: -100, y: -100, click: false, visible: false };
  };

  const cursor = getCursor();

  // Rapid typing in Scene 2
  const fullPrompt =
    "Evaluate the indefinite integral ∫ x · e^(2x) dx using integration by parts.";
  const typeCount =
    frame < 420
      ? 0
      : Math.min(
          fullPrompt.length,
          Math.floor(
            interpolate(frame, [420, 480], [0, fullPrompt.length], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          )
        );
  const typedText = fullPrompt.slice(0, typeCount);

  // Director Progress in Scene 3 (6% -> 100%)
  const directorProgress = interpolate(frame, [670, 990], [6, 100], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Fast, energetic chalk derivation in Scene 4 (16 seconds advancing 52 seconds of chalk work)
  const boardTime = interpolate(frame, [1020, 1500], [0, 52], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Camera scale and pan in Scene 5 (smooth zoom into Office Hours on right)
  const officeZoom = interpolate(frame, [1490, 1550], [1, 1.32], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const officePanX = interpolate(frame, [1490, 1550], [0, -14], {
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
          {/* Traffic Lights */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ff5f56" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#ffbd2e" }} />
            <div style={{ width: 10, height: 10, borderRadius: "50%", backgroundColor: "#27c93f" }} />
          </div>

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
            <span>
              {activeScene === 1 ? "https://ember.ai/gallery" : "https://ember.ai/studio"}
            </span>
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
          {/* ================= SCENE 1: REAL COMMUNITY GALLERY SCREENSHOT ================= */}
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
                src={staticFile("demo-assets/1-gallery.png")}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  objectPosition: "top center",
                }}
              />
            </div>
          )}

          {/* ================= SCENE 2: REAL STUDIO COMPOSER SCREENSHOT ================= */}
          {activeScene === 2 && (
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
                  {frame < 490 && (
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

          {/* ================= SCENE 3: REAL AI DIRECTOR SCREENSHOT ================= */}
          {activeScene === 3 && (
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

          {/* ================= SCENE 4: REAL BLACKBOARD CANVAS OVERLAY ================= */}
          {activeScene === 4 && (
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

          {/* ================= SCENE 5: REAL OFFICE HOURS ZOOM ================= */}
          {activeScene === 5 && (
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

          {/* ================= SCENE 6: CLEAN HACKATHON OUTRO ================= */}
          {activeScene === 6 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: "#101315",
                textAlign: "center",
                padding: "40px",
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  padding: "4px 14px",
                  borderRadius: 20,
                  backgroundColor: "#1c2024",
                  border: "1px solid #2a2e33",
                  fontSize: 11,
                  fontWeight: 700,
                  color: "#e6b784",
                  letterSpacing: "0.1em",
                  marginBottom: 14,
                }}
              >
                EMBER · BLACKBOARD AI ENGINE
              </div>

              <h1
                style={{
                  fontSize: 48,
                  fontWeight: 900,
                  color: "#f1eee7",
                  margin: "0 0 10px 0",
                  letterSpacing: "-0.03em",
                }}
              >
                EMBER
              </h1>

              <p
                style={{
                  fontSize: 18,
                  color: "#e6b784",
                  fontWeight: 500,
                  margin: "0 0 28px 0",
                  maxWidth: 520,
                }}
              >
                Every problem, a lesson.
              </p>

              <div style={{ display: "flex", gap: 14, marginBottom: 26 }}>
                <div style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #282c31", backgroundColor: "#16191c", textAlign: "left" }}>
                  <div style={{ fontSize: 9, color: "#e6b784", fontWeight: 700 }}>CALCULUS</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#f1eee7", marginTop: 2 }}>Integration by Parts</div>
                  <div style={{ fontSize: 10, color: "#8b8d8f", marginTop: 2 }}>9:29 · Saved</div>
                </div>

                <div style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #282c31", backgroundColor: "#16191c", textAlign: "left" }}>
                  <div style={{ fontSize: 9, color: "#5cdb95", fontWeight: 700 }}>PHYSICS</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#f1eee7", marginTop: 2 }}>5 kg Block on Incline</div>
                  <div style={{ fontSize: 10, color: "#8b8d8f", marginTop: 2 }}>3:15 · Saved</div>
                </div>

                <div style={{ padding: "10px 18px", borderRadius: 10, border: "1px solid #282c31", backgroundColor: "#16191c", textAlign: "left" }}>
                  <div style={{ fontSize: 9, color: "#7ec8e3", fontWeight: 700 }}>MATH</div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: "#f1eee7", marginTop: 2 }}>Euler&apos;s Identity Proof</div>
                  <div style={{ fontSize: 10, color: "#8b8d8f", marginTop: 2 }}>1:50 · Saved</div>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12 }}>
                <div
                  style={{
                    padding: "10px 24px",
                    borderRadius: 10,
                    backgroundColor: "#e6b784",
                    color: "#16181a",
                    fontSize: 13,
                    fontWeight: 700,
                  }}
                >
                  Open Blackboard Studio →
                </div>
                <div
                  style={{
                    padding: "10px 24px",
                    borderRadius: 10,
                    backgroundColor: "#181b1e",
                    border: "1px solid #2a2e33",
                    color: "#f1eee7",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  Explore Community Gallery
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
