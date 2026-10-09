import React, { useEffect, useLayoutEffect, useRef, useState } from "react";
import { AbsoluteFill, Audio, Sequence, interpolate, registerRoot, Composition, staticFile, useCurrentFrame, useVideoConfig, delayRender, continueRender } from "remotion";
import { StudioTourScene } from "../../src/components/landing/ProductWalkthrough";
import { compileTimeline } from "../../src/lib/video/compile";
import { renderFrame } from "../../src/lib/video/render";
import { THEMES, type SolveScript } from "../../src/lib/video/types";
import { TOUR_LESSON } from "../../src/lib/product-walkthrough";
import MathCopy from "../../src/components/MathCopy";
import { galleryPublisher } from "../../src/lib/gallery-presentation";
import "./app.css";
import "../../node_modules/katex/dist/katex.min.css";
import "./film.css";
import "./visual-scenes.css";
import { DemoBoard, LessonScene, Pipeline, GallerySequence } from "./VisualScenes";
import { demoDuration } from "./lesson";

type Segment = { id: string; title: string; text: string; duration: number; audio?: string; captions: { start: number; end: number; text: string }[] };
export type FilmProps = { segments: Segment[]; gallery: { id: string; title: string; description?: string; publisher: string; script: SolveScript }[] };
const fps = 30;
const timeline = compileTimeline(TOUR_LESSON);

function Board({ time }: { time: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const ctx = ref.current?.getContext("2d"); if (ctx) renderFrame(ctx, timeline, time, THEMES.blackboard, { pen: true }); }, [time]);
  return <canvas ref={ref} width={1280} height={720} className="film-board" />;
}

function Architecture({ seconds }: { seconds: number }) {
  const nodes = [
    ["Director", "Plans the learning arc"], ["Transcript planner", "Writes the spoken lesson"], ["Scene writers", "Parallel board choreography"],
    ["Scene reviewer", "Review + bounded repair"], ["Compiler + checks", "Board layout · supported arithmetic"], ["Player + voice", "Seekable board · queued speech"],
  ];
  const active = Math.min(5, Math.floor(seconds / 5));
  return <div className="architecture">
    <div className="architecture-input">Student’s question</div>
    <div className="architecture-chain">{nodes.map(([title, description], index) => <React.Fragment key={title}><div className={`architecture-node ${index === active ? "node-active" : ""}`} style={{ opacity: index <= active ? 1 : .55 }}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{description}</p>{index === 2 && <div className="writer-stack"><i /> <i /> <i /></div>}</div>{index < 5 && <span className="architecture-arrow">→</span>}</React.Fragment>)}</div>
    <div className="architecture-rail"><div><h3>Independent solver</h3><p>Separate answer comparison</p></div><span>→</span><div><h3>Delivery gate</h3><p>Rejected reviews and board errors block release.<br />Unresolved verification is not proof of correctness.</p></div></div>
    <p className="architecture-note">A coordinated lesson pipeline—not a claim that every generated answer is correct.</p>
  </div>;
}

function Scene({ segment, gallery }: { segment: Segment; gallery: FilmProps["gallery"] }) {
  const frame = useCurrentFrame();
  const sec = frame / fps;
  const duration = segment.duration;
  const opacity = interpolate(frame, [0, 12, duration * fps - 12, duration * fps], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const caption = segment.captions.find(c => sec >= c.start && sec < c.end)?.text;
  const opening = segment.id === "opening" || segment.id === "close";
  let progress = 0;
  if (segment.id === "question") progress = sec < duration * .55 ? Math.min(3.7, sec * .45) / 29 : (4 + Math.min(3.8, (sec - duration * .55) * .5)) / 29;
  if (segment.id === "watch") progress = (8 + Math.min(13.8, sec * .7)) / 29;
  if (segment.id === "control") progress = sec < duration * .35 ? 18 / 29 : (22 + Math.min(6.8, (sec - duration * .35) * .6)) / 29;
  const ui = ["question", "watch", "control"].includes(segment.id);
  return <AbsoluteFill className="film-scene" style={{ opacity }}>
    <div className="film-topline"><strong>Ember<span>Every problem, a lesson.</span></strong><span>Introductory university STEM · working prototype</span></div>
    {opening ? <div className="film-opening"><p className="film-eyebrow">{segment.id === "opening" ? "Make the reasoning visible" : "A learning workspace, not just an answer"}</p><h1>{segment.title}</h1><div className="opening-board"><DemoBoard time={segment.id === "opening" ? demoDuration * (.1 + .9 * Math.min(1, sec / (duration * .9))) : demoDuration} /></div><p className="film-small">Reviewed worked example · actual stroke renderer · visual progression condensed</p></div> : <>
      <div className="film-title"><span className="film-eyebrow">{segment.id === "architecture" ? "Inside the architecture" : segment.id === "gallery" ? "Community discovery" : "The learning experience"}</span><h2>{segment.title}</h2></div>
      {segment.id === "question" && <div className="film-product"><StudioTourScene progress={progress} /><span className="film-disclosure">Prepared walkthrough · production UI components · generation condensed</span></div>}
      {(segment.id === "watch" || segment.id === "control") && <LessonScene seconds={sec} duration={duration} controls={segment.id === "control"} />}
      {segment.id === "architecture" && <Pipeline seconds={sec} duration={duration} />}
      {segment.id === "render" && <div className="render-scene"><div className="render-board"><DemoBoard time={demoDuration * (.35 + .65 * Math.min(1, sec / (duration * .7)))} /></div><div className="render-copy"><h3>Structured beats</h3><p>Write · point · erase · diagrams</p><h3>One board timeline</h3><p>Stroke paths · chapters · seeking</p><h3>Speech coordination</h3><p>Narration anchors · pauses · audio timing</p><span>Alignment remains an active area of refinement.</span><div className="demo-waveform">{Array.from({length:32},(_,i)=><i key={i} style={{height:18+Math.sin(i*1.9)**2*45,opacity:sec/duration>i/32?1:.2}} />)}</div><small>Illustrative audio timing—not a measured waveform</small></div></div>}
      {segment.id === "gallery" && <GallerySequence seconds={sec} duration={duration} items={gallery} />}
    </>}
    <div className="film-caption">{caption}</div>
    {segment.audio && <Audio src={staticFile(segment.audio)} />}
  </AbsoluteFill>;
}

export function Film({ segments, gallery }: FilmProps) {
  const [fontHandle] = useState(() => delayRender("Load board and equation fonts"));
  const [fontsReady, setFontsReady] = useState(false);
  useEffect(() => {
    let alive = true;
    Promise.all([document.fonts.load('24px "BoardHand"'), document.fonts.ready]).then(() => { if (alive) { setFontsReady(true); continueRender(fontHandle); } });
    return () => { alive = false; };
  }, [fontHandle]);
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  if (!fontsReady) return <AbsoluteFill className="film-root" />;
  return <AbsoluteFill className="film-root">{segments.map((segment, index) => {
    const start = segments.slice(0, index).reduce((total, previous) => total + Math.ceil(previous.duration * fps), 0);
    const frames = Math.ceil(segment.duration * fps);
    return <Sequence key={segment.id} from={start} durationInFrames={frames}><Scene segment={segment} gallery={gallery} /></Sequence>;
  })}<div className="film-progress" style={{ transform: `scaleX(${frame / durationInFrames})` }} /></AbsoluteFill>;
}
registerRoot(() => <Composition id="EmberDevpost" component={Film} width={1920} height={1080} fps={fps} durationInFrames={5400} defaultProps={{ segments: [], gallery: [] }} calculateMetadata={({ props }) => ({ durationInFrames: Math.max(1, props.segments.reduce((total, segment) => total + Math.ceil(segment.duration * fps), 0)) })} />);
