// Local QA of the production SolvePlayer using previously recorded speech.
import React, { createRef, useState } from "react";
import { createRoot } from "react-dom/client";
import SolvePlayer, { type SolvePlayerHandle } from "../src/components/player/SolvePlayer";
import { sceneStart, type SolveScript } from "../src/lib/video/types";
import type { SpeechAlignment } from "../src/lib/video/speech-alignment";

type Fixture = { script: SolveScript; tracks: { text: string; audio: string; contentType: string; alignment: SpeechAlignment }[] };
const nativeFetch = window.fetch.bind(window);
const fixture: Fixture = await (await nativeFetch("/fixture.json")).json();
window.fetch = async (input, init) => {
  if (String(input) === "/api/narrate") {
    const text = JSON.parse(String(init?.body)).text;
    const track = fixture.tracks.find(t => t.text === text);
    if (!track) return new Response("Unknown fixture", { status: 400 });
    return Response.json(track);
  }
  throw new Error(`Unexpected QA request: ${String(input)}`);
};
// Expose the real, otherwise detached audio elements for observable diagnostics.
const NativeAudio = window.Audio;
window.Audio = class extends NativeAudio {
  constructor(src?: string) {
    super(src);
    this.hidden = true;
    document.querySelector("#audio-elements")!.appendChild(this);
  }
};
const player = createRef<SolvePlayerHandle>();
function Preview() {
  const [position, setPosition] = useState(0);
  const [stall, setStall] = useState<{ before: number; after: number; advanced: number } | null>(null);
  return <>
    <SolvePlayer ref={player} script={fixture.script} themeId="blackboard" onTimeUpdate={setPosition} />
    <button onClick={() => player.current?.seekTo(0)}>Seek to start</button>
    <button onClick={() => player.current?.seekTo(5)}>Seek to 5 seconds</button>
    <button onClick={() => { if (player.current) player.current.seekTo(sceneStart(player.current.timeline(), 1)); }}>Seek to second scene</button>
    <button onClick={() => {
      const a = [...document.querySelectorAll("audio")].find(a => !a.paused);
      if (!a) return;
      const before = a.currentTime;
      const until = performance.now() + 650;
      // Deliberately stall a single frame to check that speech is not rewound.
      while (performance.now() < until) { /* QA only */ }
      requestAnimationFrame(() => requestAnimationFrame(() => setStall({ before, after: a.currentTime, advanced: a.currentTime - before })));
    }}>Simulate a slow frame</button>
    <pre id="diagnostics">{JSON.stringify({ position, stall, scenes: player.current?.timeline().scenes.map(s => ({ chapter: s.chapter, audioDuration: s.audioDur, source: s.timing?.source, feasibility: s.timing?.feasibility, issues: s.timing?.issues, duration: s.dur })) }, null, 2)}</pre>
  </>;
}
createRoot(document.querySelector("#player")!).render(<Preview />);
