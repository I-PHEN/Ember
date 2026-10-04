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
  Globe,
  Check,
  Loader2,
  Send,
  Users,
  Search,
  RotateCcw,
  Clock,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Copy,
  Layers,
  Plus,
  MessageSquare,
  Lock,
  ChevronDown,
  LogOut,
  Settings,
  HelpCircle,
  ArrowUpCircle,
  Info,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/lib/firebase/auth-context";
import ReactMarkdown from "react-markdown";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
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
import { narrationStore } from "@/lib/narration-store";
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

function fmtRelativeTime(ts: number): string {
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return fmtDate(ts);
}

function fmtDur(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function formatMathTitle(title: string): string {
  if (!title) return "";
  let t = title.trim();
  if (t.includes("$")) return t;

  t = t.replace(/∫\s*([^$]+?)\s*dx/gi, (_, expr) => {
    const cleanExpr = expr.replace(/e\^\(([^)]+)\)/g, "e^{$1}").replace(/·/g, " \\cdot ").trim();
    return `$\\int ${cleanExpr} \\, dx$`;
  });

  t = t.replace(/Integral of\s+([a-zA-Z0-9\s^()·\+\-\*\/]+)/gi, (_, expr) => {
    const cleanExpr = expr.replace(/e\^\(([^)]+)\)/g, "e^{$1}").replace(/·/g, " \\cdot ").trim();
    return `$\\int ${cleanExpr} \\, dx$`;
  });

  t = t.replace(/(^|[^$\w])e\^\(([^)]+)\)(?![^$]*\$)/g, "$1$e^{$2}$");
  return t;
}

export function formatMathText(content: string): string {
  if (!content) return "";
  let text = content;

  // Standardize LaTeX delimiters: \[ ... \] -> $$ ... $$, \( ... \) -> $ ... $
  text = text.replace(/\\\[([\s\S]*?)\\\]/g, (_, eq) => `$$\n${eq.trim()}\n$$`);
  text = text.replace(/\\\(([\s\S]*?)\\\)/g, (_, eq) => `$${eq.trim()}$`);

  // Auto-format quoted titles containing math notation e.g. "Integration by Parts: Integral of x e^(2x)"
  text = text.replace(/"([^"]*(?:Integral of|∫|e\^)[^"]*)"/gi, (_, inner) => {
    return `**${formatMathTitle(inner)}**`;
  });

  // Convert standalone unbracketed e^(...) to $e^{...}$ if not inside $
  text = text.replace(/(^|[^$\w])e\^\(([^)]+)\)(?![^$]*\$)/g, "$1$e^{$2}$");

  return text;
}

export interface RefineMessage {
  role: "user" | "ember";
  content: string;
  mode?: "answer" | "edit";
  time?: number;
  createdAt?: number;
}

export interface ChatThread {
  id: string;
  title: string;
  createdAt: number;
  messages: RefineMessage[];
}

export default function Page() {
  const { user, loading: authLoading, openAuthModal, signOut } = useAuth();
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

  /* Studio & Refinement State */
  const [activeRightTab, setActiveRightTab] = useState<"chapters" | "refine">("chapters");
  const [scriptVersions, setScriptVersions] = useState<SolveScript[]>([]);
  const [currentVersionIdx, setCurrentVersionIdx] = useState(0);
  const [refineChat, setRefineChat] = useState<RefineMessage[]>([]);
  const [refineInstruction, setRefineInstruction] = useState("");
  const [isRefining, setIsRefining] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [published, setPublished] = useState(false);
  const [chatThreads, setChatThreads] = useState<ChatThread[]>([]);
  const [currentThreadId, setCurrentThreadId] = useState<string>("default");
  const [showThreadsDropdown, setShowThreadsDropdown] = useState(false);

  /* Solve History Drawer State */
  const [showHistoryDrawer, setShowHistoryDrawer] = useState(false);
  const [historySearch, setHistorySearch] = useState("");

  /* User Profile Dropdown & Modal State */
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [profileModal, setProfileModal] = useState<"settings" | "upgrade" | "help" | "learn" | "language" | null>(null);
  const profileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "," || e.key === "<")) {
        e.preventDefault();
        setProfileModal("settings");
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setShowProfileMenu(false);
      }
    };
    if (showProfileMenu) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showProfileMenu]);

  /* Voice & Audio Mode State */
  const [voiceModeActive, setVoiceModeActive] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakingMsgIndex, setSpeakingMsgIndex] = useState<number | null>(null);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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

  const getChatKey = (title: string) => `ember.chat.v2.${title}`;
  const getLegacyChatKey = (title: string) => `ember.chat.${title}`;
  const getThreadsKey = (title: string) => `ember.chat.threads.${title}`;

  const saveChatForSolve = (title: string, messages: RefineMessage[]) => {
    try {
      window.localStorage.setItem(getChatKey(title), JSON.stringify(messages));
    } catch {}
  };

  const loadChatForSolve = (title: string): RefineMessage[] | null => {
    try {
      const raw = window.localStorage.getItem(getChatKey(title));
      if (raw) return JSON.parse(raw);
      const legacy = window.localStorage.getItem(getLegacyChatKey(title));
      if (legacy) return JSON.parse(legacy);
    } catch {}
    return null;
  };

  const loadThreadsForSolve = (title: string): ChatThread[] => {
    try {
      const raw = window.localStorage.getItem(getThreadsKey(title));
      if (raw) return JSON.parse(raw);
    } catch {}
    return [];
  };

  const saveThreadsForSolve = (title: string, threads: ChatThread[]) => {
    try {
      window.localStorage.setItem(getThreadsKey(title), JSON.stringify(threads));
    } catch {}
  };

  // Stop speaking helper
  const stopSpeaking = useCallback(() => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      } catch {}
      audioRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    setIsSpeaking(false);
    setSpeakingMsgIndex(null);
  }, []);

  // Web Speech synthesis fallback
  const fallbackSpeech = useCallback((cleanText: string, onEnd?: () => void) => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(cleanText);
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(
        (v) =>
          v.lang.startsWith("en") &&
          (v.name.includes("Samantha") ||
            v.name.includes("Google UK English Female") ||
            v.name.includes("Victoria") ||
            v.name.includes("Female") ||
            v.name.includes("Natural"))
      );
      if (preferred) utterance.voice = preferred;
      utterance.rate = 1.0;
      utterance.pitch = 1.05;
      utterance.onend = () => onEnd?.();
      utterance.onerror = () => onEnd?.();
      window.speechSynthesis.speak(utterance);
    } else {
      onEnd?.();
    }
  }, []);

  // Speak message helper: tries narrationStore first, falls back to Web Speech
  const speakText = useCallback(
    async (text: string, onStart?: () => void, onEnd?: () => void) => {
      stopSpeaking();
      const clean = text
        .replace(/[*#`_~[\]]/g, "")
        .replace(/\$\$(.*?)\$\$/g, "$1")
        .replace(/\$(.*?)\$/g, "$1")
        .trim();

      if (!clean) return;
      onStart?.();

      let played = false;
      if (clean.length <= 900) {
        try {
          const audioUrl = await narrationStore.get(clean, "jam");
          const audio = new Audio(audioUrl);
          audioRef.current = audio;
          audio.onended = () => onEnd?.();
          audio.onerror = () => fallbackSpeech(clean, onEnd);
          await audio.play();
          played = true;
        } catch {
          played = false;
        }
      }

      if (!played) {
        fallbackSpeech(clean, onEnd);
      }
    },
    [stopSpeaking, fallbackSpeech]
  );

  // Speech-to-Text Recognition
  const startListening = useCallback(() => {
    if (typeof window === "undefined") return;
    const SpeechRec =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRec) {
      alert("Speech recognition is supported in Chrome, Edge, and Safari.");
      return;
    }

    stopSpeaking();

    try {
      const recognition = new SpeechRec();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setRefineInstruction(transcript);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
    }
  }, [stopSpeaking]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
  }, []);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, stopListening, startListening]);

  const handleCopy = useCallback((text: string, idx: number) => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 2000);
    }
  }, []);

  const handleStartNewChat = useCallback(() => {
    if (!script) return;
    stopSpeaking();
    stopListening();

    // Archive current thread into chatThreads if it contains student messages
    const hasUserMsg = refineChat.some((m) => m.role === "user");
    if (hasUserMsg) {
      const existingThreads = loadThreadsForSolve(script.title);
      const firstUserMsg = refineChat.find((m) => m.role === "user")?.content || "Conversation";
      const threadLabel = firstUserMsg.length > 34 ? firstUserMsg.slice(0, 34) + "…" : firstUserMsg;
      const threadToSave: ChatThread = {
        id: currentThreadId !== "default" ? currentThreadId : `thread_${Date.now()}`,
        title: threadLabel,
        createdAt: Date.now(),
        messages: refineChat,
      };
      const updatedThreads = [
        threadToSave,
        ...existingThreads.filter((t) => t.id !== threadToSave.id),
      ];
      saveThreadsForSolve(script.title, updatedThreads);
      setChatThreads(updatedThreads);
    }

    const formattedTitle = formatMathTitle(script.title);
    const newId = `thread_${Date.now()}`;
    setCurrentThreadId(newId);
    const initial: RefineMessage[] = [
      {
        role: "ember",
        content: `I've started a fresh conversation for **${formattedTitle}**.\n\nAsk me any question about the steps on the blackboard at any timestamp, or tell me what to adjust!`,
        createdAt: Date.now(),
      },
    ];
    setRefineChat(initial);
    saveChatForSolve(script.title, initial);
    setShowThreadsDropdown(false);
  }, [script, refineChat, currentThreadId, stopSpeaking, stopListening]);

  const handleSelectThread = useCallback(
    (thread: ChatThread) => {
      if (!script) return;
      stopSpeaking();
      stopListening();
      setCurrentThreadId(thread.id);
      setRefineChat(thread.messages);
      saveChatForSolve(script.title, thread.messages);
      setShowThreadsDropdown(false);
    },
    [script, stopSpeaking, stopListening]
  );

  const handleDeleteThread = useCallback(
    (threadId: string) => {
      if (!script) return;
      const existingThreads = loadThreadsForSolve(script.title);
      const updated = existingThreads.filter((t) => t.id !== threadId);
      saveThreadsForSolve(script.title, updated);
      setChatThreads(updated);
    },
    [script]
  );

  const handleDeleteHistoryItem = useCallback((id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setHistory((prev) => {
      const updated = prev.filter((item) => item.id !== id);
      saveHistory(updated);
      return updated;
    });
  }, []);

  const watch = useCallback(
    (sc: SolveScript, solveId?: string) => {
      stopSpeaking();
      stopListening();
      setScript(sc);
      setScriptVersions([sc]);
      setCurrentVersionIdx(0);
      setActiveSolveId(solveId || null);

      // Load threads for this solve
      const threads = loadThreadsForSolve(sc.title);
      setChatThreads(threads);
      setCurrentThreadId("default");
      setShowThreadsDropdown(false);

      // Restore persistent chat history or set default greeting
      const saved = loadChatForSolve(sc.title);
      if (saved && Array.isArray(saved) && saved.length > 0) {
        setRefineChat(saved);
      } else {
        const formattedTitle = formatMathTitle(sc.title);
        const initial: RefineMessage[] = [
          {
            role: "ember",
            content: `I've prepared the blackboard for **${formattedTitle}**.\n\nAsk me any question about the steps on the blackboard at any timestamp, or tell me what to adjust!`,
            createdAt: Date.now(),
          },
        ];
        setRefineChat(initial);
        saveChatForSolve(sc.title, initial);
      }

      // Check if published in history
      const existingHistory = loadHistory();
      const matched = existingHistory.find((h) => h.title === sc.title && h.isPublished);
      setPublished(!!matched);

      setPhase("watch");
      setSeekReq(null);
      setVoiceVer(0);
      setActiveRightTab("chapters");
    },
    [stopSpeaking]
  );

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
      stopListening();
      const text = (customInstruction ?? refineInstruction).trim();
      if (!text || !script || isRefining) return;

      setRefineInstruction("");
      const updatedChat: RefineMessage[] = [
        ...refineChat,
        {
          role: "user",
          content: text,
          time: playerTime,
          createdAt: Date.now(),
        },
      ];
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

        let replyContent = "";
        let mode: "answer" | "edit" = "answer";

        if (data.mode === "edit" && data.script) {
          // Board revision mode
          const newScript = data.script as SolveScript;
          setScriptVersions((prev) => [...prev, newScript]);
          setCurrentVersionIdx((prev) => prev + 1);
          setScript(newScript);
          replyContent =
            data.reply ||
            "I've revised the lesson with your requested changes. The board has been updated live.";
          mode = "edit";
        } else {
          // Q&A / Explanation mode
          replyContent =
            data.reply ||
            "Here is my explanation based on what we've chalked on the board.";
          mode = "answer";
        }

        const nextChat: RefineMessage[] = [
          ...updatedChat,
          {
            role: "ember",
            content: replyContent,
            mode,
            createdAt: Date.now(),
          },
        ];
        setRefineChat(nextChat);
        saveChatForSolve(script.title, nextChat);

        // If voice mode is active, speak Ember's response aloud
        if (voiceModeActive) {
          const newIdx = nextChat.length - 1;
          speakText(
            replyContent,
            () => {
              setIsSpeaking(true);
              setSpeakingMsgIndex(newIdx);
            },
            () => {
              setIsSpeaking(false);
              setSpeakingMsgIndex(null);
            }
          );
        }
      } catch {
        const errChat: RefineMessage[] = [
          ...updatedChat,
          {
            role: "ember",
            content: "Something went wrong communicating with the studio. Please try again.",
            createdAt: Date.now(),
          },
        ];
        setRefineChat(errChat);
        saveChatForSolve(script.title, errChat);
      } finally {
        setIsRefining(false);
      }
    },
    [
      refineInstruction,
      script,
      isRefining,
      playerTime,
      playerSceneIdx,
      refineChat,
      voiceModeActive,
      speakText,
      stopListening,
    ]
  );

  // Auto-scroll chat to latest message
  useEffect(() => {
    if (activeRightTab === "refine") {
      chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [refineChat, isRefining, activeRightTab]);

  // Cleanup audio & recognition on unmount or navigation
  useEffect(() => {
    return () => {
      stopSpeaking();
      stopListening();
    };
  }, [stopSpeaking, stopListening]);

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
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const promptParam = params.get("prompt");
      if (promptParam) {
        setQuestion(promptParam);
        const matched = SAMPLE_LESSONS.find(
          (s) =>
            s.title.toLowerCase() === promptParam.toLowerCase() ||
            promptParam.toLowerCase().includes(s.title.toLowerCase())
        );
        if (matched) {
          watch(matched);
        }
      }
      const solveParam = params.get("solve");
      if (solveParam) {
        const stored = window.localStorage.getItem("ember.watch.active");
        if (stored) {
          try {
            const sc = JSON.parse(stored);
            watch(sc, solveParam);
          } catch {}
        }
      }
    }
  }, [resumeFromStorage, watch]);

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

  const handleTimeUpdate = useCallback((t: number, sceneIdx: number) => {
    setPlayerTime(t);
    setPlayerSceneIdx(sceneIdx);
  }, []);

  const renderHistoryDrawer = () => {
    if (!showHistoryDrawer) return null;
    return (
      <div className="fixed inset-0 z-50 flex justify-end bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
        <div
          className="fixed inset-0"
          onClick={() => setShowHistoryDrawer(false)}
          aria-hidden="true"
        />
        <div className="relative w-full max-w-md h-full bg-[#131618] border-l border-[#2e3237] flex flex-col shadow-2xl z-10">
          {/* Drawer Header */}
          <div className="p-4 border-b border-[#24282c] flex items-center justify-between bg-[#16191c]">
            <div className="flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-[#e6b784]/30 bg-[#e6b784]/10 text-[#e6b784]">
                <HistoryIcon className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-[#f1eee7]">Your Solves Library</h2>
                <p className="text-[11px] text-[#8b8d8f]">
                  {history.length} saved blackboard lecture{history.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowHistoryDrawer(false)}
              className="rounded-lg p-1.5 text-[#8b8d8f] hover:bg-[#23272b] hover:text-[#f1eee7] transition-all"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Search Filter */}
          {history.length > 2 && (
            <div className="p-3 border-b border-[#24282c] bg-[#141719]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#8b8d8f]" />
                <input
                  type="text"
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Search past solves…"
                  className="w-full rounded-xl border border-[#2b2f34] bg-[#1a1d20] pl-8 pr-3 py-1.5 text-xs text-[#f1eee7] placeholder:text-[#6e7276] focus:border-[#e6b784]/60 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Solves List */}
          <div className="flex-1 min-h-0 overflow-y-auto board-scroll p-3.5 space-y-3">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center px-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-[#2b2f34] bg-[#181b1d] text-[#8b8d8f] mb-3">
                  <Clapperboard className="h-6 w-6 text-[#e6b784]/60" />
                </div>
                <p className="text-xs font-semibold text-[#f1eee7]">No solves recorded yet</p>
                <p className="text-[11px] text-[#8b8d8f] mt-1 max-w-[240px]">
                  Type any problem on the home page to plan and watch your first blackboard lecture.
                </p>
              </div>
            ) : (
              history
                .filter((item) =>
                  historySearch
                    ? item.title.toLowerCase().includes(historySearch.toLowerCase()) ||
                      (item.subject && item.subject.toLowerCase().includes(historySearch.toLowerCase()))
                    : true
                )
                .map((item) => {
                  const isActive = script?.title === item.title;
                  return (
                    <div
                      key={item.id}
                      onClick={() => {
                        watch(item.script, item.id);
                        setShowHistoryDrawer(false);
                      }}
                      className={cn(
                        "group relative flex gap-3 rounded-xl border p-2.5 transition-all cursor-pointer",
                        isActive
                          ? "border-[#e6b784]/60 bg-[#e6b784]/10 shadow-sm"
                          : "border-[#26292e] bg-[#181b1d] hover:border-[#e6b784]/40 hover:bg-[#1f2226]"
                      )}
                    >
                      {/* Thumbnail */}
                      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-lg bg-black/80 border border-white/5">
                        {item.thumb ? (
                          <img src={item.thumb} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-white/30">
                            <Play className="h-4 w-4" />
                          </div>
                        )}
                        {item.durText && (
                          <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.2 text-[9px] font-mono text-[#f1eee7]">
                            {item.durText}
                          </span>
                        )}
                      </div>

                      {/* Metadata */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {item.subject && (
                              <span className="rounded bg-[#e6b784]/15 px-1.5 py-0.2 text-[9px] font-medium text-[#e6b784]">
                                {item.subject}
                              </span>
                            )}
                            <span className="text-[10px] text-[#8b8d8f]">
                              {fmtRelativeTime(item.timestamp)}
                            </span>
                          </div>
                          <h4 className="mt-1 line-clamp-1 text-xs font-semibold text-[#f1eee7] group-hover:text-[#e6b784] transition-colors">
                            {item.title}
                          </h4>
                        </div>

                        <div className="flex items-center justify-between pt-1 text-[10px] text-[#8b8d8f]">
                          <span>{item.script.scenes.length} steps</span>
                          <div className="flex items-center gap-1">
                            {item.isPublished && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUnpublish(item);
                                }}
                                title="Unpublish from Community Gallery"
                                className="rounded px-1.5 py-0.5 text-[10px] font-medium text-[#8b8d8f] hover:text-[#e6b784] hover:bg-white/5 transition-colors"
                              >
                                Unpublish
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={(e) => handleDeleteHistoryItem(item.id, e)}
                              title="Delete from history"
                              className="rounded p-1 text-[#8b8d8f] hover:bg-red-500/10 hover:text-red-400 transition-colors"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          {/* Drawer Footer */}
          {history.length > 0 && (
            <div className="p-3 border-t border-[#24282c] bg-[#16191c] flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  setHistory([]);
                  saveHistory([]);
                }}
                className="text-[11px] text-[#8b8d8f] hover:text-red-400 transition-colors font-medium"
              >
                Clear all library solves
              </button>
              <Button
                size="sm"
                onClick={() => setShowHistoryDrawer(false)}
                className="h-7 text-xs rounded-lg bg-[#282c31] hover:bg-[#34383e] text-[#f1eee7]"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderProfileModals = () => {
    if (!profileModal) return null;

    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={() => setProfileModal(null)}
      >
        <div
          className="relative w-full max-w-md rounded-2xl border border-white/[0.1] bg-[#14171d] p-6 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-white/[0.08]">
            <h3 className="text-base font-semibold text-[#f4f4f6]">
              {profileModal === "settings" && "Settings"}
              {profileModal === "upgrade" && "Upgrade Plan"}
              {profileModal === "help" && "Help & Support"}
              {profileModal === "learn" && "About Ember"}
              {profileModal === "language" && "Select Language"}
            </h3>
            <button
              type="button"
              onClick={() => setProfileModal(null)}
              className="rounded-lg p-1 text-[#8b919e] hover:bg-white/10 hover:text-[#f4f4f6]"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="pt-4 text-xs text-[#a0a6b2] space-y-4">
            {profileModal === "settings" && (
              <div className="space-y-4">
                <div>
                  <label className="text-[11px] font-mono uppercase text-[#6a7180] block mb-1">
                    Account Email
                  </label>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0c0e12] px-3 py-2 text-xs text-[#f4f4f6]">
                    {user?.email || "michaelejdah179@gmail.com"}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase text-[#6a7180] block mb-1.5">
                    Blackboard Theme
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { id: "blackboard", label: "Blackboard" },
                      { id: "green", label: "Green Slate" },
                      { id: "warm", label: "Warm Charcoal" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => changeTheme(t.id as any)}
                        className={cn(
                          "rounded-xl border p-2 text-center text-xs font-medium transition-all",
                          themeId === t.id
                            ? "border-[#e6b784] bg-[#e6b784]/15 text-[#e6b784]"
                            : "border-white/[0.08] bg-[#0c0e12] text-[#8b919e] hover:border-white/[0.16]"
                        )}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase text-[#6a7180] block mb-1">
                    Pedagogical Pacing
                  </label>
                  <div className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-[#0c0e12] px-3 py-2">
                    <span className="text-[#f4f4f6]">The Organic Chemistry Tutor</span>
                    <span className="font-mono text-[#5cdb95]">~110 WPM</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-mono uppercase text-[#6a7180] block mb-1.5">
                    Keyboard Shortcuts
                  </label>
                  <div className="rounded-xl border border-white/[0.08] bg-[#0c0e12] p-2.5 space-y-1.5 font-mono text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[#8b919e]">Solve Problem</span>
                      <span className="text-[#f4f4f6]">⌘ + ↵ / Ctrl + Enter</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8b919e]">Settings</span>
                      <span className="text-[#f4f4f6]">Ctrl + Shift + ,</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[#8b919e]">Play / Pause</span>
                      <span className="text-[#f4f4f6]">Space</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {profileModal === "upgrade" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-[#e6b784]/30 bg-[#e6b784]/10 p-4">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-[#e6b784]">Ember Pro</h4>
                    <span className="rounded-full bg-[#e6b784] px-2.5 py-0.5 text-[10px] font-bold text-[#141619]">
                      $15/mo
                    </span>
                  </div>
                  <ul className="mt-3 space-y-2 text-xs text-[#f4f4f6]">
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#5cdb95]" />
                      Unlimited AI blackboard derivations
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#5cdb95]" />
                      4K Ultra-HD video render &amp; export
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#5cdb95]" />
                      Custom voice cloning &amp; instructor styles
                    </li>
                    <li className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-[#5cdb95]" />
                      Priority rendering pipeline
                    </li>
                  </ul>
                </div>
                <Button
                  className="w-full rounded-xl bg-gradient-to-r from-[#e6b784] to-[#f2ca9e] text-[#141619] font-semibold"
                  onClick={() => alert("Ember Pro will be available at launch!")}
                >
                  Upgrade to Ember Pro
                </Button>
              </div>
            )}

            {profileModal === "help" && (
              <div className="space-y-3">
                <p className="text-xs leading-relaxed text-[#e0dfdb]">
                  Need assistance with your blackboard derivations or solving STEM problems?
                </p>
                <div className="rounded-xl border border-white/[0.08] bg-[#0c0e12] p-3 space-y-2">
                  <p className="font-semibold text-[#f4f4f6]">Quick Tips:</p>
                  <p>• Type any STEM problem, paste LaTeX equations, or attach a photo.</p>
                  <p>• Professor Ember frames the problem aloud before drawing each chalk stroke.</p>
                  <p>• Use Office Hours on the right to ask questions about any step.</p>
                </div>
                <p className="text-[11px] text-[#6a7180]">
                  Contact our support team anytime at <span className="text-[#e6b784]">support@ember-studio.com</span>
                </p>
              </div>
            )}

            {profileModal === "learn" && (
              <div className="space-y-3">
                <p className="leading-relaxed text-[#e0dfdb]">
                  Ember is an autonomous blackboard educational platform engineered for true human comprehension.
                </p>
                <div className="rounded-xl border border-white/[0.08] bg-[#0c0e12] p-3 space-y-1.5 font-mono text-[11px]">
                  <p className="text-[#e6b784]">Key Architecture:</p>
                  <p>• 108–114 WPM natural pacing</p>
                  <p>• Vector-curve chalk handwriting</p>
                  <p>• Deterministic proof planning</p>
                  <p>• Synchronous visual &amp; audio delivery</p>
                </div>
              </div>
            )}

            {profileModal === "language" && (
              <div className="space-y-1.5">
                {[
                  { name: "English (US)", active: true },
                  { name: "Spanish (Español)", active: false },
                  { name: "French (Français)", active: false },
                  { name: "German (Deutsch)", active: false },
                  { name: "Mandarin (中文)", active: false },
                ].map((lang) => (
                  <button
                    key={lang.name}
                    type="button"
                    onClick={() => setProfileModal(null)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl p-2.5 text-xs transition-colors",
                      lang.active
                        ? "bg-[#e6b784]/15 text-[#e6b784] font-semibold"
                        : "hover:bg-white/[0.05] text-[#8b919e]"
                    )}
                  >
                    <span>{lang.name}</span>
                    {lang.active && <Check className="h-3.5 w-3.5 text-[#e6b784]" />}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  /* ============================ AUTH GATE ============================ */
  if (!authLoading && !user) {
    return (
      <main className="ember-home flex min-h-dvh flex-col items-center justify-center p-6 bg-[#121517] text-[#f1eee7]">
        <div className="w-full max-w-md rounded-2xl border border-[#2b2f34] bg-[#16191b] p-8 text-center shadow-2xl">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#e6b784]/10 text-[#e6b784] mb-4">
            <Lock className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-semibold text-[#f1eee7]">
            Sign in to access Ember Studio
          </h2>
          <p className="mt-2 text-xs text-[#8b8d8f] leading-relaxed">
            Ember Studio requires an account to generate live blackboard derivations, save your solves history, and chat with Professor Ember.
          </p>
          <div className="mt-6 flex flex-col gap-3">
            <Button
              onClick={() => openAuthModal()}
              className="w-full rounded-xl bg-[#e6b784] font-semibold text-[#191816] hover:bg-[#f2ca9e]"
            >
              Sign In to Continue
            </Button>
            <Link
              href="/"
              className="text-xs text-[#8b8d8f] hover:text-[#f1eee7] transition"
            >
              ← Return to Landing Page
            </Link>
          </div>
        </div>
      </main>
    );
  }

  /* ============================ WATCH ============================ */

  if (phase === "watch" && script) {
    return (
      <main className="ember-watch h-dvh max-h-dvh flex flex-col overflow-hidden bg-[#0b0d10] text-[#f4f4f6]">
        {/* Pinned Top Navigation Bar — Frosted Obsidian Chrome */}
        <header className="h-16 shrink-0 border-b border-white/[0.06] bg-[#0b0d10]/85 px-4 sm:px-6 flex items-center justify-between z-30 backdrop-blur-xl">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                stopSpeaking();
                stopListening();
                setPhase("home");
                setScript(null);
              }}
              className="gap-1.5 rounded-xl border border-white/[0.08] bg-[#14171d] text-xs font-semibold text-[#8b919e] hover:bg-[#181c24] hover:text-[#f4f4f6] transition-all"
            >
              <X className="h-4 w-4" />
              Back
            </Button>
            <Wordmark />

            {/* Version Badge & Undo Scrubbing */}
            <div className="hidden sm:flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#14171d] px-2.5 py-1 text-xs">
              <span className="font-mono font-semibold text-[#e6b784]">
                v{currentVersionIdx + 1}
              </span>
              {scriptVersions.length > 1 && (
                <div className="ml-1.5 flex items-center gap-1 border-l border-white/[0.08] pl-1.5">
                  {scriptVersions.map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => switchToVersion(i)}
                      className={cn(
                        "h-4 w-4 rounded-full font-mono text-[10px] transition-colors",
                        i === currentVersionIdx
                          ? "bg-[#e6b784] font-bold text-[#141619]"
                          : "text-[#8b919e] hover:bg-white/[0.08] hover:text-[#f4f4f6]"
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
            {/* Solve History Library Button */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHistoryDrawer(true)}
              className="rounded-xl border-white/[0.08] bg-[#14171d] text-xs font-semibold text-[#a0a6b2] hover:border-[#e6b784]/40 hover:text-[#f4f4f6] transition-all"
            >
              <HistoryIcon className="h-3.5 w-3.5 mr-1.5 text-[#e6b784]" />
              History {history.length > 0 && `(${history.length})`}
            </Button>

            {/* Publish to Community Gallery Button */}
            <Button
              size="sm"
              variant="outline"
              disabled={isPublishing || published}
              onClick={handlePublish}
              className="rounded-xl border-[#e6b784]/30 bg-[#e6b784]/10 text-xs font-semibold text-[#e6b784] hover:bg-[#e6b784]/20 hover:text-[#f2ca9e] transition-all"
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
              onClick={() => {
                stopSpeaking();
                stopListening();
                setPhase("home");
              }}
              className="rounded-xl bg-gradient-to-r from-[#e6b784] to-[#f2ca9e] font-semibold text-[#141619] shadow-md shadow-[#e6b784]/20 hover:shadow-[#e6b784]/35 transition-all"
            >
              <Clapperboard className="h-4 w-4 mr-1.5" />
              New solve
            </Button>
          </div>
        </header>

        {/* Split Studio Body: Fills 100% of remaining viewport height */}
        <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
          {/* Left Column: Video Player Stage + Lecture Details */}
          <section className="flex-1 min-w-0 h-full overflow-y-auto board-scroll px-4 sm:px-8 py-6">
            <div className="mx-auto w-full max-w-4xl space-y-6 pb-12">
              <SolvePlayer
                ref={playerRef}
                script={script}
                themeId={themeId}
                onThemeChange={changeTheme}
                autoPlay
                seekRequest={seekReq}
                onVoiced={() => setVoiceVer((v) => v + 1)}
                onTimeUpdate={handleTimeUpdate}
              />

              {/* Title & Professor Details */}
              <div className="space-y-4">
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-[#f4f4f6] sm:text-3xl">
                    {script.title}
                  </h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#a0a6b2]">
                    {script.subject && (
                      <span className="rounded-md border border-[#e6b784]/30 bg-[#e6b784]/10 px-2.5 py-0.5 font-medium text-[#e6b784]">
                        {script.subject}
                      </span>
                    )}
                    <span>Taught by Professor Ember</span>
                    <span className="text-white/20">·</span>
                    <span className="font-mono text-[#6a7180]">
                      {script.scenes.length} steps planned
                    </span>
                  </div>
                </div>

                {/* Professor Profile Card */}
                <div className="flex items-center gap-4 rounded-2xl border border-white/[0.08] bg-[#12151b] p-4 shadow-sm">
                  <ChalkAvatar size={56} className="shrink-0 ring-1 ring-[#e6b784]/20" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-[#f4f4f6]">
                        {BRAND.professor.name}
                      </span>
                      <span className="rounded-full bg-[#e6b784]/15 px-2 py-0.5 font-mono text-[10px] font-medium text-[#e6b784]">
                        Lead Instructor
                      </span>
                    </div>
                    <div className="mt-1 text-xs leading-relaxed text-[#a0a6b2]">
                      {BRAND.professor.blurb}
                    </div>
                  </div>
                </div>

                {/* Problem Statement Card */}
                <div className="rounded-2xl border border-white/[0.08] bg-[#12151b] p-5 text-sm leading-relaxed text-[#f4f4f6]/90 shadow-sm">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-[#e6b784]">
                      Problem statement
                    </span>
                    <span className="font-mono text-[10px] text-[#6a7180]">
                      Original Prompt
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap leading-relaxed text-[#dfdeda]">
                    {script.question}
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Right Column: Studio Console & Office Hours Sidebar (PINNED CONTAINER) */}
          <aside className="w-full lg:w-[420px] xl:w-[460px] shrink-0 h-[460px] lg:h-full border-t lg:border-t-0 lg:border-l border-white/[0.06] bg-[#0e1015] flex flex-col overflow-hidden z-20">
            {/* Top Tab Bar: Chapters vs Office Hours */}
            <div className="shrink-0 p-3 border-b border-white/[0.06] bg-[#0a0c10]/90">
              <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-[#07080a] p-1">
                <button
                  type="button"
                  onClick={() => setActiveRightTab("chapters")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all",
                    activeRightTab === "chapters"
                      ? "bg-[#161920] text-[#f4f4f6] shadow-sm border border-white/[0.06]"
                      : "text-[#8b919e] hover:text-[#f4f4f6]"
                  )}
                >
                  <Layers className="h-3.5 w-3.5 text-[#e6b784]" />
                  Chapters ({chapterTimes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveRightTab("refine")}
                  className={cn(
                    "flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs font-semibold transition-all",
                    activeRightTab === "refine"
                      ? "bg-gradient-to-r from-[#e6b784] to-[#f2ca9e] text-[#141619] shadow-sm font-bold"
                      : "text-[#8b919e] hover:text-[#f4f4f6]"
                  )}
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Office Hours
                </button>
              </div>
            </div>


            {/* Tab 1: Chapters */}
            {activeRightTab === "chapters" && (
              <div className="flex-1 min-h-0 overflow-y-auto board-scroll p-3 space-y-1.5">
                <div className="px-2 py-1 text-[11px] font-mono uppercase tracking-wider text-[#8b8d8f]">
                  Lecture Roadmap
                </div>
                {chapterTimes.map((c, i) => {
                  const isCurrent = playerSceneIdx === i;
                  return (
                    <button
                      key={i}
                      type="button"
                      onClick={() => goChapter(c.t)}
                      className={cn(
                        "group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-left text-xs transition-all",
                        isCurrent
                          ? "border border-[#e6b784]/40 bg-[#e6b784]/10 text-[#f1eee7] shadow-sm font-medium"
                          : "border border-transparent text-[#a4a5a7] hover:bg-[#23262a] hover:text-[#f1eee7]"
                      )}
                    >
                      <div className="flex items-center gap-2">
                        {isCurrent ? (
                          <span className="flex h-2 w-2 rounded-full bg-[#e6b784] animate-pulse" />
                        ) : (
                          <span className="h-2 w-2 rounded-full bg-[#34383c]" />
                        )}
                        <span
                          className={cn(
                            "font-mono tabular-nums",
                            isCurrent ? "text-[#e6b784] font-semibold" : "text-[#8b8d8f]"
                          )}
                        >
                          {fmtDur(c.t)}
                        </span>
                      </div>
                      <span className="min-w-0 flex-1 truncate font-medium">
                        {c.label}
                      </span>
                      <Play className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100 text-[#e6b784] transition-opacity" />
                    </button>
                  );
                })}
              </div>
            )}

            {/* Tab 2: Refine with Ember / Office Hours (Interactive Studio) */}
            {activeRightTab === "refine" && (
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                {/* Office Hours Sub-header: Live Sync + Voice Mode Switch + Clear Thread */}
                <div className="shrink-0 px-3.5 py-2.5 border-b border-[#23262a] bg-[#141719] flex items-center justify-between text-xs">
                  {/* Live Context */}
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-2 w-2 rounded-full bg-[#5cdb95] animate-pulse shrink-0" />
                    <div className="flex items-center gap-1.5 min-w-0 truncate text-[11px]">
                      <span className="font-mono font-semibold text-[#e6b784]">
                        {fmtDur(playerTime)}
                      </span>
                      <span className="text-[#3e4247]">·</span>
                      <span
                        className="truncate text-[#a4a5a7] font-medium"
                        title={script.scenes[playerSceneIdx]?.chapter}
                      >
                        {script.scenes[playerSceneIdx]?.chapter || "Live timeline"}
                      </span>
                    </div>
                  </div>

                  {/* Controls: Voice Mode Toggle + Reset Thread */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        const nextState = !voiceModeActive;
                        setVoiceModeActive(nextState);
                        if (isSpeaking) stopSpeaking();
                      }}
                      title={
                        voiceModeActive
                          ? "Voice Mode active (Ember speaks answers aloud)"
                          : "Voice Mode muted (Click to enable spoken answers)"
                      }
                      className={cn(
                        "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-all",
                        voiceModeActive
                          ? "bg-[#e6b784]/20 text-[#e6b784] border border-[#e6b784]/40 shadow-xs"
                          : "bg-[#1c1f22] text-[#8b8d8f] hover:text-[#f1eee7] hover:bg-[#23262a] border border-[#2b2f33]"
                      )}
                    >
                      <Volume2 className="h-3.5 w-3.5" />
                      <span>Voice {voiceModeActive ? "On" : "Off"}</span>
                    </button>

                    {/* Past Chats Dropdown */}
                    {chatThreads.length > 0 && (
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowThreadsDropdown(!showThreadsDropdown)}
                          title="Past conversations for this solve"
                          className={cn(
                            "flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-all",
                            showThreadsDropdown
                              ? "border-[#e6b784]/50 bg-[#222529] text-[#e6b784]"
                              : "border-[#2b2f33] bg-[#1c1f22] text-[#8b8d8f] hover:text-[#f1eee7] hover:bg-[#23262a]"
                          )}
                        >
                          <MessageSquare className="h-3 w-3 text-[#e6b784]" />
                          <span>Chats ({chatThreads.length})</span>
                        </button>

                        {showThreadsDropdown && (
                          <div className="absolute right-0 top-full mt-1.5 z-40 w-64 rounded-xl border border-[#2e3237] bg-[#16191c] p-2 shadow-2xl backdrop-blur-md">
                            <div className="px-2 py-1 text-[10px] font-mono uppercase tracking-wider text-[#8b8d8f] border-b border-[#25282d] pb-1.5 mb-1.5 flex items-center justify-between">
                              <span>Past Conversations</span>
                              <button
                                type="button"
                                onClick={() => setShowThreadsDropdown(false)}
                                className="text-[#8b8d8f] hover:text-[#f1eee7]"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            <div className="max-h-52 overflow-y-auto space-y-1">
                              {chatThreads.map((t) => (
                                <div
                                  key={t.id}
                                  className="group flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-[#202428] text-left transition-colors cursor-pointer"
                                  onClick={() => handleSelectThread(t)}
                                >
                                  <div className="min-w-0 flex-1 pr-1.5">
                                    <p className="line-clamp-1 text-[11px] font-medium text-[#f1eee7] group-hover:text-[#e6b784]">
                                      {t.title}
                                    </p>
                                    <p className="text-[9px] text-[#8b8d8f]">
                                      {t.messages.length} msg{t.messages.length === 1 ? "" : "s"} · {fmtRelativeTime(t.createdAt)}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteThread(t.id);
                                    }}
                                    title="Delete conversation"
                                    className="opacity-0 group-hover:opacity-100 p-1 text-[#8b8d8f] hover:text-red-400 transition-opacity"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* New Chat Button */}
                    <button
                      type="button"
                      onClick={handleStartNewChat}
                      title="Start a fresh conversation thread for this solve"
                      className="flex items-center gap-1 rounded-lg border border-[#e6b784]/40 bg-[#e6b784]/15 px-2.5 py-1 text-[11px] font-semibold text-[#e6b784] hover:bg-[#e6b784]/25 hover:border-[#e6b784]/60 transition-all shadow-xs"
                    >
                      <Plus className="h-3 w-3" />
                      <span>New Chat</span>
                    </button>
                  </div>
                </div>

                {/* Message History List: flex-1 min-h-0 overflow-y-auto */}
                <div className="flex-1 min-h-0 overflow-y-auto board-scroll p-4 space-y-4">
                  {refineChat.map((msg, i) => {
                    const isUser = msg.role === "user";
                    const isSpeakingThis = isSpeaking && speakingMsgIndex === i;

                    if (isUser) {
                      return (
                        <div key={i} className="flex flex-col items-end gap-1 my-1">
                          <div className="rounded-2xl rounded-tr-xs bg-[#171a22] border border-white/[0.08] px-3.5 py-2 max-w-[85%] text-[12.5px] leading-relaxed text-[#f4f4f6] shadow-sm font-medium">
                            <p className="whitespace-pre-wrap">{msg.content}</p>
                          </div>
                          {msg.time !== undefined && (
                            <span className="font-mono text-[10px] text-[#6a7180] pr-1">
                              At {fmtDur(msg.time)}
                            </span>
                          )}
                        </div>
                      );
                    }

                    // Professor Ember Turn: lays directly on background like Claude & ChatGPT
                    return (
                      <div key={i} className="flex items-start gap-3 text-xs pt-1 pb-2">
                        {/* Avatar on Left */}
                        <div className="shrink-0 mt-0.5">
                          <ChalkAvatar size={24} className="ring-1 ring-[#e6b784]/30" />
                        </div>

                        {/* Right Content Stream: directly on canvas */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          {/* Sender Meta Header */}
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#f4f4f6] text-[12px]">
                              Professor Ember
                            </span>
                            {msg.mode === "edit" ? (
                              <span className="rounded-full bg-[#e6b784]/15 border border-[#e6b784]/30 px-2 py-0.5 font-mono text-[9px] text-[#e6b784] font-medium">
                                Board Revised
                              </span>
                            ) : (
                              <span className="text-[10px] text-[#6a7180]">
                                Office Hours
                              </span>
                            )}
                          </div>

                          {/* Content: formatted equations and text */}
                          <div className="text-[13px] leading-relaxed text-[#e0dfdb] space-y-2.5 [&>p]:leading-relaxed [&>ul]:list-disc [&>ul]:pl-5 [&>ol]:list-decimal [&>ol]:pl-5 [&>li]:mt-1 [&_strong]:text-[#f4f4f6] [&_strong]:font-semibold [&>code]:rounded-md [&>code]:bg-[#181a1f] [&>code]:px-1.5 [&>code]:py-0.5 [&>code]:text-[#f3cb9c] [&>code]:font-mono [&_.katex]:text-[#e6b784] [&_.katex-display]:my-3 [&_.katex-display]:overflow-x-auto [&_.katex-display]:py-2 [&_.katex-display]:px-3 [&_.katex-display]:rounded-xl [&_.katex-display]:bg-[#08090c] [&_.katex-display]:border [&_.katex-display]:border-white/[0.06]">
                            <ReactMarkdown
                              remarkPlugins={[remarkMath]}
                              rehypePlugins={[rehypeKatex]}
                            >
                              {formatMathText(msg.content)}
                            </ReactMarkdown>
                          </div>

                          {/* Subtle Micro-Action Bar */}
                          <div className="pt-1 flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => handleCopy(msg.content, i)}
                              className="flex items-center gap-1.5 rounded-md px-1.5 py-0.5 text-[11px] text-[#8b919e] hover:text-[#f4f4f6] hover:bg-white/5 transition-colors"
                              title="Copy explanation"
                            >
                              {copiedIdx === i ? (
                                <>
                                  <Check className="h-3 w-3 text-[#5cdb95]" />
                                  <span className="text-[#5cdb95]">Copied</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="h-3 w-3" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {/* Refining / Reviewing state */}
                  {isRefining && (
                    <div className="flex items-start gap-3 text-xs py-2">
                      <div className="shrink-0 mt-0.5">
                        <ChalkAvatar size={24} className="ring-1 ring-[#e6b784]/40 animate-pulse" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2 font-medium text-[#e6b784] text-[12px]">
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          <span>Professor Ember is analyzing the blackboard…</span>
                        </div>
                        <div className="text-[11px] text-[#8b919e]">
                          Reviewing equations and lecture pacing at this timestamp.
                        </div>
                      </div>
                    </div>
                  )}

                  <div ref={chatEndRef} />
                </div>

                {/* Single-Row Suggestion Carousel */}
                <div className="shrink-0 px-3.5 py-2 border-t border-white/[0.06] bg-[#0c0e12]/90 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
                  {[
                    "Why this formula?",
                    "Make step simpler",
                    "Explain current step",
                    "Highlight answer in yellow",
                    "Show intermediate algebra",
                  ].map((pill) => (
                    <button
                      key={pill}
                      type="button"
                      disabled={isRefining}
                      onClick={() => handleRefineSubmit(undefined, pill)}
                      className="shrink-0 rounded-full border border-white/[0.08] bg-[#12151b] px-3 py-1 text-[11px] font-medium text-[#8b919e] transition-all hover:border-[#e6b784]/50 hover:bg-[#181c24] hover:text-[#f4f4f6] disabled:opacity-50 whitespace-nowrap shadow-xs"
                    >
                      {pill}
                    </button>
                  ))}
                </div>

                {/* Live Speech & Audio Status Bar */}
                {isListening && (
                  <div className="shrink-0 px-4 py-2 bg-[#e6b784]/15 border-t border-[#e6b784]/30 flex items-center justify-between text-xs text-[#e6b784]">
                    <div className="flex items-center gap-2">
                      <span className="flex h-2 w-2 rounded-full bg-red-500 animate-ping" />
                      <span className="font-semibold">
                        Listening… Speak clearly to Ember
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={stopListening}
                      className="rounded-md bg-[#e6b784] px-2 py-0.5 text-[10px] font-bold text-[#141619]"
                    >
                      Done
                    </button>
                  </div>
                )}

                {isSpeaking && (
                  <div className="shrink-0 px-4 py-2 bg-[#14171d] border-t border-white/[0.08] flex items-center justify-between text-xs text-[#f4f4f6]">
                    <div className="flex items-center gap-2">
                      <Volume2 className="h-3.5 w-3.5 text-[#e6b784] animate-pulse" />
                      <span className="text-[11px]">
                        Professor Ember speaking aloud…
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={stopSpeaking}
                      className="rounded-md border border-white/[0.08] px-2 py-0.5 text-[10px] text-[#8b919e] hover:text-[#f4f4f6]"
                    >
                      Mute
                    </button>
                  </div>
                )}

                {/* Chat & Voice Input Console: PINNED AT THE BOTTOM, NEVER SCROLLS OFF-SCREEN */}
                <div className="shrink-0 p-3 sm:p-3.5 border-t border-white/[0.06] bg-[#090b0e]">
                  <form
                    onSubmit={(e) => {
                      if (isListening) stopListening();
                      handleRefineSubmit(e);
                    }}
                    className="relative flex items-center gap-1.5 rounded-2xl border border-white/[0.08] bg-[#12151b] p-1.5 focus-within:border-[#e6b784]/60 focus-within:ring-1 focus-within:ring-[#e6b784]/20 transition-all shadow-inner"
                  >
                    {/* Voice Mic Button */}
                    <button
                      type="button"
                      onClick={toggleListening}
                      disabled={isRefining}
                      title={
                        isListening
                          ? "Stop listening"
                          : "Speak to Professor Ember (Voice Mode)"
                      }
                      className={cn(
                        "h-8 w-8 shrink-0 rounded-xl flex items-center justify-center transition-all",
                        isListening
                          ? "bg-red-500/20 text-red-400 border border-red-500/50 animate-pulse shadow-sm"
                          : "text-[#8b919e] hover:text-[#e6b784] hover:bg-white/5"
                      )}
                    >
                      {isListening ? (
                        <MicOff className="h-4 w-4" />
                      ) : (
                        <Mic className="h-4 w-4" />
                      )}
                    </button>

                    {/* Chat Text Input */}
                    <input
                      type="text"
                      value={refineInstruction}
                      onChange={(e) => setRefineInstruction(e.target.value)}
                      placeholder={
                        isListening
                          ? "Listening to your voice…"
                          : "Ask Ember about this step, or tell her what to edit…"
                      }
                      disabled={isRefining}
                      className="flex-1 min-w-0 bg-transparent px-2.5 py-1 text-xs text-[#f4f4f6] placeholder:text-[#6a7180] focus:outline-none disabled:opacity-50"
                    />

                    {/* Send Button */}
                    <Button
                      type="submit"
                      size="sm"
                      disabled={!refineInstruction.trim() || isRefining}
                      className="h-8 w-8 rounded-xl bg-gradient-to-r from-[#e6b784] to-[#f2ca9e] text-[#141619] shadow-sm flex items-center justify-center font-bold transition-all disabled:opacity-30 shrink-0 p-0 hover:shadow-md hover:shadow-[#e6b784]/30"
                    >
                      {isRefining ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </form>
                </div>
              </div>
            )}
          </aside>
        </div>

        {/* Global History Slide-over Drawer */}
        {renderHistoryDrawer()}
      </main>
    );
  }

  /* ============================ HOME ============================= */

  return (
    <main className="ember-home flex min-h-dvh flex-col bg-[#0b0d10] text-[#f4f4f6]">
      {/* Studio Header — Frosted Obsidian Glass */}
      <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center justify-between border-b border-white/[0.06] bg-[#0b0d10]/80 px-6 backdrop-blur-xl sm:px-10">
        <div className="flex items-center gap-3.5">
          <Wordmark />
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowHistoryDrawer(true)}
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#14171d] px-3.5 py-1.5 text-xs font-semibold text-[#a0a6b2] transition-all hover:border-[#e6b784]/40 hover:text-[#f4f4f6]"
          >
            <HistoryIcon className="h-3.5 w-3.5 text-[#e6b784]" />
            Your Solves {history.length > 0 && `(${history.length})`}
          </button>
          <Link
            href="/gallery"
            className="flex items-center gap-1.5 rounded-xl border border-white/[0.08] bg-[#14171d] px-3.5 py-1.5 text-xs font-semibold text-[#a0a6b2] transition-all hover:border-[#e6b784]/40 hover:text-[#f4f4f6]"
          >
            <Globe className="h-3.5 w-3.5 text-[#e6b784]" />
            Community Gallery ↗
          </Link>

          {/* User Profile Avatar Dropdown (Shown only in Home) */}
          {user && (
            <div className="relative border-l border-white/[0.08] pl-2.5" ref={profileMenuRef}>
              <button
                type="button"
                onClick={() => setShowProfileMenu((prev) => !prev)}
                className="flex items-center gap-2 rounded-full border border-white/[0.08] bg-[#14171d] p-1 pr-2.5 transition-all hover:border-[#e6b784]/40 hover:bg-[#181c24] focus:outline-none"
                title="Account Profile & Settings"
                aria-expanded={showProfileMenu}
              >
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-[#e6b784] to-[#f2ca9e] text-xs font-bold text-[#141619] shadow-xs ring-1 ring-white/10">
                  {(user.displayName || user.email || "I").charAt(0).toUpperCase()}
                </div>
                <span className="hidden text-xs font-medium text-[#f4f4f6] sm:inline max-w-[120px] truncate">
                  {user.displayName || user.email?.split("@")[0] || "Profile"}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 text-[#8b919e] transition-transform", showProfileMenu && "rotate-180")} />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 rounded-2xl border border-white/[0.08] bg-[#1a1b1e] p-1.5 shadow-2xl backdrop-blur-xl z-50 animate-in fade-in zoom-in-95 duration-150">
                  {/* User Email Header */}
                  <div className="px-3 py-2 text-[12px] font-normal text-[#9aa0a6] truncate border-b border-white/[0.06]">
                    {user.email || "michaelejdah179@gmail.com"}
                  </div>

                  {/* Section 1: Settings, Language, Get help */}
                  <div className="py-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setProfileModal("settings");
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-[#e8eaed] hover:bg-white/[0.08] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="h-4 w-4 text-[#9aa0a6]" />
                        <span>Settings</span>
                      </div>
                      <span className="font-mono text-[10.5px] text-[#6a7180]">
                        Ctrl+Shift+,
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setProfileModal("language");
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-[#e8eaed] hover:bg-white/[0.08] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Globe className="h-4 w-4 text-[#9aa0a6]" />
                        <span>Language</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setProfileModal("help");
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-[#e8eaed] hover:bg-white/[0.08] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <HelpCircle className="h-4 w-4 text-[#9aa0a6]" />
                        <span>Get help</span>
                      </div>
                    </button>
                  </div>

                  {/* Divider 1 */}
                  <div className="my-1 border-t border-white/[0.08]" />

                  {/* Section 2: Upgrade plan, Learn more */}
                  <div className="py-1 space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setProfileModal("upgrade");
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-[#e8eaed] hover:bg-white/[0.08] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <ArrowUpCircle className="h-4 w-4 text-[#9aa0a6]" />
                        <span>Upgrade plan</span>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setShowProfileMenu(false);
                        setProfileModal("learn");
                      }}
                      className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-xs text-[#e8eaed] hover:bg-white/[0.08] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <Info className="h-4 w-4 text-[#9aa0a6]" />
                        <span>Learn more</span>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-[#6a7180]" />
                    </button>
                  </div>

                  {/* Divider 2 */}
                  <div className="my-1 border-t border-white/[0.08]" />

                  {/* Section 3: Log out */}
                  <div className="pt-0.5">
                    <button
                      type="button"
                      onClick={async () => {
                        setShowProfileMenu(false);
                        await signOut();
                        window.location.href = "/";
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-xs text-[#e8eaed] hover:bg-white/[0.08] hover:text-red-400 transition-colors"
                    >
                      <LogOut className="h-4 w-4 text-[#9aa0a6]" />
                      <span>Log out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* running/finished job — floats under the header; NEVER pushes the page */}
      {jobStatus && !overlayOpen && jobStatus.id !== watchedJobId && jobStatus.phase !== "error" && (
        <div className="fixed left-1/2 top-20 z-40 w-[min(92vw,600px)] -translate-x-1/2 px-4">
          <ResumeCard
            status={jobStatus}
            onWatch={watchReady}
            onReopen={reopenJob}
            onDismiss={clearJob}
          />
        </div>
      )}

      {/* Hero & Command Composer */}
      <section className="mx-auto flex w-full max-w-5xl flex-1 flex-col items-center px-4 pt-10 pb-16 sm:px-6 sm:pt-14 sm:pb-20">
        {/* Minimalist Hero Copy */}
        <div className="text-center max-w-lg mx-auto space-y-2.5">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-0.5 text-[11px] font-semibold text-[#e6b784] tracking-wide font-mono">
            <Sparkles className="h-3 w-3" />
            Interactive Blackboard Studio
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-semibold tracking-tight text-[#f4f4f6]">
            Every problem, <span className="font-hand font-medium text-[#e6b784]">a lesson.</span>
          </h1>
          <p className="text-xs sm:text-sm text-[#8b919e] max-w-sm mx-auto leading-relaxed">
            Paste any STEM problem. Professor Ember plans the derivation, chalks the board, and teaches it.
          </p>
        </div>

        {/* Command Center Composer */}
        <div className="mt-8 sm:mt-10 w-full max-w-[720px]">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              generate(question);
            }}
            className="group relative rounded-2xl border border-white/[0.08] bg-[#12151b]/95 p-3 sm:p-3.5 shadow-2xl shadow-black/50 focus-within:border-[#e6b784]/60 focus-within:ring-1 focus-within:ring-[#e6b784]/20 transition-all"
          >
            <Textarea
              ref={textareaRef}
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                  e.preventDefault();
                  generate(question);
                }
              }}
              rows={2}
              placeholder="Paste any math, physics, chemistry, or engineering problem…"
              aria-label="Your question"
              className="min-h-[64px] sm:min-h-[72px] resize-none border-0 bg-transparent px-2.5 py-1 font-sans text-sm leading-relaxed text-[#f4f4f6] placeholder:text-[#6a7180] focus-visible:ring-0"
            />

            {/* Attached Image Preview */}
            {attachedImage && (
              <div className="mt-1.5 mb-2 flex items-center gap-2.5 rounded-xl border border-white/[0.08] bg-[#161a22] p-1.5 pr-2.5">
                <img
                  src={attachedImage}
                  alt="Attachment"
                  className="h-8 w-8 rounded-lg object-cover border border-white/10"
                />
                <span className="text-xs text-[#f4f4f6] font-medium">Image attached</span>
                <button
                  type="button"
                  onClick={() => setAttachedImage(null)}
                  className="ml-auto rounded-lg p-1 text-[#8b919e] hover:bg-white/10 hover:text-[#f4f4f6]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            {/* Inner Bottom Controls Strip */}
            <div className="flex items-center justify-between border-t border-white/[0.06] pt-2.5 px-1 mt-1">
              <div className="flex items-center gap-2">
                <label className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.03] text-[#8b919e] transition hover:border-white/[0.16] hover:bg-white/[0.08] hover:text-[#f4f4f6]">
                  <Paperclip className="h-3.5 w-3.5" />
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
                    className="rounded-xl px-2.5 py-1 text-xs text-[#8b919e] hover:text-[#f4f4f6] transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="flex items-center gap-3">
                <div className="hidden sm:flex items-center gap-1 font-mono text-[10px] text-[#6a7180]">
                  <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1 py-0.5">⌘</span>
                  <span className="rounded border border-white/[0.08] bg-white/[0.03] px-1 py-0.5">↵</span>
                  <span className="ml-0.5">to solve</span>
                </div>

                <span className="font-mono text-[11px] text-[#6a7180]">
                  {question.length}/600
                </span>

                <Button
                  type="submit"
                  disabled={!question.trim() || jobBusy || question.length > 600}
                  className="h-8 rounded-xl bg-gradient-to-r from-[#e6b784] to-[#f2ca9e] px-4 text-xs font-semibold text-[#141619] shadow-md shadow-[#e6b784]/20 hover:shadow-[#e6b784]/35 transition-all active:scale-95 disabled:opacity-30"
                >
                  Start lesson
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </div>
            </div>
          </form>

          {/* Quick Prompt Pills */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {CURATED_PILLS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setQuestion(p)}
                disabled={jobBusy}
                className="max-w-full truncate rounded-full border border-white/[0.08] bg-[#12151b] px-3.5 py-1.5 text-[11px] font-medium text-[#8b919e] transition-all hover:border-[#e6b784]/40 hover:bg-[#181c24] hover:text-[#f4f4f6] disabled:opacity-50 shadow-xs"
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        {/* Curated Starters Video Showcase */}
        <div id="lessons" className="mt-8 sm:mt-10 w-full scroll-mt-20">
          <div className="flex items-center gap-2 mb-3.5">
            <Sparkles className="h-4 w-4 text-[#e6b784]" />
            <h2 className="text-sm font-semibold text-[#f1eee7]">Curated Starters</h2>
          </div>

          {/* Videos Grid */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 w-full">
              {SAMPLE_LESSONS.map((item) => {
                const thumbUrl = sampleThumbs[item.title];
                const durText = sampleDurs[item.title] || "3:00";
                return (
                  <div
                    key={item.title}
                    className="group relative flex flex-col rounded-2xl border border-[#282c31] bg-[#16191b] overflow-hidden transition-all duration-200 hover:border-[#e6b784]/50 hover:shadow-xl hover:shadow-black/50 cursor-pointer"
                    role="button"
                    tabIndex={0}
                    aria-label={`Watch ${item.title}`}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        watch(item);
                      }
                    }}
                    onClick={() => watch(item)}
                  >
                    {/* 16:9 Aspect Ratio Thumbnail Container */}
                    <div className="relative aspect-video w-full overflow-hidden bg-black/90">
                      {thumbUrl ? (
                        <img
                          src={thumbUrl}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center bg-zinc-950">
                          <Play className="h-8 w-8 text-white/30" />
                        </div>
                      )}

                      {/* Play Hover Overlay */}
                      <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 backdrop-blur-[1px] transition-all duration-200 group-hover:opacity-100">
                        <span className="scale-75 rounded-full bg-[#e6b784] p-3 text-[#191816] shadow-lg transition-transform duration-200 group-hover:scale-100 flex items-center justify-center">
                          <Play className="h-5 w-5 fill-current ml-0.5" />
                        </span>
                      </div>

                      {/* Top-Left Subject Badge */}
                      {item.subject && (
                        <div className="absolute top-2.5 left-2.5">
                          <span className="rounded-md bg-black/75 border border-white/10 px-2 py-0.5 text-[10px] font-medium text-[#f1eee7]/90 backdrop-blur-md">
                            {item.subject}
                          </span>
                        </div>
                      )}

                      {/* Duration Badge */}
                      <div className="absolute bottom-2.5 right-2.5 rounded-md bg-black/85 border border-white/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#f1eee7] shadow-sm backdrop-blur-md">
                        {durText}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-3 flex flex-col flex-1 justify-between gap-2">
                      <div>
                        <h3 className="line-clamp-1 text-sm font-semibold text-[#f1eee7] group-hover:text-[#e6b784] transition-colors">
                          {formatMathTitle(item.title)}
                        </h3>
                        <p className="line-clamp-1 mt-0.5 text-xs text-[#8b8d8f] leading-relaxed">
                          {item.question}
                        </p>
                      </div>

                      <div className="flex items-center justify-between border-t border-[#23272b] pt-2 text-xs text-[#8b8d8f]">
                        <span className="text-[11px] text-[#a4a5a7]">
                          Taught by Professor Ember
                        </span>
                        <span className="text-[11px] font-mono text-[#8b8d8f]">
                          {item.scenes.length} steps
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
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

      {/* Global History Slide-over Drawer */}
      {renderHistoryDrawer()}

      {/* Profile & Settings Modals */}
      {renderProfileModals()}
    </main>
  );
}
