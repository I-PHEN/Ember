import React, { useEffect, useState } from "react";
import { AbsoluteFill, Audio, Sequence, registerRoot, Composition, staticFile, useCurrentFrame, delayRender, continueRender } from "remotion";
import StudioPage from "../../src/app/studio/page";
import GalleryPage from "../../src/app/gallery/page";
import { ReadOnlyAuthProvider } from "../../src/lib/firebase/auth-context";
import { DemoPresentationProvider, type DemoPresentation } from "../../src/lib/demo-presentation";
import type { SolveScript } from "../../src/lib/video/types";
import { BookOpen, Network, MessagesSquare } from "lucide-react";
import { Pipeline, Cursor } from "./VisualScenes";
import { DEMO_LESSON, demoDuration, writingClock } from "./lesson";
import "./app.css";
import "../../node_modules/katex/dist/katex.min.css";
import "./visual-scenes.css";
import "./fullscreen.css";

type Segment = { id: string; title: string; text: string; duration: number; audio?: string; captions: { start: number; end: number; text: string }[] };
export type FilmProps = { segments: Segment[]; gallery: { id: string; title: string; description?: string; publisher: string; script: SolveScript; upvotes?: number; views?: number; createdAt?: number }[] };
const fps = 30;
const question = "Evaluate the integral of x times e^(2x) using integration by parts.";
const ease = (p: number, a: number, b: number) => { const t = Math.max(0, Math.min(1, (p-a)/(b-a))); return t*t*(3-2*t); };

function Scene({ segment, gallery }: { segment: Segment; gallery: FilmProps["gallery"] }) {
  const sec = useCurrentFrame() / fps;
  const p = sec / segment.duration;
  const control = segment.id === "control";
  const refining = control && p >= .53;
  const galleryView = segment.id === "gallery" && p < .63;
  const entering = segment.id === "question";
  const architecture = segment.id === "architecture";
  const diagram = architecture && ((p >= .14 && p < .38) || (p >= .54 && p < .82));
  const home = (segment.id === "opening" && p < .10) || (entering && p < .87) || (architecture && p < .14);
  const paused = writingClock(4, 1000);
  const revisited = writingClock(2, 1000);
  const boardTime = segment.id === "opening" ? writingClock(0, Math.max(0, sec-segment.duration*.10))
    : architecture ? (p < .82 ? writingClock(3,Math.max(0,sec-segment.duration*.38)) : demoDuration)
    : segment.id === "watch" ? writingClock(2, sec)
    : segment.id === "render" ? writingClock(5, sec)
    : control ? (p < .3 ? paused : p < .46 ? paused - ease(p,.3,.46)*(paused-revisited) : revisited)
    : entering ? writingClock(0, Math.max(0, sec-segment.duration*.87)) : demoDuration;
  const generation = entering && p >= .43 && p < .87;
  const value: DemoPresentation = {
    phase: home ? "home" : "watch", script: home ? null : DEMO_LESSON,
    question: entering ? question.slice(0, Math.floor(ease(p,.03,.35)*question.length)) : architecture ? question : "",
    boardTime, paused: (control && p >= .10) || segment.id === "close" || segment.id === "gallery", tab: refining ? "refine" : "chapters",
    themeId: segment.id === "opening" || entering ? "blackboard" : control && p >= .23 ? "paper" : "whiteboard",
    themeMenuOpen: control && p >= .15 && p < .27,
    instruction: refining && p < .72 ? "Why do we choose u = x?".slice(0,Math.floor(ease(p,.55,.70)*23)) : "",
    messages: refining && p >= .72 ? [
      {role:"user",content:"Why do we choose u = x?"},
      ...(p >= .78 ? [{role:"ember" as const,mode:"answer" as const,content:"Choose **u = x** because differentiating the polynomial makes it simpler: $du = dx$. Integrating the exponential gives $v = \\frac12 e^{2x}$. This removes x from the remaining integral."}] : []),
    ] : [],
    gallery: gallery.map(item=>({...item,upvotes:item.upvotes??0,views:item.views??0,createdAt:item.createdAt??0})),
    search: galleryView ? "integration".slice(0,Math.floor(ease(p,.12,.34)*11)) : "",
    ...(generation ? {jobStatus:{id:"offline-prepared",phase:p<.55?"directing":p<.68?"scripting":"boarding",question,title:"Integration by parts",createdAt:0,scenesTotal:6,scenesDone:Math.floor(ease(p,.68,.87)*6),voicesTotal:6,voicesDone:0,etaWatchMs:0,etaVoiceMs:0,script:null,error:null,progressPct:Math.floor(ease(p,.43,.87)*90),at:0}} : {}),
  };
  const caption = segment.captions.find(c=>sec>=c.start&&sec<c.end)?.text;
  const disclosure = segment.id === "close" ? "Future direction · API and live tutoring are planned, not available today"
    : architecture ? "Illustrative architecture · checks do not prove correctness"
    : generation ? "Prepared generation sequence · condensed, not a speed benchmark"
    : refining ? "Actual Office Hours UI · prepared exchange, not a live response"
    : segment.id === "gallery" && !galleryView ? "Reviewed excerpt of this question · not a live gallery replay"
    : "Actual Ember interface · prepared offline walkthrough";
  const cx = control ? p < .11 ? 500+(72-500)*ease(p,.02,.10)
    : p < .16 ? 72+(870-72)*ease(p,.11,.15)
    : p < .23 ? 870+(790-870)*ease(p,.17,.22)
    : p < .30 ? 790+(726-790)*ease(p,.27,.30)
    : p < .46 ? 726+(379-726)*ease(p,.30,.46)
    : p < .55 ? 379+(1320-379)*ease(p,.46,.53)
    : 1320+(1190-1320)*ease(p,.55,.62) : 610+(1000-610)*ease(p,.35,.42);
  const cy = control ? p < .11 ? 360+(566-360)*ease(p,.02,.10)
    : p < .16 ? 566
    : p < .23 ? 566+(518-566)*ease(p,.17,.22)
    : p < .30 ? 518+(537-518)*ease(p,.27,.30)
    : p < .46 ? 537 : p < .55 ? 537+(95-537)*ease(p,.46,.53)
    : 95+(770-95)*ease(p,.55,.62) : 380+(466-380)*ease(p,.35,.42);
  return <AbsoluteFill className="full-screen-film">
    {segment.id === "close" ? <FutureClosing progress={p}/>
      : diagram ? <AbsoluteFill className="full-screen-architecture"><div><span>INSIDE EMBER</span><h1>One lesson. A coordinated crew.</h1></div><Pipeline seconds={sec} duration={segment.duration}/></AbsoluteFill>
      : <div className="full-screen-app" inert><ReadOnlyAuthProvider><DemoPresentationProvider value={value}>{galleryView ? <GalleryPage/> : <StudioPage/>}</DemoPresentationProvider></ReadOnlyAuthProvider></div>}
    {entering && !generation && home && <Cursor x={cx} y={cy} click={p>.41&&p<.43}/>}
    {control && <Cursor x={cx} y={cy} click={(p>.095&&p<.12)||(p>.145&&p<.17)||(p>.22&&p<.245)||(p>.51&&p<.55)}/>}
    <div className="full-screen-disclosure">{disclosure}</div>
    {caption && <div className="full-screen-caption">{caption}</div>}
    {segment.audio && <Audio src={staticFile(segment.audio)} volume={.82}/>}
  </AbsoluteFill>;
}

function FutureClosing({progress}:{progress:number}) {
  const stages = [
    {icon:BookOpen,title:"A growing lesson library",copy:"Discover and revisit explanations",start:.20},
    {icon:Network,title:"Ember inside learning platforms",copy:"An API for platforms and institutions",start:.43},
    {icon:MessagesSquare,title:"Live tutoring, alongside lessons",copy:"Immediate conversation + structured explanations",start:.67},
  ];
  return <AbsoluteFill className="future-closing"><span className="future-label">WHAT’S NEXT · FUTURE DIRECTION</span><h1>From one question<br/>to a wider world of learning.</h1><div className="future-stages">{stages.map(({icon:Icon,title,copy,start})=><div key={title} style={{opacity:ease(progress,start,start+.09),transform:`translateY(${(1-ease(progress,start,start+.09))*24}px)`}}><Icon size={30}/><h2>{title}</h2><p>{copy}</p><small>Planned—not available today</small></div>)}</div><div className="future-signoff" style={{opacity:ease(progress,.83,.93)}}>Ember<span>Every problem, a lesson.</span></div></AbsoluteFill>;
}

export function Film({ segments, gallery }: FilmProps) {
  const [fontHandle] = useState(()=>delayRender("Load production fonts"));
  const [ready,setReady] = useState(false);
  useEffect(()=>{let alive=true; Promise.all([document.fonts.load('24px "BoardHand"'),document.fonts.ready]).then(()=>{if(alive){setReady(true);continueRender(fontHandle);}});return()=>{alive=false;};},[fontHandle]);
  return <AbsoluteFill className="full-screen-film antialiased">{ready && <Audio src={staticFile("audio/ember-original-score.wav")}/>} {ready && segments.map((segment,index)=><Sequence key={segment.id} from={segments.slice(0,index).reduce((sum,s)=>sum+Math.ceil(s.duration*fps),0)} durationInFrames={Math.ceil(segment.duration*fps)}><Scene segment={segment} gallery={gallery}/></Sequence>)}</AbsoluteFill>;
}
registerRoot(()=><Composition id="EmberDevpost" component={Film} width={1440} height={810} fps={fps} durationInFrames={5400} defaultProps={{segments:[],gallery:[]}} calculateMetadata={({props})=>({durationInFrames:Math.max(1,props.segments.reduce((sum,s)=>sum+Math.ceil(s.duration*fps),0))})}/>);
