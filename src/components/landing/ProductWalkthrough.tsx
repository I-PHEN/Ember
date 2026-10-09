"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ArrowRight, Paperclip, Pause, Play, RotateCcw } from "lucide-react";
import Wordmark from "@/components/Wordmark";
import GenerateOverlay from "@/components/GenerateOverlay";
import SolvePlayer from "@/components/player/SolvePlayer";
import { Textarea } from "@/components/ui/textarea";
import { STUDIO_QUESTION_CLASS } from "@/components/studio/question-style";
import StudioConsoleTabs from "@/components/studio/StudioConsoleTabs";
import { SAMPLE_CALCULUS } from "@/lib/samples";
import type { VideoJobStatus } from "@/lib/use-video-job";
import { TOUR_LESSON, WALKTHROUGH_SECONDS, WALKTHROUGH_STAGES, walkthroughState, WALKTHROUGH_PROMPT } from "@/lib/product-walkthrough";

// The real master lesson's assignment chapter, not separately animated text.
const EXPLANATION = "Choose u = x because differentiating it gives du = dx. The polynomial becomes simpler, while integrating e²ˣ is straightforward. Choosing u = e²ˣ would leave a higher power of x inside the next integral.";
const ignoreLeave = () => {};

export function StudioTourScene({ progress }: { progress: number }) {
  const viewport = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ scale: .6, small: false });
  useEffect(() => {
    const element = viewport.current;
    if (!element) return;
    const resize = new ResizeObserver(entries => {
      const width = entries[0].contentRect.width;
      const small = width < 500;
      setSize({ scale: width / (small ? 760 : 1000), small });
    });
    resize.observe(element);
    return () => resize.disconnect();
  }, []);
  const { stage, local, boardTime, typed } = walkthroughState(progress);
  const status: VideoJobStatus = { id: "prepared-preview", phase: local < .3 ? "directing" : local < .6 ? "scripting" : local < .85 ? "boarding" : "voicing", question: WALKTHROUGH_PROMPT, title: "Integration by parts", createdAt: 0, at: 0, etaWatchMs: 0, etaVoiceMs: 0, scenesTotal: 6, scenesDone: Math.floor(local * 6), voicesTotal: 6, voicesDone: Math.floor(Math.max(0, local - .6) * 15), progressPct: local * 95, script: null, error: null };
  return <div className="studio-tour-viewport" style={{ aspectRatio: size.small ? "760 / 625" : "1000 / 625" }} ref={viewport}><div className={`studio-tour-scene tour-stage-${stage}${size.small ? " tour-mobile" : ""}`} style={{ width: size.small ? 760 : 1000, transform: `scale(${size.scale})` }} inert aria-hidden="true">
    <div className="tour-app-header"><Wordmark /><span>{stage < 2 ? "Studio" : "Integration by parts"}</span><span>{stage < 2 ? "History · Gallery" : "New solve"}</span></div>
    {stage === 0 && <div className="tour-compose-screen">
      <span className="tour-badge">Interactive Blackboard Studio</span>
      <h3>Every problem, <span className="font-hand">a lesson.</span></h3>
      <p>Professor Ember plans the derivation, chalks the board, and teaches it.</p>
      <div className="tour-question-form"><Textarea value={typed} readOnly aria-label="Prepared example question" className={STUDIO_QUESTION_CLASS} /><div><Paperclip size={14} /><span>Enter to generate</span><span className="tour-generate-button">Generate <ArrowRight size={12} /></span></div></div>
    </div>}
    {stage === 1 && <div className="tour-generation-screen"><GenerateOverlay embedded status={status} nowMs={0} onLeave={ignoreLeave} /><span className="tour-speed-note">Generation condensed for this walkthrough</span></div>}
    {stage >= 2 && <div className="tour-watch-screen">
      <div className="tour-board-column"><SolvePlayer script={TOUR_LESSON} themeId="blackboard" presentationTime={stage === 3 ? 14 : boardTime} /><div className="tour-lesson-title"><strong>Integration by parts</strong><span>Calculus · Taught by Professor Ember · Chapter excerpt</span></div></div>
      <aside className="tour-sidebar"><StudioConsoleTabs activeTab={stage === 2 ? "chapters" : "refine"} chapterCount={SAMPLE_CALCULUS.scenes.length} onSelect={ignoreLeave} />{stage === 2 ? <div className="tour-chapter-list">{SAMPLE_CALCULUS.scenes.map((scene, index) => <span className={index === 2 ? "active" : ""} key={scene.chapter}>{scene.chapter}</span>)}</div> : <div className="tour-refine-chat"><div className="tour-user-message">{"Why do we choose u = x?".slice(0, Math.floor(Math.min(1, local / .3) * 25))}</div><div className="tour-answer" style={{ opacity: Math.max(0, Math.min(1, (local - .3) / .18)) }}><strong>Professor Ember</strong><p>{EXPLANATION}</p></div><div className="tour-chat-input">Ask Ember about this step… <ArrowRight size={12} /></div></div>}</aside>
    </div>}
  </div></div>;
}

export default function ProductWalkthrough() {
  const reducedMotion = useReducedMotion();
  const [progress, setProgress] = useState(.001);
  const [paused, setPaused] = useState(false);
  const elapsed = useRef(0);
  const frame = useRef(0);
  const [visible, setVisible] = useState(true);
  const inView = useRef(true);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const onVisibility = () => setVisible(inView.current && !document.hidden);
    document.addEventListener("visibilitychange", onVisibility);
    const observer = new IntersectionObserver(entries => { inView.current = entries[0].isIntersecting; onVisibility(); });
    if (host.current) observer.observe(host.current);
    return () => { observer.disconnect(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);
  useEffect(() => {
    if (paused || reducedMotion !== false || !visible) return;
    let previous: number | null = null;
    const tick = (now: number) => {
      if (previous !== null) elapsed.current = (elapsed.current + Math.min(.1, (now - previous) / 1000)) % WALKTHROUGH_SECONDS;
      previous = now;
      setProgress(elapsed.current / WALKTHROUGH_SECONDS);
      frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [paused, reducedMotion, visible]);
  const stage = walkthroughState(progress).stage;
  const selectStage = (index: number) => {
    elapsed.current = [2.8, 6, 18, 26][index];
    setProgress(elapsed.current / WALKTHROUGH_SECONDS);
    setPaused(true);
  };
  return <div className="product-walkthrough" ref={host}>
    <div className="tour-topline"><span>Inside Ember</span><span>Prepared product walkthrough · silent</span></div>
    <StudioTourScene progress={progress} />
    <div className="tour-controls"><div className="tour-stage-buttons" aria-label="Walkthrough stages">{WALKTHROUGH_STAGES.map((label, index) => <button key={label} aria-pressed={stage === index} onClick={() => selectStage(index)}>{label}</button>)}</div><button aria-label={paused || reducedMotion ? "Play walkthrough" : "Pause walkthrough"} disabled={!!reducedMotion} onClick={() => setPaused(value => !value)}>{paused || reducedMotion ? <Play size={14} /> : <Pause size={14} />}</button><button aria-label="Replay walkthrough" onClick={() => { elapsed.current = 0; setProgress(0); setPaused(!!reducedMotion); }}><RotateCcw size={14} /></button></div>
    <p className="tour-caption">{["Start with your question.", "A coordinated team builds the lesson.", "Follow the writing, chapter by chapter.", "Ask about the step you want to understand."][stage]}</p>
  </div>;
}
