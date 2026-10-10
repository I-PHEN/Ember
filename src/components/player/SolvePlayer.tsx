"use client";
import { storedAudioKey } from "@/lib/video/recorded-audio";

/* ------------------------------------------------------------------
   SolvePlayer — a real video player for AI-generated solve videos.
   Fixed 16:9 canvas board (no scrolling), deterministic timeline →
   seek anywhere instantly, chapter bar, ±10s, speed, mute, theme
   switch, fullscreen, keyboard shortcuts, narration synced to the
   writing.
------------------------------------------------------------------- */

import {
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  forwardRef,
} from "react";
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Palette,
  Loader2,
  Subtitles,
} from "lucide-react";
import {
  THEMES,
  THEME_ORDER,
  sceneAt,
  sceneStart,
  totalDuration,
  type BoardThemeId,
  type SolveScript,
  type Timeline,
} from "@/lib/video/types";
import { compileTimeline, lockScene, setSceneAudio } from "@/lib/video/compile";
import { renderFrame } from "@/lib/video/render";
import { SceneAudio, BASE_SPEECH_RATE } from "@/lib/video/audio";
import { narrationStore } from "@/lib/narration-store";
import { cn } from "@/lib/utils";

const SPEEDS = [1, 1.25, 1.5, 2, 0.75];

/** how long the player will buffer at a scene boundary waiting for a
 *  late voice before it plays that scene silent (3500ms = buffer like YouTube) */
const VOICE_HOLD_MS = 3500;

/** split narration into caption-sized sentences (merge tiny ones so a
 *  caption never flashes for a fraction of a second) */
function captionChunks(text: string): string[] {
  const parts: string[] = [];
  let cur = "";
  for (const ch of text) {
    cur += ch;
    if (ch === "." || ch === "!" || ch === "?") {
      if (cur.trim()) parts.push(cur.trim());
      cur = "";
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  const out: string[] = [];
  for (const p of parts) {
    if (out.length && (out[out.length - 1].length < 25 || p.length < 25)) {
      out[out.length - 1] += " " + p;
    } else {
      out.push(p);
    }
  }
  return out;
}

export interface SolvePlayerHandle {
  seekTo: (t: number) => void;
  togglePlay: () => void;
  timeline: () => Timeline;
}

export interface SolvePlayerProps {
  script: SolveScript;
  themeId: BoardThemeId;
  onThemeChange?: (t: BoardThemeId) => void;
  mini?: boolean;
  autoPlay?: boolean;
  /** parent-driven seeks (chapter list) */
  seekRequest?: { t: number; n: number } | null;
  onVoiced?: (sceneIdx: number) => void;
  onTimeUpdate?: (time: number, sceneIndex: number) => void;
  className?: string;
}

function fmtTime(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, "0")}`;
}

function probeDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const a = new Audio();
    a.preload = "metadata";
    const to = setTimeout(() => reject(new Error("probe timeout")), 9000);
    a.addEventListener(
      "loadedmetadata",
      () => {
        clearTimeout(to);
        resolve(a.duration);
      },
      { once: true }
    );
    a.addEventListener(
      "error",
      () => {
        clearTimeout(to);
        reject(new Error("probe error"));
      },
      { once: true }
    );
    a.src = url;
  });
}

const SolvePlayer = forwardRef<SolvePlayerHandle, SolvePlayerProps>(
  function SolvePlayer(
    {
      script,
      themeId,
      onThemeChange,
      mini = false,
      autoPlay = false,
      seekRequest,
      onVoiced,
      onTimeUpdate,
      className,
    },
    ref
  ) {
    const tl = useMemo(() => compileTimeline(script), [script]);
    const theme = THEMES[themeId];
    const [, bumpDur] = useReducer((x: number) => x + 1, 0);

    const wrapRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const audioRef = useRef<SceneAudio | null>(null);
    const clockRef = useRef({ t: 0, playing: false, rate: 1, ended: false });
    const rafRef = useRef(0);
    const lastNowRef = useRef(0);
    const lastUiRef = useRef(0);
    const dirtyRef = useRef(true);
    const scrubRef = useRef<{ active: boolean; wasPlaying: boolean }>({
      active: false,
      wasPlaying: false,
    });
    const readyRef = useRef<boolean[]>([]);
    const gaveUpRef = useRef<boolean[]>([]);
    const holdSinceRef = useRef<Record<number, number>>({});
    const lastSceneRef = useRef(-1);
    const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const [uiT, setUiT] = useState(0);
    const [playing, setPlaying] = useState(false);
    const [ended, setEnded] = useState(false);
    const [waiting, setWaiting] = useState(false);
    const [blocked, setBlocked] = useState(false);
    const [rate, setRate] = useState(1);
    const [muted, setMuted] = useState(mini);
    const [controlsOn, setControlsOn] = useState(!mini);
    const [fullscreen, setFullscreen] = useState(false);
    const [hover, setHover] = useState<{ x: number; t: number; chapter: string } | null>(null);
    const [themeMenu, setThemeMenu] = useState(false);
    const [captions, setCaptions] = useState(false);

    const total = totalDuration(tl);
    const totalRef = useRef(total);
    useEffect(() => {
      totalRef.current = total;
    }, [total]);

    useEffect(() => {
      if (audioRef.current == null) audioRef.current = new SceneAudio();
      return () => {
        audioRef.current?.dispose();
        cancelAnimationFrame(rafRef.current);
      };
    }, []);

    /* narration fetch — the store owns retries/patience; this loop owns
       ORDER: the scene under the playhead first (so seeking never waits
       behind scenes the user isn't watching), everything else in
       playback order */
    useEffect(() => {
      if (mini) return;
      let cancelled = false;
      readyRef.current = tl.scenes.map(() => false);
      gaveUpRef.current = tl.scenes.map(() => false);
      holdSinceRef.current = {};
      (async () => {
        const pending: number[] = [];
        for (let i = 0; i < tl.scenes.length; i++) {
          if (tl.scenes[i].narration) pending.push(i);
          else readyRef.current[i] = true;
        }
        while (!cancelled && pending.length) {
          /* serve the playhead's scene first if it is still pending */
          const cur = sceneAt(tl, clockRef.current.t);
          let pick = pending.indexOf(cur);
          if (pick === -1) pick = 0;
          const idx = pending.splice(pick, 1)[0];
          try {
            const url = await narrationStore.get(tl.scenes[idx].narration!, "jam", storedAudioKey(script.scenes[idx]));
            if (cancelled) return;
            const dur = await probeDuration(url);
            if (cancelled) return;
            const effectiveDur = dur / BASE_SPEECH_RATE;
            audioRef.current?.attach(idx, url, effectiveDur);
            setSceneAudio(tl, idx, effectiveDur);
            readyRef.current[idx] = true;
            onVoiced?.(idx);
            bumpDur();
          } catch {
            /* the store already retried for minutes — play this scene
               silent, but keep fetching the rest */
            gaveUpRef.current[idx] = true;
          }
          dirtyRef.current = true;
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [tl, mini]);

    /* --------------------------- canvas ----------------------------- */

    const draw = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const w = canvas.clientWidth || 640;
      const h = (w * 720) / 1280;
      const dpr = Math.min(2.5, window.devicePixelRatio || 1);
      const needW = Math.round(w * dpr);
      if (canvas.width !== needW) {
        canvas.width = needW;
        canvas.height = Math.round(h * dpr);
      }
      const s = canvas.width / 1280;
      ctx.setTransform(s, 0, 0, s, 0, 0);
      renderFrame(ctx, tl, clockRef.current.t, theme);
    }, [tl, theme]);

    useEffect(() => {
      dirtyRef.current = true;
      draw();
    }, [draw]);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ro = new ResizeObserver(() => {
        dirtyRef.current = true;
        draw();
      });
      ro.observe(canvas);
      return () => ro.disconnect();
    }, [draw]);

    /* ------------------------- clock loop --------------------------- */

    const emitUi = useCallback(() => {
      const curT = clockRef.current.t;
      setUiT(curT);
      setPlaying(clockRef.current.playing);
      setEnded(clockRef.current.ended);
      if (onTimeUpdate) {
        const idx = sceneAt(tl, curT);
        onTimeUpdate(curT, idx);
      }
    }, [onTimeUpdate, tl]);

    const tickFn = useRef<(now: number) => void>(() => undefined);

    const tick = useCallback(
      (now: number) => {
        rafRef.current = requestAnimationFrame((n) => tickFn.current(n));
        const dt = Math.min(0.1, (now - lastNowRef.current) / 1000);
        lastNowRef.current = now;
        const c = clockRef.current;
        const totalNow = totalRef.current;

        if (c.playing && !scrubRef.current.active) {
          const idx = sceneAt(tl, c.t);
          if (idx !== lastSceneRef.current) {
            for (let k = 0; k <= idx; k++) lockScene(tl, k);
            lastSceneRef.current = idx;
          }
          const scene = tl.scenes[idx];
          const needsVoice =
            !mini &&
            !!scene.narration &&
            !readyRef.current[idx] &&
            !gaveUpRef.current[idx];
          const atEnd = c.t >= totalNow - 0.02;
          /* buffer like YouTube: entering a scene (or ending the video)
             whose voice isn't recorded yet holds the clock while the
             narration store keeps retrying — capped, then the scene
             plays silent rather than freezing forever */
          let holding = false;
          if (needsVoice && VOICE_HOLD_MS > 0) {
            const atSceneEntry = c.t <= sceneStart(tl, idx) + 0.06;
            if (atEnd || atSceneEntry) {
              if (holdSinceRef.current[idx] === undefined) {
                holdSinceRef.current[idx] = now;
              } else if (now - holdSinceRef.current[idx] > VOICE_HOLD_MS) {
                gaveUpRef.current[idx] = true; // stop waiting on this one
              } else {
                holding = true;
              }
            }
          }
          if (holding) {
            setWaiting(true);
          } else {
            setWaiting(false);
            c.t = Math.min(c.t + dt * c.rate, totalNow);
            if (c.t >= totalNow - 0.001) {
              if (mini) {
                c.t = 0;
                lastSceneRef.current = -1;
              } else {
                c.playing = false;
                c.ended = true;
                audioRef.current?.pauseAll();
                emitUi();
              }
            }
          }
          dirtyRef.current = true;
        }

        if (!mini) {
          const idx = sceneAt(tl, c.t);
          const offset = c.t - sceneStart(tl, idx);
          const b = audioRef.current?.tick(
            idx,
            offset,
            c.playing && !scrubRef.current.active,
            c.rate,
            muted
          );
          if (b && !blocked) setBlocked(true);
        }

        if (dirtyRef.current || c.playing) {
          draw();
          dirtyRef.current = false;
          if (now - lastUiRef.current > 120) {
            lastUiRef.current = now;
            emitUi();
          }
        }
      },
      [tl, mini, muted, blocked, draw, emitUi]
    );

    useEffect(() => {
      tickFn.current = tick;
    });

    useEffect(() => {
      lastNowRef.current = performance.now();
      rafRef.current = requestAnimationFrame((n) => tickFn.current(n));
      return () => cancelAnimationFrame(rafRef.current);
    }, []);

    /* -------------------------- controls --------------------------- */

    const seek = useCallback(
      (t: number) => {
        const c = clockRef.current;
        const totalNow = totalRef.current;
        c.t = Math.max(0, Math.min(t, Math.max(0, totalNow - 0.01)));
        if (c.t < totalNow - 0.05) c.ended = false;
        const idx = sceneAt(tl, c.t);
        for (let k = 0; k <= idx; k++) lockScene(tl, k);
        lastSceneRef.current = idx;
        dirtyRef.current = true;
        emitUi();
      },
      [tl, emitUi]
    );

    const play = useCallback(() => {
      const c = clockRef.current;
      if (c.ended) {
        c.t = 0;
        c.ended = false;
        lastSceneRef.current = -1;
      }
      c.playing = true;
      lastNowRef.current = performance.now();
      emitUi();
    }, [emitUi]);

    const pause = useCallback(() => {
      clockRef.current.playing = false;
      audioRef.current?.pauseAll();
      emitUi();
    }, [emitUi]);

    const togglePlay = useCallback(() => {
      if (clockRef.current.playing) pause();
      else play();
    }, [pause, play]);

    const skip = useCallback(
      (d: number) => {
        seek(clockRef.current.t + d);
      },
      [seek]
    );

    const hasAutoPlayedRef = useRef(false);

    useEffect(() => {
      hasAutoPlayedRef.current = false;
    }, [script]);

    useEffect(() => {
      if (autoPlay && !hasAutoPlayedRef.current) {
        hasAutoPlayedRef.current = true;
        const id = setTimeout(() => {
          const c = clockRef.current;
          if (c.ended) {
            c.t = 0;
            c.ended = false;
            lastSceneRef.current = -1;
          }
          c.playing = true;
          lastNowRef.current = performance.now();
          emitUi();
        }, 150);
        return () => clearTimeout(id);
      }
    }, [autoPlay, script, emitUi]);

    useEffect(() => {
      if (seekRequest) seek(seekRequest.t);
       
    }, [seekRequest?.n]);

    useEffect(() => {
      clockRef.current.rate = rate;
    }, [rate]);

    const cycleSpeed = useCallback(() => {
      setRate((r) => SPEEDS[(SPEEDS.indexOf(r) + 1) % SPEEDS.length]);
    }, []);

    const toggleMute = useCallback(() => setMuted((m) => !m), []);

    const toggleFullscreen = useCallback(() => {
      const el = wrapRef.current;
      if (!el) return;
      if (!document.fullscreenElement) {
        void el.requestFullscreen?.().catch(() => undefined);
      } else {
        void document.exitFullscreen?.().catch(() => undefined);
      }
    }, []);

    useEffect(() => {
      const onFs = () => {
        setFullscreen(!!document.fullscreenElement);
        dirtyRef.current = true;
      };
      document.addEventListener("fullscreenchange", onFs);
      return () => document.removeEventListener("fullscreenchange", onFs);
    }, []);

    /* unlock audio after a browser block */
    useEffect(() => {
      if (!blocked || mini) return;
      const unlock = () => {
        setBlocked(false);
        audioRef.current?.retry();
        dirtyRef.current = true;
      };
      window.addEventListener("pointerdown", unlock, { once: true });
      window.addEventListener("keydown", unlock, { once: true });
      return () => {
        window.removeEventListener("pointerdown", unlock);
        window.removeEventListener("keydown", unlock);
      };
    }, [blocked, mini]);

    /* keyboard */
    useEffect(() => {
      if (mini) return;
      const onKey = (e: KeyboardEvent) => {
        const tag = (e.target as HTMLElement | null)?.tagName?.toLowerCase();
        if (tag === "input" || tag === "textarea" || tag === "select") return;
        switch (e.key.toLowerCase()) {
          case " ":
          case "k":
            e.preventDefault();
            togglePlay();
            break;
          case "j":
            skip(-10);
            break;
          case "l":
            skip(10);
            break;
          case "arrowleft":
            e.preventDefault();
            skip(-5);
            break;
          case "arrowright":
            e.preventDefault();
            skip(5);
            break;
          case "f":
            toggleFullscreen();
            break;
          case "m":
            toggleMute();
            break;
          case "c":
            setCaptions((c) => !c);
            break;
          default:
            if (/^[0-9]$/.test(e.key)) {
              seek((totalRef.current * Number(e.key)) / 10);
            }
        }
      };
      window.addEventListener("keydown", onKey);
      return () => window.removeEventListener("keydown", onKey);
    }, [togglePlay, skip, seek, toggleFullscreen, toggleMute, mini]);

    /* auto-hide controls */
    const pokeControls = useCallback(() => {
      if (mini) return;
      setControlsOn(true);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      hideTimerRef.current = setTimeout(() => {
        if (clockRef.current.playing) setControlsOn(false);
      }, 2600);
    }, [mini]);

    useEffect(() => {
      const id = setTimeout(() => {
        if (!clockRef.current.playing) setControlsOn(true);
      }, 0);
      return () => clearTimeout(id);
    }, [playing]);

    useEffect(
      () => () => {
        if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
      },
      []
    );

    /* ------------------------- seek bar ---------------------------- */

    const sceneStarts = useMemo(() => {
      const arr: number[] = [];
      let acc = 0;
      for (const s of tl.scenes) {
        arr.push(acc);
        acc += s.dur;
      }
      return arr;
    }, [tl]);

    const chapterAt = useCallback(
      (t: number): string => {
        let acc = 0;
        for (const s of tl.scenes) {
          acc += s.dur;
          if (t < acc) return s.chapter;
        }
        return tl.scenes[tl.scenes.length - 1]?.chapter ?? "";
      },
      [tl]
    );

    const barToTime = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>): number => {
        const rect = e.currentTarget.getBoundingClientRect();
        const f = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        return f * totalRef.current;
      },
      []
    );

    const onBarDown = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        scrubRef.current = {
          active: true,
          wasPlaying: clockRef.current.playing,
        };
        clockRef.current.playing = false;
        seek(barToTime(e));
      },
      [barToTime, seek]
    );

    const onBarMove = useCallback(
      (e: ReactPointerEvent<HTMLDivElement>) => {
        const t = barToTime(e);
        const rect = e.currentTarget.getBoundingClientRect();
        setHover({ x: e.clientX - rect.left, t, chapter: chapterAt(t) });
        if (scrubRef.current.active) seek(t);
      },
      [barToTime, chapterAt, seek]
    );

    const onBarUp = useCallback(() => {
      const { active, wasPlaying } = scrubRef.current;
      scrubRef.current = { active: false, wasPlaying: false };
      if (active && wasPlaying) play();
    }, [play]);

    /* ------------------------- board tap --------------------------- */

    const onBoardTap = useCallback(() => {
      if (mini) {
        if (clockRef.current.ended) {
          seek(0);
          play();
        }
        return;
      }
      togglePlay();
      pokeControls();
    }, [mini, togglePlay, pokeControls, seek, play]);

    const onBoardDouble = useCallback(() => {
      if (!mini) toggleFullscreen();
    }, [mini, toggleFullscreen]);

    /* -------------------------- exposed ----------------------------- */

    useImperativeHandle(
      ref,
      () => ({
        seekTo: (t: number) => seek(t),
        togglePlay,
        timeline: () => tl,
      }),
      [seek, togglePlay, tl]
    );

    /* --------------------------- render ----------------------------- */

    const currentScene = sceneAt(tl, uiT);
    const scene = tl.scenes[currentScene];
    const chapter = scene?.chapter ?? "";
    const inIntro = scene?.intro === true;
    const playedFrac = total > 0 ? uiT / total : 0;

    /* caption for the current moment — sentence chunks distributed
       proportionally across the scene's narration window */
    const captionText = (() => {
      if (!captions || mini || !scene?.narration) return null;
      const start = sceneStart(tl, currentScene);
      const t0 = start + scene.head;
      const t1 = start + Math.max(scene.dur - 0.15, t0 + 1);
      const off = Math.max(0, Math.min(uiT, t1) - t0);
      const chunks = captionChunks(scene.narration);
      const totalChars = chunks.reduce((a, c) => a + c.length, 0);
      let acc = 0;
      for (const c of chunks) {
        const cStart = (acc / totalChars) * (t1 - t0);
        acc += c.length;
        const cEnd = (acc / totalChars) * (t1 - t0);
        if (off >= cStart && off < cEnd) return c;
      }
      return null;
    })();

    const ctrlBtn =
      "flex h-9 w-9 items-center justify-center rounded-full text-white/90 transition hover:bg-white/15 hover:text-white";

    return (
      <div
        ref={wrapRef}
        className={cn(
          "group relative w-full select-none overflow-hidden bg-black",
          fullscreen ? "rounded-none" : "rounded-2xl",
          "shadow-2xl shadow-black/50 ring-1 ring-white/10",
          className
        )}
        style={{ aspectRatio: "16 / 9" }}
        onPointerMove={pokeControls}
        onPointerLeave={() => {
          if (playing && !mini) setControlsOn(false);
          setHover(null);
        }}
      >
        <canvas
          ref={canvasRef}
          className="absolute inset-0 h-full w-full cursor-pointer"
          onPointerUp={(e) => {
            if (e.pointerType !== "mouse" || e.button === 0) onBoardTap();
          }}
          onDoubleClick={onBoardDouble}
          aria-label={`Solve video board — ${tl.title}`}
        />

        {/* chapter chip (top-left) — hidden during the trademark intro,
            where the board itself is the brand */}
        {!mini && !inIntro && (controlsOn || !playing) && (
          <div className="pointer-events-none absolute left-4 top-4 max-w-[70%] rounded-lg bg-black/55 px-3 py-1.5 text-[13px] font-medium text-white/90 backdrop-blur-sm">
            {chapter}
          </div>
        )}

        {/* captions (CC) */}
        {captionText && (
          <div
            className={cn(
              "pointer-events-none absolute left-1/2 z-[5] max-w-[82%] -translate-x-1/2 rounded-lg bg-black/75 px-3.5 py-1.5 text-center text-[15px] leading-snug text-white transition-all duration-200",
              controlsOn || !playing ? "bottom-[68px]" : "bottom-5"
            )}
          >
            {captionText}
          </div>
        )}

        {/* center states — big play only BEFORE first play (like YouTube,
            pausing mid-video never covers the board with an overlay) */}
        {!mini && !playing && !ended && !waiting && uiT < 0.2 && (
          <button
            onClick={togglePlay}
            aria-label="Play"
            className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-black/65"
          >
            <Play className="ml-1 h-9 w-9" fill="currentColor" />
          </button>
        )}
        {!mini && ended && (
          <button
            onClick={() => {
              seek(0);
              play();
            }}
            aria-label="Replay"
            className="absolute inset-0 m-auto flex h-20 w-20 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm transition hover:scale-105 hover:bg-black/65"
          >
            <RotateCcw className="h-9 w-9" />
          </button>
        )}
        {waiting && (
          <div className="pointer-events-none absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/60 px-4 py-2 text-[13px] text-white/90 backdrop-blur-sm">
            <Loader2 className="h-4 w-4 animate-spin" />
            recording the voice…
          </div>
        )}
        {blocked && !mini && (
          <button
            onClick={() => {
              setBlocked(false);
              audioRef.current?.retry();
            }}
            className="absolute bottom-20 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-mk-orange px-4 py-2 text-[13px] font-semibold text-[#14161b] shadow-lg"
          >
            <Volume2 className="h-4 w-4" />
            Tap for sound
          </button>
        )}

        {mini && ended && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-black/55 px-3 py-1 text-[11px] text-white/85">
            click to replay
          </div>
        )}

        {/* control bar */}
        {!mini && (
          <div
            className={cn(
              "absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/45 to-transparent px-3 pb-2 pt-8 transition-opacity duration-200",
              controlsOn || !playing ? "opacity-100" : "pointer-events-none opacity-0"
            )}
          >
            {/* seek bar */}
            <div
              className="group/bar relative -mx-1 cursor-pointer px-1 pb-2 pt-3"
              onPointerDown={onBarDown}
              onPointerMove={onBarMove}
              onPointerUp={onBarUp}
              onPointerLeave={() => setHover(null)}
              role="slider"
              aria-label="Seek"
              aria-valuemin={0}
              aria-valuemax={Math.round(total)}
              aria-valuenow={Math.round(uiT)}
              tabIndex={0}
            >
              <div className="relative h-1.5 w-full rounded-full bg-white/25 transition-all group-hover/bar:h-2">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-mk-orange"
                  style={{ width: `${playedFrac * 100}%` }}
                />
                {sceneStarts.slice(1).map((s, i) => (
                  <div
                    key={i}
                    className="absolute inset-y-0 w-0.5 bg-black/70"
                    style={{ left: `${(s / Math.max(total, 0.01)) * 100}%` }}
                  />
                ))}
                <div
                  className="absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 scale-0 rounded-full bg-mk-orange shadow transition-transform group-hover/bar:scale-100"
                  style={{ left: `${playedFrac * 100}%` }}
                />
              </div>
              {hover && (
                <div
                  className="pointer-events-none absolute -top-9 z-20 -translate-x-1/2 whitespace-nowrap rounded-md bg-black/85 px-2.5 py-1 text-[12px] text-white"
                  style={{ left: hover.x }}
                >
                  <span className="font-semibold">{fmtTime(hover.t)}</span>
                  <span className="text-white/60"> · {hover.chapter}</span>
                </div>
              )}
            </div>

            {/* buttons row */}
            <div className="flex items-center gap-0.5">
              <button onClick={togglePlay} className={ctrlBtn} aria-label={playing ? "Pause" : "Play"}>
                {playing ? (
                  <Pause className="h-5 w-5" />
                ) : (
                  <Play className="h-5 w-5" fill="currentColor" />
                )}
              </button>
              <button onClick={toggleMute} className={ctrlBtn} aria-label={muted ? "Unmute" : "Mute"}>
                {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
              </button>
              <div className="ml-1.5 flex items-center gap-1.5 text-[13px] tabular-nums text-white/90">
                <span className="font-medium">{fmtTime(uiT)}</span>
                <span className="text-white/45">/ {fmtTime(total)}</span>
              </div>

              <div className="flex-1" />

              <button
                onClick={cycleSpeed}
                className="flex h-9 min-w-12 items-center justify-center rounded-full px-2 text-[13px] font-semibold text-white/90 transition hover:bg-white/15"
                aria-label="Playback speed"
              >
                {rate}×
              </button>

              {/* captions (CC) */}
              <button
                onClick={() => setCaptions((c) => !c)}
                className={cn(
                  ctrlBtn,
                  captions && "bg-white/20 text-white hover:bg-white/25"
                )}
                aria-label={captions ? "Turn off captions" : "Turn on captions"}
                aria-pressed={captions}
                title="Captions (C)"
              >
                <Subtitles className="h-5 w-5" />
              </button>

              {/* theme picker */}
              <div className="relative">
                <button
                  onClick={() => setThemeMenu((v) => !v)}
                  className={ctrlBtn}
                  aria-label="Board theme"
                >
                  <Palette className="h-5 w-5" />
                </button>
                {themeMenu && (
                  <>
                    <div className="fixed inset-0 z-20" onClick={() => setThemeMenu(false)} />
                    <div className="absolute bottom-11 right-0 z-30 w-40 overflow-hidden rounded-xl border border-white/10 bg-[#181b22] p-1 shadow-2xl">
                      {THEME_ORDER.map((id) => {
                        const t = THEMES[id];
                        const active = id === themeId;
                        return (
                          <button
                            key={id}
                            onClick={() => {
                              onThemeChange?.(id);
                              setThemeMenu(false);
                            }}
                            className={cn(
                              "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-white/85 transition hover:bg-white/10",
                              active && "bg-white/10 text-white"
                            )}
                          >
                            <span
                              className="h-4 w-4 rounded-full border border-white/25"
                              style={{ background: t.bg }}
                            />
                            {t.label}
                            {active && <span className="ml-auto text-mk-orange">•</span>}
                          </button>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              <button
                onClick={toggleFullscreen}
                className={ctrlBtn}
                aria-label={fullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {fullscreen ? <Minimize className="h-5 w-5" /> : <Maximize className="h-5 w-5" />}
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }
);

export default SolvePlayer;
