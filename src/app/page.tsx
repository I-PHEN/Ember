"use client";

/* ------------------------------------------------------------------
   Chalkcast — home (ask a question) + watch (a real solve video),
   taught by Professor Ada. One route, two phases: the player is a
   fixed-frame, seekable video like YouTube — no scrolling boards,
   natural teacher pacing.
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
  Check,
  Palette,
  BookOpenText,
  Route,
  Pointer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import ChalkAvatar from "@/components/ChalkAvatar";
import Wordmark from "@/components/Wordmark";
import SolvePlayer, {
  type SolvePlayerHandle,
} from "@/components/player/SolvePlayer";
import GenerateOverlay from "@/components/GenerateOverlay";
import ResumeCard from "@/components/ResumeCard";
import { EXAMPLE_QUESTIONS, HERO_SCRIPT, SAMPLE_SOLVE } from "@/lib/samples";
import { useVideoJob } from "@/lib/use-video-job";
import { defaultTheme, saveTheme } from "@/lib/solve-schema";
import { compileTimeline } from "@/lib/video/compile";
import { renderToImage } from "@/lib/video/render";
import { THEMES, THEME_ORDER, totalDuration } from "@/lib/video/types";
import type { BoardThemeId, SolveScript } from "@/lib/video/types";
import { cn } from "@/lib/utils";

type Phase = "home" | "watch";

interface HistoryEntry {
  id: string;
  title: string;
  subject?: string;
  question: string;
  script: SolveScript;
  createdAt: number;
  thumb?: string;
}

const HISTORY_KEY = "chalkcast.videos";
const LEGACY_HISTORY_KEY = "livetutor.videos";
const HISTORY_MAX = 12;

function loadHistory(): HistoryEntry[] {
  try {
    let raw = window.localStorage.getItem(HISTORY_KEY);
    if (!raw) {
      /* rebrand migration: carry saved videos across the rename */
      raw = window.localStorage.getItem(LEGACY_HISTORY_KEY);
      if (raw) {
        window.localStorage.setItem(HISTORY_KEY, raw);
        window.localStorage.removeItem(LEGACY_HISTORY_KEY);
      }
    }
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter((e) => e && e.script?.scenes?.length) : [];
  } catch {
    return [];
  }
}

function saveHistory(list: HistoryEntry[]): void {
  try {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(list));
  } catch {
    // quota — drop thumbnails, then oldest, then give up quietly
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

/* ================================================================= */

export default function Page() {
  const [phase, setPhase] = useState<Phase>("home");
  const [script, setScript] = useState<SolveScript | null>(null);
  const [themeId, setThemeId] = useState<BoardThemeId>("blackboard");
  const [question, setQuestion] = useState("");
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [seekReq, setSeekReq] = useState<{ t: number; n: number } | null>(null);
  const seekNonce = useRef(0);
  const playerRef = useRef<SolvePlayerHandle>(null);
  const [voiceVer, setVoiceVer] = useState(0);
  const planQuestionRef = useRef("");
  const [watchedJobId, setWatchedJobId] = useState<string | null>(null);

  /* boot — persisted state must load AFTER mount (lazy initializers would
   * hydrate differently from the server HTML). setState here is intentional. */
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setThemeId(defaultTheme());
    setHistory(loadHistory());
  }, []);

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
    // narration fetching is owned entirely by the player (playhead-
    // prioritized, rate-limit-patient) — no competing page-level loop
  }, []);

  const persist = useCallback(
    (sc: SolveScript) => {
      let thumb: string | undefined;
      try {
        const tl = compileTimeline(sc);
        const t = Math.min(3.4, totalDuration(tl) * 0.4);
        thumb = renderToImage(tl, THEMES[themeId], t, 420);
      } catch {
        thumb = undefined;
      }
      const entry: HistoryEntry = {
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
      persist(sc); // safe in history the moment the storyboard lands
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

  /* resume an unfinished job from a previous visit (stable callback) */
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

  /* ------------------------- chapter list ------------------------ */

  const chapterTimes = useMemo(() => {
    if (phase !== "watch" || !script) return [] as { t: number; label: string }[];
    const tl = compileTimeline(script);
    let acc = 0;
    const out: { t: number; label: string }[] = [];
    for (const s of tl.scenes) {
      const at = acc;
      acc += s.dur;
      if (!s.intro) out.push({ t: at, label: s.chapter }); // hide the brand bumper
    }
    return out;
  }, [phase, script, voiceVer]);

  const goChapter = useCallback((t: number) => {
    seekNonce.current += 1;
    setSeekReq({ t: t + 0.01, n: seekNonce.current });
  }, []);

  /* ============================ WATCH ============================ */

  if (phase === "watch" && script) {
    const est = (() => {
      try {
        return totalDuration(compileTimeline(script));
      } catch {
        return 0;
      }
    })();
    return (
      <main className="flex min-h-dvh flex-col bg-[#0f1114]">
        <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-3 border-b border-white/5 bg-[#101216]/95 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setPhase("home");
              setScript(null);
            }}
            className="gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
            Back
          </Button>
          <Wordmark />
          <div className="flex-1" />
          <Button
            size="sm"
            onClick={() => setPhase("home")}
            className="rounded-lg bg-mk-orange text-[#14161b] hover:bg-mk-orange/90"
          >
            <Clapperboard className="h-4 w-4" />
            New video
          </Button>
        </header>

        <section className="mx-auto w-full max-w-[1080px] flex-1 px-3 pb-16 pt-4 sm:px-6 sm:pt-6">
          <SolvePlayer
            ref={playerRef}
            script={script}
            themeId={themeId}
            onThemeChange={changeTheme}
            autoPlay
            seekRequest={seekReq}
            onVoiced={() => setVoiceVer((v) => v + 1)}
          />

          {/* the channel row — who is teaching this lecture */}
          <div className="mt-5 flex flex-wrap items-center gap-3.5 border-b border-white/6 pb-4">
            <ChalkAvatar size={46} className="shrink-0" />
            <div className="min-w-0">
              <div className="text-[15px] font-semibold">Professor Ada</div>
              <div className="mt-0.5 text-xs text-muted-foreground">
                your resident lecturer — she plans, chalks and narrates every
                video
              </div>
            </div>
            <div className="flex-1" />
            <div className="flex items-center gap-1.5 rounded-xl border border-white/8 bg-white/4 p-1">
              {THEME_ORDER.map((id) => (
                <button
                  key={id}
                  onClick={() => changeTheme(id)}
                  title={THEMES[id].label}
                  aria-label={`${THEMES[id].label} board`}
                  className={cn(
                    "h-8 w-8 rounded-lg border transition",
                    themeId === id
                      ? "border-mk-orange ring-2 ring-mk-orange/30"
                      : "border-white/15 hover:border-white/35"
                  )}
                  style={{ background: THEMES[id].bg }}
                />
              ))}
            </div>
          </div>

          {/* title + meta */}
          <div className="mt-4 flex flex-wrap items-start gap-3">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-bold leading-snug tracking-tight sm:text-2xl">
                {script.title}
              </h1>
              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px] text-muted-foreground">
                {script.subject && (
                  <span className="rounded-full bg-white/6 px-2.5 py-0.5 text-foreground/85">
                    {script.subject}
                  </span>
                )}
                <span>{script.scenes.filter((s) => !s.intro).length} chapters</span>
                {est > 0 && <span>· about {fmtDur(est)}</span>}
                <span>· planned, chalked &amp; voiced by AI</span>
                {jobStatus &&
                  jobStatus.phase === "voicing" &&
                  jobStatus.id === watchedJobId && (
                    <span className="text-mk-green/90">
                      · recording voice {jobStatus.voicesDone}/{
                        jobStatus.voicesTotal
                      } — playback keeps up
                    </span>
                  )}
              </div>
            </div>
          </div>

          {/* question + chapters */}
          <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_320px]">
            <div className="rounded-2xl border border-white/6 bg-white/3 p-4 sm:p-5">
              <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                The question
              </div>
              <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed">
                {script.question}
              </p>
              <div className="mt-4 border-t border-white/6 pt-3 text-xs leading-relaxed text-muted-foreground">
                Like a real lecture: Professor Ada's voice carries the
                explanation while the pen writes only what matters — the
                problem, one move at a time, checked and boxed. Captions
                available via the CC button in the player.
              </div>
            </div>
            <div className="rounded-2xl border border-white/6 bg-white/3 p-4">
              <div className="mb-2.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                Chapters
              </div>
              <ol className="space-y-1">
                {chapterTimes.map((c, i) => (
                  <li key={i}>
                    <button
                      onClick={() => goChapter(c.t)}
                      className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-muted-foreground transition hover:bg-white/8 hover:text-foreground"
                    >
                      <span className="tabular-nums text-[11.5px] text-mk-orange/90">
                        {fmtDur(c.t)}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{c.label}</span>
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
    <main className="studio-grain flex min-h-dvh flex-col bg-[#0f1114] text-foreground">
      <header className="flex h-16 shrink-0 items-center justify-between px-5 sm:px-8">
        <Wordmark chip="with Professor Ada" />
        <div className="hidden font-hand text-[15px] text-mk-yellow/90 sm:block">
          every problem, a lesson
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-1 flex-col items-center gap-10 px-5 py-8 sm:px-8 lg:flex-row lg:gap-14">
        {/* left: pitch + form */}
        <div className="w-full lg:flex-1">
          {jobStatus && !overlayOpen && jobStatus.id !== watchedJobId && jobStatus.phase !== "error" && (
            <ResumeCard
              status={jobStatus}
              onWatch={watchReady}
              onReopen={reopenJob}
              onDismiss={clearJob}
            />
          )}
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/4 px-3 py-1.5 text-xs text-muted-foreground">
            <span className="h-1.5 w-1.5 animate-pulse-soft rounded-full bg-mk-green" />
            Taught by Professor Ada — a real lecture, every time
          </div>
          <h1 className="text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl">
            Type the problem.
            <br />
            Watch the{" "}
            <span
              className="font-hand font-medium text-mk-yellow"
              style={{ textShadow: "0 0 18px rgba(255,214,110,0.3)" }}
            >
              lesson
            </span>
            .
          </h1>
          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
            Paste a university math, physics, chemistry or engineering
            question. Professor Ada reads it the way a class does —
            understanding what's going on first, gathering what's given,
            naming what's asked — then solves it one unhurried move at a time,
            a marker hand-writing the board while her voice explains every
            step. It's a real video: play it, pause it, scrub it, skip
            chapters.
          </p>

          <form
            className="mt-7 max-w-xl"
            onSubmit={(e) => {
              e.preventDefault();
              void generate(question);
            }}
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 transition-colors focus-within:border-mk-orange/40">
              <Textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void generate(question);
                  }
                }}
                placeholder="e.g. Solve for x: 2x + 5 = 13&#10;or paste a whole word problem…"
                aria-label="Your question"
                rows={3}
                className="resize-none border-0 bg-transparent px-3 py-2.5 text-[15px] placeholder:text-muted-foreground/60 focus-visible:ring-0"
              />
              <div className="flex items-center justify-between gap-2 px-2 pb-1 pt-1.5">
                <span className="text-[11px] text-muted-foreground">
                  {question.length}/600
                </span>
                <Button
                  type="submit"
                  disabled={!question.trim() || jobBusy || question.length > 600}
                  className="h-11 rounded-xl bg-mk-orange px-5 text-[14.5px] font-semibold text-[#14161b] hover:bg-mk-orange/90"
                >
                  Make my solve video
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </form>

          {/* examples */}
          <div className="mt-4 flex max-w-xl flex-wrap gap-2">
            {EXAMPLE_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => setQuestion(q)}
                disabled={jobBusy}
                className="max-w-full truncate rounded-full border border-white/10 bg-white/4 px-3.5 py-1.5 text-[12.5px] text-muted-foreground transition-colors hover:border-white/20 hover:bg-white/8 hover:text-foreground disabled:opacity-50"
              >
                {q}
              </button>
            ))}
            <button
              onClick={() => watch(SAMPLE_SOLVE)}
              disabled={jobBusy}
              className="inline-flex items-center gap-1.5 rounded-full border border-mk-green/30 bg-mk-green/10 px-3.5 py-1.5 text-[12.5px] font-medium text-mk-green transition-colors hover:bg-mk-green/20 disabled:opacity-50"
            >
              <Play className="h-3 w-3" />
              Watch a sample solve
            </button>
          </div>

          {/* board theme */}
          <div className="mt-7 flex flex-wrap items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Palette className="h-3.5 w-3.5" /> board
            </span>
            {THEME_ORDER.map((id) => (
              <button
                key={id}
                onClick={() => changeTheme(id)}
                aria-label={`${THEMES[id].label} board`}
                className={cn(
                  "flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] transition",
                  themeId === id
                    ? "border-mk-orange/60 bg-white/8 text-foreground"
                    : "border-white/10 bg-white/3 text-muted-foreground hover:border-white/25 hover:text-foreground"
                )}
              >
                <span
                  className="h-4 w-4 rounded-full border border-white/20"
                  style={{ background: THEMES[id].bg }}
                />
                {THEMES[id].label}
                {themeId === id && <Check className="h-3.5 w-3.5 text-mk-orange" />}
              </button>
            ))}
          </div>
        </div>

        {/* right: hero mini board */}
        <div className="w-full lg:flex-1">
          <SolvePlayer script={HERO_SCRIPT} themeId={themeId} mini autoPlay />
          <p className="mt-3 text-center text-xs text-muted-foreground">
            The same pen that solves your questions writes this board — click
            it to replay.
          </p>
        </div>
      </section>

      {/* the professor + her lecture arc */}
      <section className="mx-auto w-full max-w-6xl px-5 pb-12 sm:px-8">
        <div className="grid gap-4 lg:grid-cols-[360px_1fr]">
          {/* meet Professor Ada */}
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5 sm:p-6">
            <div className="flex items-start gap-4">
              <ChalkAvatar size={88} className="shrink-0" />
              <div>
                <h2 className="text-lg font-semibold tracking-tight">
                  Meet Professor Ada
                </h2>
                <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                  She reads the problem with you first, gathers what's given,
                  names the ask — and only then solves, one unhurried move at
                  a time.
                </p>
              </div>
            </div>
            <ul className="mt-5 space-y-3">
              {[
                {
                  icon: BookOpenText,
                  t: "Reads it with you first",
                  d: "plain words before any math — what is actually going on here?",
                },
                {
                  icon: Route,
                  t: "One move at a time",
                  d: "every scene is a single legal move, the pen paced to her words",
                },
                {
                  icon: Pointer,
                  t: "Points at what matters",
                  d: "analogies when they help, a boxed answer, and a check at the end",
                },
              ].map((p) => (
                <li key={p.t} className="flex items-start gap-3">
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-mk-yellow/10 ring-1 ring-mk-yellow/25">
                    <p.icon className="h-3.5 w-3.5 text-mk-yellow" />
                  </span>
                  <div>
                    <div className="text-[13px] font-semibold">{p.t}</div>
                    <div className="text-xs leading-relaxed text-muted-foreground">
                      {p.d}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* the lecture arc */}
          <div className="rounded-2xl border border-white/8 bg-white/3 p-5 sm:p-6">
            <h2 className="text-lg font-semibold tracking-tight">
              Every Chalkcast follows the lecture arc
            </h2>
            <p className="mt-1.5 max-w-lg text-[13px] leading-relaxed text-muted-foreground">
              The same order a good professor works through a problem at the
              board — never straight to the answer.
            </p>
            <ol className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                {
                  n: "01",
                  t: "Understand",
                  d: "She explains the problem in plain words and gathers the GIVENs.",
                },
                {
                  n: "02",
                  t: "Plan",
                  d: "The route in one or two moves — and the rule that justifies it.",
                },
                {
                  n: "03",
                  t: "Solve",
                  d: "One unhurried move per scene, ink landing inside her words.",
                },
                {
                  n: "04",
                  t: "Check",
                  d: "Substitute back, verify, box the answer, wrap up warmly.",
                },
              ].map((s) => (
                <li
                  key={s.n}
                  className="relative rounded-xl border border-white/6 bg-[#14161b] p-4"
                >
                  <div className="font-hand text-xl text-mk-yellow/90">{s.n}</div>
                  <div className="mt-1 text-[13.5px] font-semibold">{s.t}</div>
                  <div className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    {s.d}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* history */}
      {history.length > 0 && (
        <section className="mx-auto w-full max-w-6xl px-5 pb-12 sm:px-8">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-foreground">
            <HistoryIcon className="h-4 w-4 text-mk-orange" />
            Your library
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {history.map((e) => (
              <div
                key={e.id}
                className="group relative overflow-hidden rounded-2xl border border-white/8 bg-[#15181f] transition hover:border-white/20"
              >
                <button
                  onClick={() => watch(e.script)}
                  className="block w-full text-left"
                  aria-label={`Watch ${e.title}`}
                >
                  <div className="relative aspect-video w-full overflow-hidden bg-black">
                    {e.thumb ? (
                       
                      <img
                        src={e.thumb}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <Play className="h-8 w-8 text-white/30" />
                      </div>
                    )}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition group-hover:bg-black/35">
                      <span className="scale-75 rounded-full bg-black/60 p-3 opacity-0 transition group-hover:scale-100 group-hover:opacity-100">
                        <Play className="h-6 w-6 text-white" fill="currentColor" />
                      </span>
                    </div>
                  </div>
                  <div className="p-3.5">
                    <div className="truncate text-[14px] font-semibold">{e.title}</div>
                    <div className="mt-0.5 truncate text-xs text-muted-foreground">
                      {e.subject ? `${e.subject} · ` : ""}
                      {fmtDate(e.createdAt)}
                    </div>
                  </div>
                </button>
                <button
                  onClick={() => deleteEntry(e.id)}
                  aria-label="Delete video"
                  className="absolute right-2 top-2 rounded-lg bg-black/60 p-1.5 text-white/70 opacity-0 backdrop-blur transition hover:bg-black/80 hover:text-white group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      <footer className="mt-auto border-t border-white/5 px-5 py-4 text-center text-xs text-muted-foreground sm:px-8">
        Chalkcast — every problem, a lesson · taught by Professor Ada · ink
        by one very busy marker pen
      </footer>

      {/* multi-agent generation overlay */}
      {overlayOpen && jobStatus && !jobStatus.script && jobStatus.phase !== "error" && (
        <GenerateOverlay status={jobStatus} onLeave={leaveJob} />
      )}

      {/* error overlay */}
      {(formError || jobStatus?.phase === "error") && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl border border-white/8 bg-[#15181f] p-6 shadow-2xl">
            <div className="mb-3 flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/15 ring-1 ring-destructive/30">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </span>
              <div className="text-sm font-semibold">The marker slipped</div>
            </div>
            <p className="text-sm leading-relaxed text-muted-foreground">
              {formError || jobStatus?.error}
            </p>
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() =>
                  void generate(
                    planQuestionRef.current || jobStatus?.question || question
                  )
                }
                className="rounded-lg bg-mk-orange text-[#14161b] hover:bg-mk-orange/90"
              >
                Try again
              </Button>
              <Button
                variant="ghost"
                onClick={clearJob}
                className="rounded-lg text-muted-foreground hover:text-foreground"
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
