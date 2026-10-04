"use client";

/* ------------------------------------------------------------------
   Ember — Professional Whiteboard Educational Platform
   Taught by Professor Ada.
------------------------------------------------------------------- */

import { useCallback, useEffect, useRef, useState } from "react";
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
  Globe,
  Check,
  Loader2,
  Send,
  Users,
  Search,
  RotateCcw,
  Clock,
} from "lucide-react";
import Link from "next/link";
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
import type { Chapter } from "@/lib/video/chapters";
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
  durText?: string;
  isPublished?: boolean;
  publishedId?: string;
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
  const [seekReq, setSeekReq] = useState<{ sceneIndex: number; script: SolveScript; n: number } | null>(null);
  const seekNonce = useRef(0);
  const playerRef = useRef<SolvePlayerHandle>(null);
  const [chapterState, setChapterState] = useState<{ script: SolveScript; chapters: Chapter[] } | null>(null);
  const handleChaptersChange = useCallback((script: SolveScript, chapters: Chapter[]) => {
    setChapterState({ script, chapters });
  }, []);
  const planQuestionRef = useRef("");
  const [watchedJobId, setWatchedJobId] = useState<string | null>(null);
  const [timingSource, setTimingSource] = useState<{ script: SolveScript; jobId: string } | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  /* Studio & Refinement State */
  const [activeRightTab, setActiveRightTab] = useState<"chapters" | "refine">("chapters");
  const [scriptVersions, setScriptVersions] = useState<SolveScript[]>([]);
  const [currentVersionIdx, setCurrentVersionIdx] = useState(0);
  const [refineChat, setRefineChat] = useState<{ role: "user" | "ember"; content: string }[]>([]);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);

  /* Player Timestamp Tracking for Q&A */
  const [playerTime, setPlayerTime] = useState(0);
  const [playerSceneIdx, setPlayerSceneIdx] = useState(0);
  const [activeSolveId, setActiveSolveId] = useState<string | null>(null);

  /* Explore Gallery State */
  const [exploreTab, setExploreTab] = useState<"curated" | "community">("curated");
  const [communityLessons, setCommunityLessons] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    setThemeId(defaultTheme());
    setHistory(loadHistory());
    fetch("/api/gallery")
      .then((r) => r.json())
      .then((d) => {
        if (Array.isArray(d.items)) setCommunityLessons(d.items);
      })
      .catch(() => {});
  }, []);

  // Check for solve passed via /gallery or direct link
  useEffect(() => {
    try {
      const activeRaw = window.localStorage.getItem("ember.watch.active");
      if (activeRaw) {
        window.localStorage.removeItem("ember.watch.active");
        const activeScript = JSON.parse(activeRaw);
        if (activeScript && activeScript.scenes) {
          watch(activeScript);
        }
      }
    } catch {}
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
          const dur = fmtDur(totalDuration(tl));
          return {
            ...entry,
            durText: dur,
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

  /* ------------------------ watch & studio helpers ------------------------ */

  const getChatKey = (title: string) => `ember.chat.${title}`;

  const saveChatForSolve = (title: string, messages: { role: "user" | "ember"; content: string }[]) => {
    try {
      window.localStorage.setItem(getChatKey(title), JSON.stringify(messages));
    } catch {}
  };

  const loadChatForSolve = (title: string): { role: "user" | "ember"; content: string }[] | null => {
    try {
      const raw = window.localStorage.getItem(getChatKey(title));
      if (raw) return JSON.parse(raw);
    } catch {}
    return null;
  };

  const watch = useCallback((sc: SolveScript, solveId?: string) => {
    setScript(sc);
    setScriptVersions([sc]);
    setCurrentVersionIdx(0);
    setActiveSolveId(solveId || null);

    // Restore persistent chat history or set default greeting
    const saved = loadChatForSolve(sc.title);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      setRefineChat(saved);
    } else {
      setRefineChat([
        {
          role: "ember",
          content: `I've planned this lecture on "${sc.title}". Ask me any questions about the steps, or tell me what to adjust on the blackboard.`,
        },
      ]);
    }

    // Check if published in history
    const existingHistory = loadHistory();
    const matched = existingHistory.find((h) => h.title === sc.title && h.isPublished);
    setPublished(!!matched);

    setPhase("watch");
    setSeekReq(null);
    setChapterState(null);
    setActiveRightTab("chapters");
  }, []);

  const switchToVersion = useCallback((idx: number) => {
    setScriptVersions((versions) => {
      if (versions[idx]) {
        setCurrentVersionIdx(idx);
        setScript(versions[idx]);
        setSeekReq(null);
      }
      return versions;
    });
  }, []);

  const handleRefineSubmit = useCallback(
    async (e?: React.FormEvent, customInstruction?: string) => {
      if (e) e.preventDefault();
      const text = (customInstruction ?? refineInstruction).trim();
      if (!text || !script || isRefining) return;

      setRefineInstruction("");
      const updatedChat = [...refineChat, { role: "user" as const, content: text }];
      setRefineChat(updatedChat);
      saveChatForSolve(script.title, updatedChat);
      setIsRefining(true);

      try {
        const activeChapter = script.scenes[playerSceneIdx]?.chapter;
        const res = await fetch("/api/refine", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            script,
            instruction: text,
            currentTime: playerTime,
            currentScene: activeChapter,
            history: updatedChat,
          }),
        });
        const data = await res.json();

        if (data.mode === "edit" && data.script) {
          // Board revision mode
          const newScript = data.script as SolveScript;
          setScriptVersions((prev) => [...prev, newScript]);
          setCurrentVersionIdx((prev) => prev + 1);
          setScript(newScript);
          const nextChat = [
            ...updatedChat,
            {
              role: "ember" as const,
              content:
                data.reply ||
                "I've revised the lesson with your requested changes. The board has been updated live.",
            },
          ];
          setRefineChat(nextChat);
          saveChatForSolve(newScript.title, nextChat);
        } else {
          // Q&A / Explanation mode
          const nextChat = [
            ...updatedChat,
            {
              role: "ember" as const,
              content:
                data.reply ||
                "Here is my explanation based on what we've chalked on the board.",
            },
          ];
          setRefineChat(nextChat);
          saveChatForSolve(script.title, nextChat);
        }
      } catch {
        const nextChat = [
          ...updatedChat,
          {
            role: "ember" as const,
            content: "Something went wrong communicating with the studio. Please try again.",
          },
        ];
        setRefineChat(nextChat);
        saveChatForSolve(script.title, nextChat);
      } finally {
        setIsRefining(false);
      }
    },
    [refineInstruction, script, isRefining, playerTime, playerSceneIdx, refineChat]
  );

  const handlePublish = useCallback(async () => {
    if (!script || isPublishing) return;
    setIsPublishing(true);
    try {
      const res = await fetch("/api/gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: script.title,
          description: script.question,
          script,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setPublished(true);
        setHistory((prev) => {
          const updated = prev.map((item) =>
            item.title === script.title
              ? { ...item, isPublished: true, publishedId: data.postId }
              : item
          );
          saveHistory(updated);
          return updated;
        });
        fetch("/api/gallery")
          .then((r) => r.json())
          .then((d) => {
            if (Array.isArray(d.items)) setCommunityLessons(d.items);
          });
      }
    } catch (err) {
      console.error("Publish error:", err);
    } finally {
      setIsPublishing(false);
    }
  }, [script, isPublishing]);

  const handleUnpublish = useCallback(async (item: HistoryItem) => {
    if (!item.publishedId) return;
    try {
      await fetch(`/api/gallery?id=${item.publishedId}`, { method: "DELETE" });
      setHistory((prev) => {
        const updated = prev.map((h) =>
          h.id === item.id ? { ...h, isPublished: false, publishedId: undefined } : h
        );
        saveHistory(updated);
        return updated;
      });
      if (script?.title === item.title) setPublished(false);
    } catch (err) {
      console.error("Unpublish error:", err);
    }
  }, [script]);

  const persist = useCallback(
    (sc: SolveScript) => {
      let thumb: string | undefined;
      let durText = "3:00";
      try {
        const tl = compileTimeline(sc);
        const t = thumbnailTime(tl);
        durText = fmtDur(totalDuration(tl));
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
        durText,
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
        setTimingSource({ script: sc, jobId });
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
      setTimingSource({ script: jobStatus.script, jobId: jobStatus.id });
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

  const chapterTimes = phase === "watch" && chapterState?.script === script
    ? chapterState.chapters : [];

  const goChapter = useCallback((sceneIndex: number) => {
    if (!script) return;
    seekNonce.current += 1;
    setSeekReq({ sceneIndex, script, n: seekNonce.current });
  }, [script]);

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

  const handleTimeUpdate = useCallback((t: number, sceneIdx: number) => {
    setPlayerTime(t);
    setPlayerSceneIdx(sceneIdx);
  }, []);

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

            {/* Version Badge & Undo Scrubbing */}
            <div className="hidden sm:flex items-center gap-1 rounded-xl border border-[#34383c] bg-[#171b1d] px-2.5 py-1 text-xs">
              <span className="font-mono font-semibold text-[#e6b784]">
                v{currentVersionIdx + 1}
              </span>
              {scriptVersions.length > 1 && (
                <div className="ml-1.5 flex items-center gap-1 border-l border-[#34383c] pl-1.5">
                  {scriptVersions.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => switchToVersion(i)}
                      className={cn(
                        "h-4 w-4 rounded-full font-mono text-[10px] transition-colors",
                        i === currentVersionIdx
                          ? "bg-[#e6b784] font-bold text-[#191816]"
                          : "text-muted-foreground hover:bg-[#23262a] hover:text-[#f1eee7]"
                      )}
                      title={`Switch to version ${i + 1}`}
                    >
                      {i + 1}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Publish to Community Gallery Button */}
            <Button
              size="sm"
              variant="outline"
              disabled={isPublishing || published}
              onClick={handlePublish}
              className="rounded-xl border-[#e6b784]/30 bg-[#171b1d] text-xs font-semibold text-[#e6b784] hover:bg-[#e6b784]/15 hover:text-[#f2ca9e] transition-all"
            >
              {published ? (
                <>
                  <Check className="h-3.5 w-3.5 mr-1.5 text-[#5cdb95]" />
                  Published
                </>
              ) : (
                <>
                  <Globe className="h-3.5 w-3.5 mr-1.5" />
                  {isPublishing ? "Publishing…" : "Publish to Gallery"}
                </>
              )}
            </Button>

            <Button
              size="sm"
              onClick={() => setPhase("home")}
              className="rounded-xl bg-[#e6b784] font-semibold text-[#191816] hover:bg-[#f2ca9e]"
            >
              <Clapperboard className="h-4 w-4" />
              New solve
            </Button>
          </div>
        </header>

        {/* Side-by-Side Watch Stage: Player on Left, Tabs on Right */}
        <section className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 sm:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px] items-start">
            {/* Left: Video Player + Details */}
            <div className="space-y-5">
              <SolvePlayer
                jobId={timingSource?.script === script ? timingSource.jobId : undefined}
                ref={playerRef}
                script={script}
                themeId={themeId}
                onThemeChange={changeTheme}
                autoPlay
                seekRequest={seekReq}
                onChaptersChange={handleChaptersChange}
                onTimeUpdate={handleTimeUpdate}
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

            {/* Right: Sticky Tabbed Sidebar (Chapters & Refine with Ember) */}
            <div className="sticky top-20 rounded-2xl border border-[#34383c] bg-[#171b1d] p-4 shadow-xl">
              {/* Tab Selector */}
              <div className="mb-4 flex items-center gap-1 rounded-xl border border-[#2b2f33] bg-[#121517] p-1">
                <button
                  type="button"
                  onClick={() => setActiveRightTab("chapters")}
                  className={cn(
                    "flex-1 rounded-lg py-1.5 text-xs font-semibold transition-all",
                    activeRightTab === "chapters"
                      ? "bg-[#23262a] text-[#f1eee7] shadow-sm"
                      : "text-[#8b8d8f] hover:text-[#f1eee7]"
                  )}
                >
                  Chapters ({chapterTimes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRightTab("refine")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all",
                    activeRightTab === "refine"
                      ? "bg-[#e6b784] text-[#191816] shadow-sm"
                      : "text-[#8b8d8f] hover:text-[#f1eee7]"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Refine with Ember
                </button>
              </div>

              {/* Tab 1: Chapters */}
              {activeRightTab === "chapters" && (
                <ol className="board-scroll max-h-[580px] space-y-1 overflow-y-auto pr-1">
                  {chapterTimes.map((c, i) => (
                    <li key={i}>
                      <button
                        onClick={() => goChapter(c.sceneIndex)}
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
              )}

              {/* Tab 2: Refine with Ember (Interactive Studio) */}
              {activeRightTab === "refine" && (
                <div className="flex flex-col h-[580px]">
                  {/* Chat Messages */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 board-scroll">
                    {refineChat.map((msg, i) => (
                      <div
                        key={i}
                        className={cn(
                          "flex flex-col gap-1 text-xs leading-relaxed",
                          msg.role === "user" ? "items-end" : "items-start"
                        )}
                      >
                        <span className="font-mono text-[10px] uppercase tracking-wider text-[#8b8d8f]">
                          {msg.role === "user" ? "You" : "Professor Ember"}
                        </span>
                        <div
                          className={cn(
                            "rounded-2xl px-3.5 py-2.5 max-w-[90%]",
                            msg.role === "user"
                              ? "bg-[#e6b784] font-medium text-[#191816] rounded-tr-xs"
                              : "border border-[#34383c] bg-[#121517] text-[#f1eee7] rounded-tl-xs"
                          )}
                        >
                          {msg.content}
                        </div>
                      </div>
                    ))}

                    {isRefining && (
                      <div className="flex items-center gap-2 text-xs text-[#e6b784] p-2">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Professor Ember is adjusting the blackboard…</span>
                      </div>
                    )}
                  </div>

                  {/* Suggestion Chips */}
                  <div className="mt-2 pt-2 border-t border-[#2b2f33] flex flex-wrap gap-1.5">
                    {[
                      "Why this formula?",
                      "Make step 2 simpler",
                      "Explain normal force",
                      "Highlight answer in yellow",
                    ].map((pill) => (
                      <button
                        key={pill}
                        type="button"
                        disabled={isRefining}
                        onClick={() => handleRefineSubmit(undefined, pill)}
                        className="rounded-full border border-[#34383c] bg-[#121517] px-2.5 py-1 text-[11px] text-[#a4a5a7] transition-all hover:border-[#e6b784]/40 hover:text-[#f1eee7] disabled:opacity-50"
                      >
                        {pill}
                      </button>
                    ))}
                  </div>

                  {/* Active Timestamp Context Indicator */}
                  <div className="mt-2.5 flex items-center justify-between px-1 text-[11px] text-[#8b8d8f]">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3 w-3 text-[#e6b784]" />
                      <span>
                        At <strong className="font-mono text-[#f1eee7]">{fmtDur(playerTime)}</strong>
                      </span>
                      <span className="text-[#34383c]">·</span>
                      <span className="truncate max-w-[170px] text-[#a4a5a7]">
                        {script.scenes[playerSceneIdx]?.chapter || "Current Step"}
                      </span>
                    </div>
                    <span className="text-[10px] text-[#8b8d8f]/70 font-mono">timestamp synced</span>
                  </div>

                  {/* Chat Input Console */}
                  <form
                    onSubmit={(e) => handleRefineSubmit(e)}
                    className="mt-2 relative flex items-center gap-2"
                  >
                    <input
                      type="text"
                      value={refineInstruction}
                      onChange={(e) => setRefineInstruction(e.target.value)}
                      placeholder="Ask Ember about this step, or tell her what to edit…"
                      disabled={isRefining}
                      className="w-full rounded-xl border border-[#34383c] bg-[#121517] px-3 py-2 text-xs text-[#f1eee7] placeholder:text-[#8b8d8f] focus:outline-none focus:border-[#e6b784]/60 disabled:opacity-50"
                    />
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!refineInstruction.trim() || isRefining}
                      className="h-8 rounded-xl bg-[#e6b784] px-3 font-semibold text-[#191816] hover:bg-[#f2ca9e] disabled:opacity-40"
                    >
                      {isRefining ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </form>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  /* ============================ HOME ============================= */

  return (
    <main className="ember-home flex min-h-dvh flex-col">
      {/* Top Header */}
      <header className="ember-home-header sticky top-0 z-30 flex h-20 shrink-0 items-center justify-between border-b px-6 backdrop-blur-xl sm:px-12">
        <Wordmark />
        <Link
          href="/gallery"
          className="flex items-center gap-1.5 rounded-xl border border-[#34383c] bg-[#171b1d] px-3.5 py-1.5 text-xs font-semibold text-[#a4a5a7] transition-all hover:border-[#e6b784]/40 hover:text-[#f1eee7]"
        >
          <Globe className="h-3.5 w-3.5 text-[#e6b784]" />
          Community Gallery ↗
        </Link>
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

        {/* Curated Starter Lessons (A good place to start) */}
        {SAMPLE_LESSONS.length > 0 && (
          <div id="lessons" className="mt-12 w-full scroll-mt-24">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-sm font-bold text-foreground">
                <Sparkles className="h-4 w-4 text-[#e6b784]" />
                Curated Starters
              </div>
              <Link
                href="/gallery"
                className="text-xs text-[#e6b784] hover:underline flex items-center gap-1 font-medium transition-colors"
              >
                Browse Community Gallery ↗
              </Link>
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

                      {/* Duration Badge */}
                      <div className="absolute bottom-2 right-2 rounded-md bg-black/85 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#f1eee7]">
                        {durText}
                      </div>
                    </div>

                    {/* Short Title & Subtext */}
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

                    {/* Published to Gallery Badge */}
                    {e.isPublished && (
                      <div className="absolute top-2 left-2 rounded-md bg-black/85 border border-[#e6b784]/40 px-2 py-0.5 text-[10px] font-semibold text-[#e6b784] flex items-center gap-1 shadow-md">
                        <Check className="h-3 w-3 text-[#5cdb95]" />
                        Published
                      </div>
                    )}

                    {/* YouTube-Style Duration Badge */}
                    <div className="absolute bottom-2 right-2 rounded-md bg-black/85 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#f1eee7]">
                      {e.durText || "3:00"}
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
                    <div className="flex items-center gap-1">
                      {e.isPublished && (
                        <button
                          type="button"
                          onClick={(evt) => {
                            evt.stopPropagation();
                            handleUnpublish(e);
                          }}
                          title="Unpublish from Community Gallery"
                          className="rounded-lg px-2 py-1 text-[11px] font-medium text-[#8b8d8f] hover:text-[#e6b784] hover:bg-white/5 transition-colors"
                        >
                          Unpublish
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={(evt) => {
                          evt.stopPropagation();
                          deleteEntry(e.id);
                        }}
                        aria-label="Delete video"
                        className="ml-1 rounded-lg p-1.5 text-muted-foreground hover:bg-[#ff6b6b] hover:text-white transition-colors"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
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
