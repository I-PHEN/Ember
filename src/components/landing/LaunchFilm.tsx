"use client";

import { useState } from "react";
import { Download, FileText } from "lucide-react";

export default function LaunchFilm() {
  const [failed, setFailed] = useState(false);

  return <section className="landing-width launch-film" aria-labelledby="launch-film-heading">
    <div className="launch-film-intro">
      <div><p className="landing-eyebrow">Meet Ember</p><h2 id="launch-film-heading">From a question to a lesson.</h2></div>
      <p>52 seconds inside the workspace.</p>
    </div>
    <figure>
      <div className="launch-film-screen">
        {failed ? <div className="launch-film-fallback" role="status">
          <h3>The film couldn’t load.</h3>
          <p>Try the MP4 download, or read the transcript below.</p>
        </div> : <video controls preload="none" playsInline poster="/media/ember-launch-poster.jpg" aria-label="Ember launch film" aria-describedby="launch-film-caption" onError={() => setFailed(true)}>
          <source src="/media/ember-launch.mp4" type="video/mp4" onError={() => setFailed(true)} />
          <track kind="captions" src="/media/ember-launch.vtt" srcLang="en" label="English" />
          <p>Your browser doesn’t support embedded video. Download the MP4 or read the transcript below.</p>
        </video>}
      </div>
      <figcaption id="launch-film-caption" className="launch-film-caption">
        <p><span>0:52</span> Edited product demonstration</p>
        <div className="launch-film-links">
          <a href="/media/ember-launch.mp4" download="ember-launch.mp4"><Download size={14} />Download MP4</a>
          <a href="/media/ember-launch-transcript.txt" download="ember-launch-transcript.txt"><FileText size={14} />Download transcript</a>
        </div>
      </figcaption>
    </figure>
  </section>;
}
