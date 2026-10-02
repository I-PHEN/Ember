"use client";

/* ------------------------------------------------------------------
   Ember — Professional Whiteboard Educational Platform
   Taught by Professor Ada.
------------------------------------------------------------------- */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  AlertTriangle,
  X,
  Play,
  Clapperboard,
  History as HistoryIcon,
  Trash2,
  Paperclip,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import Wordmark from "@/components/Wordmark";
import ChalkAvatar from "@/components/ChalkAvatar";
import { BRAND } from "@/lib/brand";
import SolvePlayer, {
  type SolvePlayerHandle,
} from "@/components/player/SolvePlayer";
import GenerateOverlay from "@/components/GenerateOverlay";
import ResumeCard from "@/components/ResumeCard";
import { SAMPLE_LESSONS } from "@/lib/samples";
import { useVideoJob } from "@/lib/use-video-job";
import { defaultTheme, saveTheme } from "@/lib/solve-schema";
import { compileTimeline } from "@/lib/video/compile";
import { renderToImage } from "@/lib/video/render";
import { thumbnailTime } from "@/lib/video/thumbnail";
import { THEMES, totalDuration } from "@/lib/video/types";
import type { BoardThemeId, SolveScript } from "@/lib/video/types";
import { cn } from "@/lib/utils";

type Phase = "home" | "watch";

export interface HistoryItem {
  id: string;
  title: string;
  subject?: string;
  question: string;
  script: SolveScript;
  createdAt: number;
  thumb?: string;
}

const HISTORY_KEY = "ember.videos";
const LEGACY_HISTORY_KEY = "chalkcast.videos";
const HISTORY_MAX = 12;

const CURATED_PILLS = [
  "A 5 kg block on a 30° incline with friction",
  "Evaluate ∫ x · e^(2x) dx using integration by parts",
  "Why does e^(iπ) + 1 = 0? (Euler's identity)",
];

function loadHistory(): HistoryItem[] {
  try {
    let raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      raw = window.localStorage.getItem(LEGACY_HISTORY_KEY);
      if (raw) {
        window.localStorage.setItem(HISTORY_KEY, raw);
        window.localStorage.removeItem(LEGACY_HISTORY_KEY);
      }
    }
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr)
      ? arr
          .filter((e) => e && e.script?.scenes?.length)
          .map((entry) => ({
            ...entry,
            script: {
              ...entry.script,
              scenes: entry.script.scenes.filter((scene: SolveScript["scenes"][number]) => !scene.intro),
            },
          }))
      : [];
  } catch {
    return [];
  }
}

function saveHistory(list: HistoryItem[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    try {
      window.localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify(list.map(({ thumb: _t, ...e }) => e))
      );
    } catch {
      /* ignore */
    }
  }
}

function fmtDate(ts: number): string {
  return new Date(ts).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export default function Page() {
  const [phase, setPhase] = useState<Phase>("home");
  const [script, setScript] = useState<SolveScript | null>(null);
  const [themeId, setThemeId] = useState<BoardThemeId>("blackboard");
  const [question, setQuestion] = useState("");
  const [attachedImage, setAttachedImage] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [sampleThumbs, setSampleThumbs] = useState<Record<string, string>>({});
  const [sampleDurs, setSampleDurs] = useState<Record<string, string>>({});
  const [seekReq, setSeekReq] = useState<{ t: number; n: number } | null>(null);
  const seekNonce = useRef(0);
  const playerRef = useRef<SolvePlayerHandle>(null);
  const [voiceVer, setVoiceVer] = useState(0);
  const planQuestionRef = useRef("");
  const [watchedJobId, setWatchedJobId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setThemeId(defaultTheme());
    setHistory(loadHistory());
  }, []);

  // Render content-specific thumbnails after the lesson board has settled.
  useEffect(() => {
    const thumbs: Record<string, string> = {};
    const durs: Record<string, string> = {};
    for (const item of SAMPLE_LESSONS) {
      try {
        const tl = compileTimeline(item);
        const dur = totalDuration(tl);
        durs[item.title] = fmtDur(dur);
        const t = thumbnailTime(tl);
        thumbs[item.title] = renderToImage(tl, THEMES.blackboard, t, 440);
      } catch {
        durs[item.title] = "3:20";
      }
    }
    setSampleThumbs(thumbs);
    setSampleDurs(durs);

    setHistory((entries) => {
      const refreshed = entries.map((entry) => {
        try {
          const tl = compileTimeline(entry.script);
          return {
            ...entry,
            thumb: renderToImage(tl, THEMES.blackboard, thumbnailTime(tl), 420),
          };
        } catch {
          return entry;
        }
      });
      saveHistory(refreshed);
      return refreshed;
    });
  }, [themeId]);

  const changeTheme = useCallback((t: BoardThemeId) => {
    setThemeId(t);
    saveTheme(t);
  }, []);

  /* ------------------------ watch helpers ------------------------ */

  const watch = useCallback((sc: SolveScript) => {
    setScript(sc);
    setPhase("watch");
    setSeekReq(null);
    setVoiceVer(0);
  }, []);

  const persist = useCallback(
    (sc: SolveScript) => {
      let thumb: string | undefined;
      try {
        const tl = compileTimeline(sc);
        const t = thumbnailTime(tl);
        thumb = renderToImage(tl, THEMES.blackboard, t, 420);
      } catch {
        thumb = undefined;
      }
      const entry: HistoryItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        title: sc.title,
        subject: sc.subject,
        question: sc.question,
        script: sc,
        createdAt: Date.now(),
        thumb,
      };
      setHistory((h) => {
        const next = [entry, ...h].slice(0, HISTORY_MAX);
        saveHistory(next);
        return next;
      });
    },
    [themeId]
  );

  /* ------------------- the multi-agent studio ------------------- */

  const handleScript = useCallback(
    (sc: SolveScript, { autoWatch, jobId }: { autoWatch: boolean; jobId: string }) => {
      persist(sc);
      if (autoWatch) {
        setWatchedJobId(jobId);
        watch(sc);
      }
    },
    [persist, watch]
  );

  const job = useVideoJob(handleScript);
  const {
    status: jobStatus,
    overlayOpen,
    formError,
    busy: jobBusy,
    start: startJob,
    leave: leaveJob,
    reopen: reopenJob,
    clear: clearJob,
    resumeFromStorage,
  } = job;

  const generate = useCallback(
    (q: string) => {
      const text = q.trim();
      if (!text || jobBusy) return;
      planQuestionRef.current = text;
      setWatchedJobId(null);
      void startJob(text);
    },
    [jobBusy, startJob]
  );

  const watchReady = useCallback(() => {
    if (jobStatus?.script) {
      setWatchedJobId(jobStatus.id);
      watch(jobStatus.script);
    }
  }, [jobStatus, watch]);

  useEffect(() => {
    resumeFromStorage();
  }, [resumeFromStorage]);

  const deleteEntry = useCallback((id: string) => {
    setHistory((h) => {
      const next = h.filter((e) => e.id !== id);
      saveHistory(next);
      return next;
    });
  }, []);

  const chapterTimes = useMemo(() => {
    if (phase !== "watch" || !script) return [] as { t: number; label: string }[];
    const tl = compileTimeline(script);
    let acc = 0;
    const out: { t: number; label: string }[] = [];
    for (const s of tl.scenes) {
      const at = acc;
      acc += s.dur;
      if (!s.intro) out.push({ t: at, label: s.chapter });
    }
    return out;
  }, [phase, script, voiceVer]);

  const goChapter = useCallback((t: number) => {
    seekNonce.current += 1;
    setSeekReq({ t: t + 0.01, n: seekNonce.current });
  }, []);

  const handleImageUpload = (file: File) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedImage(reader.result as string);
      if (!question.trim()) {
        setQuestion(`[Image: ${file.name}] Please solve the problem shown in this image.`);
      }
    };
    reader.readAsDataURL(file);
  };

  /* ============================ WATCH ============================ */

  if (phase === "watch" && script) {
    return (
      <main className="ember-watch flex min-h-dvh flex-col">
        <header className="ember-watch-header sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b px-4 backdrop-blur-xl sm:px-8">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setPhase("home");
                setScript(null);
              }}
              className="gap-1.5 text-muted-foreground hover:bg-[#23262a] hover:text-[#f1eee7]"
            >
              <X className="h-4 w-4" />
              Back
            </Button>
            <Wordmark />
          </div>

          <Button
            size="sm"
            onClick={() => setPhase("home")}
            className="rounded-xl bg-[#e6b784] font-semibold text-[#191816] hover:bg-[#f2ca9e]"
          >
            <Clapperboard className="h-4 w-4" />
            New solve
          </Button>
        </header>

        {/* Side-by-Side Watch Stage: Player on Left, Chapters on Right */}
        <section className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_340px] items-start">
            {/* Left: Video Player + Details */}
            <div className="space-y-5">
              <SolvePlayer
                ref={playerRef}
                script={script}
                themeId={themeId}
                onThemeChange={changeTheme}
                autoPlay
                seekRequest={seekReq}
                onVoiced={() => setVoiceVer((v) => v + 1)}
              />

              {/* Title & Professor Details */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-[#f1eee7] sm:text-3xl">
                    {script.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#a4a5a7]">
                    {script.subject && (
                      <span className="rounded-md border border-[#e6b784]/30 bg-[#e6b784]/10 px-2.5 py-0.5 font-medium text-[#e6b784]">
                        {script.subject}
                      </span>
                    )}
                    <span>Taught by Professor Ember</span>
                  </div>
                </div>

                {/* the professor, drawn the way she'd draw herself */}
                <div className="flex items-center gap-4 rounded-2xl border border-[#34383c] bg-[#171b1d] p-4">
                  <ChalkAvatar size={56} className="shrink-0" />
                  <div>
                    <div className="text-sm font-semibold text-[#f1eee7]">
                      {BRAND.professor.name}
                    </div>
                    <div className="mt-0.5 text-xs leading-relaxed text-[#a4a5a7]">
                      {BRAND.professor.blurb}
                    </div>
                  </div>
                </div>

                {/* Problem Statement Card */}
                <div className="rounded-2xl border border-[#34383c] bg-[#171b1d] p-4 text-sm leading-relaxed text-[#f1eee7]/90">
                  <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-[#e6b784]">
                    Problem statement
                  </div>
                  <p className="whitespace-pre-wrap">{script.question}</p>
                </div>
              </div>
            </div>

            {/* Right: Sticky Chapters Column Side-by-Side with Video */}
            <div className="sticky top-24 rounded-2xl border border-[#34383c] bg-[#171b1d] p-4">
              <div className="mb-3 flex items-center justify-between border-b border-[#2b2f33] pb-3">
                <span className="text-sm font-medium text-[#f1eee7]">Chapters</span>
                <span className="font-mono text-xs text-[#8b8d8f]">{chapterTimes.length} scenes</span>
              </div>
              <ol className="board-scroll max-h-[580px] space-y-1 overflow-y-auto pr-1">
                {chapterTimes.map((c, i) => (
                  <li key={i}>
                    <button
                      onClick={() => goChapter(c.t)}
                      className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-xs text-[#a4a5a7] transition-colors hover:bg-[#23262a] hover:text-[#f1eee7]"
                    >
                      <span className="font-mono tabular-nums text-[#e6b784]">
                        {fmtDur(c.t)}
                      </span>
                      <span className="min-w-0 flex-1 truncate font-medium group-hover:text-[#f1eee7]">
                        {c.label}
                      </span>
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* ============================ HOME ============================= */

  return (
    <main className="ember-home flex min-h-dvh flex-col">
      {/* Top Header (Clean, circles removed) */}
      <header className="ember-home-header sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between border-b px-6 backdrop-blur-xl sm:px-12">
        <Wordmark />
        <a href="#lessons" className="text-sm text-muted-foreground transition-colors hover:text-white">Explore lessons ↗</a>
      </header>

      {/* running/finished job — floats under the header; NEVER pushes the page */}
      {jobStatus && !overlayOpen && jobStatus.id !== watchedJobId && jobStatus.phase !== "error" && (
        <div className="fixed left-1/2 top-24 z-40 w-[min(92vw,600px)] -translate-x-1/2 px-4">
          <ResumeCard
            status={jobStatus}
            onWatch={watchReady}
            onReopen={reopenJob}
            onDismiss={clearJob}
          />
        </div>
      )}

      {/* Hero & Minimalist Chat Input */}
      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center justify-center px-5 py-16 sm:px-6">
        <div className="ember-hero-copy text-center">
          <p className="ember-eyebrow">read → given → ask → solve</p>
          <h1 className="text-5xl sm:text-7xl">
            Every problem,
            <br />
            <span className="font-hand font-semibold text-[#e6b784]">a lesson.</span>
          </h1>
          <p className="mt-5 text-base sm:text-lg">
            Paste any problem. Ember plans it like a lecture, hand-writes the
            board, and teaches it — a real, seekable video.
          </p>
        </div>

        {/* Sleek Dark Chat Box */}
        <div className="mt-11 w-full max-w-[760px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generate(question);
            }}
            className="ember-prompt group relative rounded-2xl border p-3 transition-all duration-200 sm:p-4"
          >
            <Textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  generate(question);
                }
              }}
              rows={3}
              placeholder="Paste any math, physics, chemistry or engineering problem…"
              aria-label="Your question"
              className="min-h-[90px] resize-none border-0 bg-transparent px-2 py-2 font-sans text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground/40 focus-visible:ring-0 sm:text-base"
            />

            {/* Attached Image Preview */}
            {attachedImage && (
              <div className="mt-2 mb-3 flex items-center gap-3 rounded-xl border border-[#34383c] bg-[#1a1d20] p-2 pr-3">
                <img
                  src={attachedImage}
                  alt="Attachment"
                  className="h-10 w-10 rounded-lg object-cover border border-white/10"
                />
                <span className="text-xs text-foreground/90 font-medium">Image attached</span>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="ml-auto rounded-lg p-1 text-muted-foreground hover:bg-white/10 hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}

            {/* Inner Bottom Controls */}
            <div className="flex items-center justify-between border-t border-white/5 pt-3 px-1">
              <div className="flex items-center gap-2">
                <label className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl border border-white/10 bg-white/[0.03] text-muted-foreground transition hover:border-white/20 hover:bg-white/[0.08] hover:text-foreground">
                  <Paperclip className="h-4 w-4" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleImageUpload(f);
                    }}
                  />
                </label>

                {question.trim() && (
                  <button
                    type="button"
                    onClick={() => {
                      setQuestion("");
                      setAttachedImage(null);
                    }}
                    className="rounded-xl px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <span className="font-mono text-xs text-muted-foreground/60">
                  {question.length}/600
                </span>
                <Button
                  type="submit"
                  disabled={!question.trim() || jobBusy || question.length > 600}
                  className="h-10 rounded-lg bg-[#e6b784] px-5 text-sm font-semibold text-[#191816] transition-all hover:bg-[#f2ca9e] active:scale-95 disabled:opacity-40"
                >
                  Start lesson
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          </form>

          {/* Quick Prompt Pills */}
          <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
            {CURATED_PILLS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setQuestion(p)}
                disabled={jobBusy}
                className="max-w-full truncate rounded-full border border-[#34383c] bg-[#1a1d20] px-3.5 py-1.5 text-xs text-[#a4a5a7] transition-all hover:border-[#4a4e53] hover:bg-[#202326] hover:text-[#f1eee7] disabled:opacity-50"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Proof strip: what she teaches, and what this is */}
        <div className="mt-12 flex flex-col items-center gap-3 text-center">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#8b8d8f]">
            Calculus · Mechanics · ODEs · Circuits · Thermo
          </p>
          <p className="text-[15px] font-medium text-[#f1eee7]">
            Not an answer. <span className="text-[#e6b784]">A lesson.</span>
          </p>
        </div>

        {/* YouTube-Style Sample Videos Below */}
        {SAMPLE_LESSONS.length > 0 && (
          <div id="lessons" className="mt-12 w-full scroll-mt-24">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Sparkles className="h-4 w-4 text-[#e6b784]" />
                A good place to start
              </div>
            </div>

            <div className={cn("grid grid-cols-1 gap-5 w-full", SAMPLE_LESSONS.length === 1 ? "max-w-[500px] mx-auto" : "sm:grid-cols-3")}>
              {SAMPLE_LESSONS.map((item) => {
                const thumbUrl = sampleThumbs[item.title];
                const durText = sampleDurs[item.title] || "3:00";
                return (
                  <div
                    key={item.title}
                    className="ember-lesson-card group relative cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Watch ${item.title}`}
                    onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); watch(item); } }}
                    onClick={() => watch(item)}
                  >
                    {/* YouTube-style 16:9 Thumbnail Box */}
                    <div className="relative aspect-video w-full overflow-hidden rounded-[7px] bg-black">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-950">
                          <Play className="h-8 w-8 text-white/30" />
                        </div>
                      )}

                      {/* Play Hover Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                        <span className="scale-75 rounded-full bg-[#e6b784] p-3 text-[#191816] transition-transform duration-200 group-hover:scale-100">
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        </span>
                      </div>

                      {/* YouTube-Style Duration Badge (Bottom-Right, NO chapters) */}
                      <div className="absolute bottom-2 right-2 rounded-md bg-black/85 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#f1eee7]">
                        {durText}
                      </div>
                    </div>

                    {/* YouTube-Style Short Title & Subtext */}
                    <div className="mt-3 px-0.5">
                      <h3 className="line-clamp-1 text-sm font-medium text-foreground group-hover:text-[#e6b784] transition-colors">
                        {item.title}
                      </h3>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {item.subject ? `${item.subject} · ` : ""}Ember
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Saved Library (Only if history exists) */}
        {history.length > 0 && (
          <div className="mt-14 w-full space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <HistoryIcon className="h-4 w-4 text-[#e6b784]" />
                Your Solves
                <span className="font-mono text-xs text-muted-foreground">({history.length})</span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  saveHistory([]);
                }}
                className="text-xs text-muted-foreground hover:text-[#ff6b6b] transition-colors"
              >
                Clear all
              </button>
            </div>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
              {history.map((e) => (
                <div
                  key={e.id}
                  className="ember-lesson-card group relative cursor-pointer"
                  role="button"
                  tabIndex={0}
                  aria-label={`Watch ${e.title}`}
                  onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); watch(e.script); } }}
                  onClick={() => watch(e.script)}
                >
                  <div className="relative aspect-video w-full overflow-hidden rounded-[7px] bg-black">
                    {e.thumb ? (
                      <img
                        src={e.thumb}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-zinc-950">
                        <Play className="h-8 w-8 text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                      <span className="scale-75 rounded-full bg-[#e6b784] p-3 text-[#191816] opacity-0 transition-transform duration-200 group-hover:scale-100 group-hover:opacity-100">
                        <Play className="h-5 w-5 fill-current ml-0.5" />
                      </span>
                    </div>
                  </div>

                  <div className="mt-3 flex items-start justify-between px-0.5">
                    <div className="min-w-0 flex-1">
                      <h3 className="line-clamp-1 text-sm font-medium text-foreground group-hover:text-[#e6b784] transition-colors">
                        {e.title}
                      </h3>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {e.subject ? `${e.subject} · ` : ""}{fmtDate(e.createdAt)}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(evt) => {
                        evt.stopPropagation();
                        deleteEntry(e.id);
                      }}
                      aria-label="Delete video"
                      className="ml-2 rounded-lg p-1.5 text-muted-foreground hover:bg-[#ff6b6b] hover:text-white transition-colors"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Minimal Footer */}
      <footer className="ember-home-footer mt-auto border-t px-6 py-8">
        <div className="flex flex-col items-center gap-3">
          <svg
            viewBox="0 0 120 17"
            aria-hidden="true"
            className="h-[7px] w-[44px] text-[#e6b784] opacity-80"
          >
            <path d="M4 12 C 30 9.6, 68 9.2, 92 9.8 C 102 10.1, 108.5 8.2, 110.5 4.8" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" />
            <circle cx="109" cy="2.4" r="2" fill="currentColor" />
          </svg>
          <p className="text-xs">Ember — every problem, a lesson</p>
        </div>
      </footer>

      {/* Generation Overlay */}
      {overlayOpen && jobStatus && !jobStatus.script && jobStatus.phase !== "error" && (
        <GenerateOverlay status={jobStatus} onLeave={leaveJob} />
      )}

      {/* Error Overlay */}
      {(formError || jobStatus?.phase === "error") && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-md"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-3xl border border-[#34383c] bg-[#171b1d] p-6 shadow-2xl">
            <div className="mb-4 flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[#ff6b6b]/15 ring-1 ring-[#ff6b6b]/30">
                <AlertTriangle className="h-5 w-5 text-[#ff6b6b]" />
              </span>
              <div className="text-base font-bold text-foreground">The marker slipped</div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {formError || jobStatus?.error}
            </p>
            <div className="mt-6 flex gap-3">
              <Button
                onClick={() =>
                  void generate(
                    planQuestionRef.current || jobStatus?.question || question
                  )
                }
                className="rounded-xl bg-[#e6b784] font-semibold text-[#191816] hover:bg-[#f2ca9e]"
              >
                Try again
              </Button>
              <Button
                variant="ghost"
                onClick={clearJob}
                className="rounded-xl text-muted-foreground hover:bg-[#23262a] hover:text-[#f1eee7]"
              >
                Change question
              </Button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
