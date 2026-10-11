"use client";

import { useEffect, useRef, useState } from "react";

// Keep preference changes and teardown together; browser autoplay rejection
// isn't a loading failure, since visitors can still use the native controls.
export function bindFilmMotion(
  video: Pick<HTMLVideoElement, "autoPlay" | "play" | "pause">,
  preference: Pick<MediaQueryList, "matches" | "addEventListener" | "removeEventListener">,
) {
  const update = () => {
    video.autoPlay = !preference.matches;
    if (preference.matches) video.pause();
    else void video.play().catch(() => { /* Manual playback remains available. */ });
  };
  update();
  preference.addEventListener("change", update);
  return () => preference.removeEventListener("change", update);
}

export default function LaunchFilm() {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    return bindFilmMotion(video, window.matchMedia("(prefers-reduced-motion: reduce)"));
  }, [failed]);

  return <section className="landing-width launch-film" aria-labelledby="launch-film-heading">
    <div className="launch-film-intro">
      <div><p className="landing-eyebrow">Meet Ember</p><h2 id="launch-film-heading">From a question to a lesson.</h2></div>
      <p>52 seconds inside the workspace.</p>
    </div>
    <figure>
      <div className="launch-film-screen">
        {failed ? <div className="launch-film-fallback" role="status">
          <h3>The film couldn’t load.</h3>
          <p>Reload the page to try again. You can still create a lesson above.</p>
        </div> : <video ref={videoRef} controls muted preload="metadata" playsInline controlsList="nodownload" poster="/media/ember-launch-poster.jpg" aria-label="Ember launch film" aria-describedby="launch-film-caption" onError={() => setFailed(true)}>
          <source src="/media/ember-launch.mp4" type="video/mp4" onError={() => setFailed(true)} />
          <track kind="captions" src="/media/ember-launch.vtt" srcLang="en" label="English" />
          <p>Your browser doesn’t support embedded video. Try an up-to-date browser to watch the film.</p>
        </video>}
      </div>
      <figcaption id="launch-film-caption" className="launch-film-caption">
        <p><span>0:52</span> Edited product demonstration</p>
        <p>Starts muted · Enable sound in the player</p>
      </figcaption>
    </figure>
  </section>;
}
