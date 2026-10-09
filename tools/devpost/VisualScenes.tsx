import React, { useLayoutEffect, useRef } from 'react';
import { interpolate } from 'remotion';
import { Pause, Play, Search, ArrowLeft, ArrowRight } from 'lucide-react';
import SolvePlayer from '../../src/components/player/SolvePlayer';
import StudioConsoleTabs from '../../src/components/studio/StudioConsoleTabs';
import Wordmark from '../../src/components/Wordmark';
import MathCopy from '../../src/components/MathCopy';
import { galleryPublisher } from '../../src/lib/gallery-presentation';
import { SAMPLE_CALCULUS } from '../../src/lib/samples';
import { renderFrame } from '../../src/lib/video/render';
import { THEMES } from '../../src/lib/video/types';
import { DEMO_LESSON, demoTimeline, demoDuration, writingClock } from './lesson';
import type { FilmProps } from './Film';

const ease = (time: number, start: number, end: number) => {
  const p = Math.max(0, Math.min(1, (time - start) / (end - start)));
  return p * p * (3 - 2 * p);
};
export function DemoBoard({ time }: { time: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useLayoutEffect(() => { const ctx = ref.current?.getContext('2d'); if (ctx) renderFrame(ctx, demoTimeline, time, THEMES.blackboard, { pen: true }); }, [time]);
  return <canvas ref={ref} width={1280} height={720} className="film-board" />;
}
export function Cursor({ x, y, click = false }: { x: number; y: number; click?: boolean }) {
  return <div className="demo-cursor" style={{ transform: `translate(${x}px, ${y}px)` }}><svg width="38" height="46" viewBox="0 0 32 40"><path d="M3 2v29l8-8 6 14 6-3-6-13 12-1Z" fill="#f4f4f6" stroke="#0b0d10" strokeWidth="2" /></svg>{click && <i />}</div>;
}
export function LessonScene({ seconds, duration, controls = false }: { seconds: number; duration: number; controls?: boolean }) {
  const p = seconds / duration;
  const refining = controls && p > .53;
  const pausedAt = writingClock(4, 1000);
  const revisitedAt = writingClock(2, 1000);
  const boardTime = controls ? (p < .30 ? pausedAt : p < .46 ? pausedAt - ease(p, .30, .46) * (pausedAt - revisitedAt) : revisitedAt) : writingClock(2, seconds);
  const paused = controls && p > .16;
  const label = !controls ? 'A problem becomes a worked explanation' : p < .3 ? 'Pause on the difficult step' : p < .53 ? 'Rewind without starting again' : 'Ask why this choice works';
  const x = !controls ? 1100 : refining ? 1390 + ease(p, .53, .64) * 100 : p < .30 ? 800 - ease(p, .02, .16) * 755 : 45 + ease(p, .30, .42) * 540;
  const y = refining ? 110 : 660;
  return <div className="demo-studio">
    <header><Wordmark /><span>Integration by parts</span><small>Prepared excerpt · natural-paced writing</small></header>
    <div className="demo-studio-body"><div className="demo-player"><SolvePlayer script={DEMO_LESSON} themeId="blackboard" presentationTime={boardTime} showChapterLabel={false} />
      {controls && <div className="demo-transport"><span>{paused ? <Play size={24} /> : <Pause size={24} />}</span><div className="demo-track"><i style={{ width: `${boardTime / demoDuration * 100}%` }} /></div><span>{Math.floor(boardTime)}s</span><span>1×</span></div>}
    </div><aside><StudioConsoleTabs activeTab={refining ? 'refine' : 'chapters'} chapterCount={6} onSelect={() => {}} />
      {!refining ? SAMPLE_CALCULUS.scenes.map((scene, index) => <div className={`demo-chapter ${index === Math.min(5, Math.floor(boardTime / demoDuration * 6)) ? 'selected' : ''}`} key={scene.chapter}><span>{String(index + 1).padStart(2, '0')}</span>{scene.chapter}</div>) : <><div className="demo-question">{'Why do we choose u = x?'.slice(0, Math.floor(ease(p, .54, .67) * 24))}</div><div className="demo-answer" style={{ opacity: ease(p, .67, .75), transform: `translateY(${(1 - ease(p, .67, .75)) * 16}px)` }}><small>Professor Ember</small><p>Choose u = x because differentiating it gives du = dx. The polynomial becomes simpler.</p><MathCopy text={String.raw`$u=x\quad\longrightarrow\quad du=dx$`} /><p>Integrating e²ˣ gives v = ½e²ˣ.</p></div><div className="demo-chat-field">Ask Ember about this step… <ArrowRight size={20} /></div></>}
    </aside></div><div className="demo-action-label">{label}<span>{refining ? 'Prepared follow-up, not a live response' : 'Production player · actual stroke renderer'}</span></div>
    {controls && <Cursor x={x} y={y} click={(p > .15 && p < .20) || (p > .42 && p < .47) || (p > .62 && p < .67)} />}
  </div>;
}

export function Pipeline({ seconds, duration }: { seconds: number; duration: number }) {
  const p = seconds / duration;
  const active = Math.min(5, Math.floor(p * 6));
  const artifacts = ['Question → learning goal', 'Plan → spoken explanation', 'Transcript → parallel board scenes', 'Scene review → bounded repair', 'Layout + supported arithmetic checks', 'Structured lesson → playback'];
  const nodes = [ ['Director', 60, 100], ['Transcript planner', 335, 100], ['Scene reviewer', 1040, 100], ['Compiler + checks', 1320, 100] ] as const;
  const writerX = 690;
  const paths = ['M300 150 H335', 'M580 150 C640 150 630 65 690 65', 'M580 150 H690', 'M580 150 C640 150 630 235 690 235', 'M930 65 C985 65 980 150 1040 150', 'M930 150 H1040', 'M930 235 C985 235 980 150 1040 150', 'M1280 150 H1320', 'M335 175 V365 H1035', 'M1560 175 V365 H1280'];
  return <div className="demo-pipeline"><div className="pipeline-artifact"><span>LESSON DATA</span><strong>{artifacts[active]}</strong><MathCopy text={active < 2 ? String.raw`$\int x e^{2x}\,dx$` : active < 4 ? String.raw`$u=x\;\longrightarrow\;du=dx$` : String.raw`$\frac12 xe^{2x}-\frac14e^{2x}+C$`} /></div>
    <div className="pipeline-map"><svg viewBox="0 0 1640 465">{paths.map((d, i) => <path d={d} key={d} fill="none" stroke={i > 7 ? '#58c4f4' : '#e6b784'} strokeWidth="2" opacity=".5" strokeDasharray={i > 7 ? '5 7' : undefined} />)}{paths.map((d, i) => {
      const shift = (p * 5 + i * .19) % 1;
      const from = i < 1 ? [300,150] : i < 4 ? [580,150] : i < 7 ? [930, [65,150,235][i-4]] : [1280,150];
      const to = i < 1 ? [335,150] : i < 4 ? [690,[65,150,235][i-1]] : i < 7 ? [1040,150] : [1320,150];
      return i < 8 ? <circle key={`packet-${i}`} cx={from[0] + (to[0]-from[0])*shift} cy={from[1] + (to[1]-from[1])*ease(shift,0,1)} r="5" fill="#e6b784" opacity={p > .08 ? 1 : 0} /> : null;
    })}</svg>
    {nodes.map(([name,x,y],i) => <div className={`pipeline-node ${active === [0,1,3,4][i] ? 'active' : ''}`} style={{ left:x,top:y }} key={name}><small>{['Learning arc','Spoken explanation','Review + repair','Board integrity'][i]}</small><h3>{name}</h3></div>)}
    {[0,1,2].map(i => <div className={`pipeline-node writer ${active === 2 ? 'active' : ''}`} style={{left:writerX,top:15+i*85}} key={i}><span>Writer {i+1}</span><small>{['Introduce','Explain','Conclude'][i]} · illustrative allocation</small><div className="writer-progress" style={{transform:`scaleX(${ease(p,.28+i*.015,.48+i*.015)})`}} /></div>)}
    <div className="pipeline-node solver" style={{left:335,top:330}}><small>Runs alongside planning/writing</small><h3>Independent solver</h3></div>
    <div className="pipeline-node delivery" style={{left:1040,top:330}}><small>Checked script → player</small><h3>Delivery gate</h3></div>
    <div className="pipeline-node voice" style={{left:1320,top:330}}><small>Parallel queue + cache</small><h3>Voice synthesis</h3></div>
    </div><div className="pipeline-footnote">Illustrative data flow · solver comparisons can remain unresolved · checks are not proof of correctness</div>
  </div>;
}

export function GallerySequence({ seconds, duration, items }: { seconds: number; duration: number; items: FilmProps['gallery'] }) {
  const p = seconds / duration;
  const entry = items[0];
  if (p > .57 && entry) return <div className="demo-gallery-replay"><div className="gallery-replay-label"><ArrowLeft size={22} /> Community gallery → lesson preview <span>Reviewed excerpt of this question · prepared, not live replay</span></div><SolvePlayer script={DEMO_LESSON} themeId="blackboard" presentationTime={demoDuration} /><div className="replay-title"><MathCopy text={entry.title} /></div></div>;
  const query = 'integration'.slice(0, Math.floor(ease(p,.07,.27)*11));
  const visible = items.filter(item => !query || `${item.title} ${item.description || ''} ${item.script.question}`.toLowerCase().includes(query));
  return <div className="demo-gallery-browser"><header><span>← Studio</span><Wordmark /><span>Create Solve</span></header><div className="gallery-heading"><small>Community Solves</small><h3>The Library of Thought.</h3><p>Search or explore community lectures.</p></div><div className="gallery-search"><Search size={22} />{query || <span>Search across questions, topics, or equations…</span>}<i /></div><div className="gallery-filters">{['All','Calculus','Mechanics','Physics','ODEs','Circuits','Chemistry'].map(name => <span className={name==='All'?'selected':''} key={name}>{name}</span>)}</div><div className="gallery-demo-results">{visible.slice(0,2).map(item=><article key={item.id} style={{borderColor:p>.37?'#e6b784':'#282c31'}}><div className="gallery-demo-thumbnail"><DemoBoard time={demoDuration} /><span><Play size={25}/></span></div><h4><MathCopy text={item.title}/></h4><p><MathCopy text={item.description || item.script.question}/></p><small>By {galleryPublisher(item.publisher)}</small></article>)}{!visible.length&&<p>No captured community entries match this search.</p>}</div><div className="gallery-demo-disclosure">Prepared gallery sequence · actual saved catalogue entry</div><Cursor x={interpolate(p,[0,.25,.45],[1200,800,540],{extrapolateRight:'clamp'})} y={interpolate(p,[0,.25,.45],[100,215,405],{extrapolateRight:'clamp'})} click={p>.46&&p<.53}/></div>;
}
