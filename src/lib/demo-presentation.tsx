"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { SolveScript } from "./video/types";
import type { VideoJobStatus } from "./use-video-job";

/** Offline filming only. Normal routes have no provider and retain live behavior. */
export interface DemoPresentation {
  phase: "home" | "watch";
  question: string;
  script: SolveScript | null;
  boardTime: number;
  paused?: boolean;
  tab?: "chapters" | "refine";
  instruction?: string;
  messages?: { role: "user" | "ember"; content: string; mode?: "answer" | "edit"; time?: number; createdAt?: number }[];
  jobStatus?: VideoJobStatus;
  gallery?: { id: string; title: string; description?: string; publisher: string; upvotes: number; views: number; createdAt: number; script: SolveScript }[];
  search?: string;
}

const Context = createContext<DemoPresentation | null>(null);
export function DemoPresentationProvider({ value, children }: { value: DemoPresentation; children: ReactNode }) {
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export const useDemoPresentation = () => useContext(Context);
