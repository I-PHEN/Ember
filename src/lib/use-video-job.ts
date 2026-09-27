"use client";

/* ------------------------------------------------------------------
   useVideoJob — the client half of the multi-agent video studio.

   Owns ONE poll loop (1 Hz) against GET /api/video/jobs/[id] and the
   "leave and come back later" contract:

   - start(question)  creates a job, remembers it in localStorage and
                       opens the waiting overlay
   - leave()           closes the overlay but KEEPS polling + storage —
                       the home page shows a live resume card
   - reload / revisit  boot resumes polling from localStorage
   - the moment the crew merges the storyboard, onScript fires once
                       (persist + watch), while polling continues until
                       every voice has landed
------------------------------------------------------------------- */

import { useCallback, useEffect, useRef, useState } from "react";
import type { SolveScript } from "./video/types";

export type VideoJobPhase =
  | "directing"
  | "scripting"
  | "boarding"
  | "voicing"
  | "ready"
  | "error";

export interface VideoJobStatus {
  id: string;
  phase: VideoJobPhase;
  question: string;
  title: string | null;
  createdAt: number;
  scenesTotal: number;
  scenesDone: number;
  voicesTotal: number;
  voicesDone: number;
  etaWatchMs: number;
  etaVoiceMs: number;
  script: SolveScript | null;
  error: string | null;
  /** client-added: local time the snapshot arrived (for smooth countdowns) */
  at: number;
}

const ACTIVE_JOB_KEY = "chalkcast.activeJob";
const LEGACY_JOB_KEY = "livetutor.activeJob";
const POLL_MS = 1000;
const MAX_NET_FAILURES = 8;

interface ActiveJob {
  id: string;
  question: string;
}

function readActiveJob(): ActiveJob | null {
  try {
    let raw = window.localStorage.getItem(ACTIVE_JOB_KEY);
    if (!raw) {
      /* rebrand migration: pick up a job started before the rename */
      raw = window.localStorage.getItem(LEGACY_JOB_KEY);
      if (raw) {
        window.localStorage.setItem(ACTIVE_JOB_KEY, raw);
        window.localStorage.removeItem(LEGACY_JOB_KEY);
      }
    }
    if (!raw) return null;
    const aj = JSON.parse(raw) as ActiveJob;
    if (aj && typeof aj.id === "string" && typeof aj.question === "string") {
      return aj;
    }
  } catch {
    /* ignore */
  }
  return null;
}

function writeActiveJob(job: ActiveJob | null): void {
  try {
    if (job) window.localStorage.setItem(ACTIVE_JOB_KEY, JSON.stringify(job));
    else window.localStorage.removeItem(ACTIVE_JOB_KEY);
  } catch {
    /* ignore */
  }
}

export function clearStoredJob(): void {
  writeActiveJob(null);
}

export function useVideoJob(
  onScript: (
    script: SolveScript,
    opts: { autoWatch: boolean; jobId: string }
  ) => void
) {
  const [status, setStatus] = useState<VideoJobStatus | null>(null);
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [formError, setFormError] = useState("");

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const inflightRef = useRef(false);
  const failsRef = useRef(0);
  const jobIdRef = useRef<string | null>(null);
  const questionRef = useRef("");
  const deliveredRef = useRef(false);
  const overlayOpenRef = useRef(false);
  const onScriptRef = useRef(onScript);

  useEffect(() => {
    onScriptRef.current = onScript;
  }, [onScript]);
  useEffect(() => {
    overlayOpenRef.current = overlayOpen;
  }, [overlayOpen]);

  const stopPolling = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    inflightRef.current = false;
  }, []);

  const finishIfDone = useCallback(
    (s: VideoJobStatus) => {
      if (s.phase === "ready" || s.phase === "error") stopPolling();
    },
    [stopPolling]
  );

  const absorb = useCallback((s: VideoJobStatus) => {
    failsRef.current = 0;
    const snap: VideoJobStatus = { ...s, at: Date.now() };
    setStatus(snap);
    if (snap.script && !deliveredRef.current) {
      deliveredRef.current = true;
      writeActiveJob(null); // the script is in the client now — safe
      onScriptRef.current(snap.script, {
        autoWatch: overlayOpenRef.current,
        jobId: snap.id,
      });
    }
    finishIfDone(snap);
  }, [finishIfDone]);

  const pollOnce = useCallback(
    async (id: string) => {
      if (inflightRef.current) return;
      inflightRef.current = true;
      try {
        const r = await fetch(`/api/video/jobs/${id}`, { cache: "no-store" });
        if (r.status === 404) {
          // job expired (server restarted or >35 min) — surface it
          stopPolling();
          writeActiveJob(null);
          setStatus({
            id,
            phase: "error",
            question: questionRef.current,
            title: null,
            createdAt: 0,
            scenesTotal: 0,
            scenesDone: 0,
            voicesTotal: 0,
            voicesDone: 0,
            etaWatchMs: 0,
            etaVoiceMs: 0,
            script: null,
            error:
              "This video expired — finished videos are kept in your history, unfinished jobs for about 35 minutes.",
            at: Date.now(),
          });
          return;
        }
        if (!r.ok) throw new Error(`job poll ${r.status}`);
        const data = (await r.json()) as Omit<VideoJobStatus, "at">;
        absorb({ ...data, at: Date.now() });
      } catch {
        failsRef.current += 1;
        if (failsRef.current >= MAX_NET_FAILURES) {
          stopPolling();
          setStatus((prev) =>
            prev
              ? { ...prev, phase: "error", error: "Lost connection to the video studio." }
              : null
          );
        }
      } finally {
        inflightRef.current = false;
      }
    },
    [absorb, stopPolling]
  );

  const beginPolling = useCallback(
    (id: string) => {
      stopPolling();
      jobIdRef.current = id;
      deliveredRef.current = false;
      void pollOnce(id);
      timerRef.current = setInterval(() => {
        const cur = jobIdRef.current;
        if (cur) void pollOnce(cur);
      }, POLL_MS);
    },
    [pollOnce, stopPolling]
  );

  /** kick off a fresh generation (from the form) */
  const start = useCallback(
    async (question: string) => {
      const text = question.trim();
      if (!text) return;
      setFormError("");
      try {
        const res = await fetch("/api/video/jobs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: text }),
        });
        const data = (await res.json().catch(() => null)) as
          | { jobId?: string; error?: string }
          | null;
        if (!res.ok || !data?.jobId) {
          throw new Error(data?.error || "The tutor couldn't start that one.");
        }
        writeActiveJob({ id: data.jobId, question: text });
        questionRef.current = text;
        setStatus(null);
        setOverlayOpen(true);
        beginPolling(data.jobId);
      } catch (e) {
        setFormError(e instanceof Error ? e.message : "Something went wrong.");
      }
    },
    [beginPolling]
  );

  /** boot-time resume (localStorage) — returns true if a job was found */
  const resumeFromStorage = useCallback((): boolean => {
    const aj = readActiveJob();
    if (!aj) return false;
    questionRef.current = aj.question;
    setOverlayOpen(false);
    beginPolling(aj.id);
    return true;
  }, [beginPolling]);

  /** user chose "come back later" — keep polling, keep storage */
  const leave = useCallback(() => setOverlayOpen(false), []);

  /** open the waiting overlay again (resume card → watch progress) */
  const reopen = useCallback(() => setOverlayOpen(true), []);

  /** full clear — dismiss a finished/error card */
  const clear = useCallback(() => {
    stopPolling();
    jobIdRef.current = null;
    writeActiveJob(null);
    setStatus(null);
    setOverlayOpen(false);
    setFormError("");
  }, [stopPolling]);

  /* unmount: stop the timer (state cleanup is React's job) */
  useEffect(() => stopPolling, [stopPolling]);

  const busy =
    !!status &&
    (status.phase === "directing" || status.phase === "scripting" ||
      status.phase === "boarding" ||
      (status.phase === "voicing" && !status.script));

  return {
    status,
    overlayOpen,
    formError,
    busy,
    start,
    leave,
    reopen,
    clear,
    resumeFromStorage,
    setFormError,
  };
}
