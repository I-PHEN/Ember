"use client";

import React, { createContext, useContext, useState, useRef, useCallback } from "react";

export type CursorMode = "idle" | "moving" | "grabbing" | "selecting" | "hidden";

export interface BeatInfo {
  id: string;
  type: "DRAG_PHRASE" | "DRAG_BLOCK" | "SELECT_TEXT";
  progress: number; // 0 to 1
  cursorTarget: { x: number; y: number } | null;
  mode: CursorMode;
  active: boolean;
}

interface GhostCursorContextType {
  activeBeat: BeatInfo | null;
  registerBeat: (id: string, beat: Omit<BeatInfo, "id">) => void;
  updateBeat: (id: string, partial: Partial<Omit<BeatInfo, "id">>) => void;
  unregisterBeat: (id: string) => void;
  isEnabled: boolean;
}

const GhostCursorContext = createContext<GhostCursorContextType>({
  activeBeat: null,
  registerBeat: () => {},
  updateBeat: () => {},
  unregisterBeat: () => {},
  isEnabled: false,
});

export function GhostCursorProvider({ children }: { children: React.ReactNode }) {
  const [beats, setBeats] = useState<Record<string, BeatInfo>>({});
  const [isEnabled, setIsEnabled] = useState(false);

  // Check client capabilities: disable on touch, narrow screens, or reduced motion
  React.useEffect(() => {
    const checkSupport = () => {
      const isMobile = window.innerWidth < 768;
      const isTouch = window.matchMedia("(hover: none)").matches;
      const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      setIsEnabled(!isMobile && !isTouch && !prefersReducedMotion);
    };

    checkSupport();
    window.addEventListener("resize", checkSupport);
    return () => window.removeEventListener("resize", checkSupport);
  }, []);

  const registerBeat = useCallback((id: string, beat: Omit<BeatInfo, "id">) => {
    setBeats((prev) => ({ ...prev, [id]: { id, ...beat } }));
  }, []);

  const updateBeat = useCallback((id: string, partial: Partial<Omit<BeatInfo, "id">>) => {
    setBeats((prev) => {
      if (!prev[id]) return prev;
      return {
        ...prev,
        [id]: { ...prev[id], ...partial },
      };
    });
  }, []);

  const unregisterBeat = useCallback((id: string) => {
    setBeats((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }, []);

  // Find current active beat
  const activeBeat = Object.values(beats).find((b) => b.active) || null;

  return (
    <GhostCursorContext.Provider
      value={{
        activeBeat,
        registerBeat,
        updateBeat,
        unregisterBeat,
        isEnabled,
      }}
    >
      {children}
    </GhostCursorContext.Provider>
  );
}

export function useGhostCursor() {
  return useContext(GhostCursorContext);
}
