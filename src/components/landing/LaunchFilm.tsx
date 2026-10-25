"use client";

import { useEffect, useRef, useState } from "react";

export default function LaunchFilm() {
  const [failed, setFailed] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLElement>(null);
  const hasUserPausedRef = useRef(false);

  useEffect(() => {
    const video = videoRef.current;
    const container = containerRef.current;
    if (!video || !container) return;

    // Browser autoplay policy requires muted property directly on the DOM element
    video.muted = true;
    video.defaultMuted = true;

    // Respect user's system reduced motion preference
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (mediaQuery.matches) {
      video.pause();
      return;
    }

    // Try starting playback if already in view on load
    const tryAutoplay = () => {
      if (!hasUserPausedRef.current) {
        video.play().catch(() => {
          // Autoplay was blocked or pending user interaction
        });
      }
    };

    // Scroll-triggered autoplay when scrolled into view
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting) {
          if (!hasUserPausedRef.current) {
            video.play().catch(() => {});
          }
        } else {
          // Scrolled out of view: pause to save resources
          video.pause();
          // Reset user pause so next time they scroll to the film, it auto-plays again
          hasUserPausedRef.current = false;
        }
      },
      {
        threshold: 0.25, // Trigger when 25%+ of the video is visible
      }
    );

    observer.observe(container);

    // Track user manually pausing via controls
    // Only register user pause if the video is actually playing and not at start/end
    const handlePause = () => {
      if (video.currentTime > 0.3 && !video.ended && !video.seeking) {
        hasUserPausedRef.current = true;
      }
    };
    const handlePlay = () => {
      hasUserPausedRef.current = false;
    };

    video.addEventListener("pause", handlePause);
    video.addEventListener("play", handlePlay);

    // Initial check in case it's already in viewport
    const rect = container.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      tryAutoplay();
    }

    return () => {
      observer.disconnect();
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("play", handlePlay);
    };
  }, [failed]);

  return (
    <section ref={containerRef} className="landing-width launch-film" aria-labelledby="launch-film-heading">
      <div className="launch-film-intro">
        <div>
          <p className="landing-eyebrow">Meet Ember</p>
          <h2 id="launch-film-heading">From a question to a lesson.</h2>
        </div>
        <p>52 seconds inside the workspace.</p>
      </div>
      <figure>
        <div className="launch-film-screen">
          {failed ? (
            <div className="launch-film-fallback" role="status">
              <h3>The film couldn’t load.</h3>
              <p>Reload the page to try again. You can still create a lesson above.</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              muted
              loop
              playsInline
              controls
              preload="auto"
              controlsList="nodownload"
              poster="/media/ember-launch-poster.jpg"
              aria-label="Ember launch film"
              aria-describedby="launch-film-caption"
              onError={() => setFailed(true)}
            >
              <source src="/media/ember-launch.mp4" type="video/mp4" />
              <track kind="captions" src="/media/ember-launch.vtt" srcLang="en" label="English" />
              <p>Your browser doesn’t support embedded video. Try an up-to-date browser to watch the film.</p>
            </video>
          )}
        </div>
        <figcaption id="launch-film-caption" className="launch-film-caption">
          <p>
            <span>0:52</span> Edited product demonstration · Auto-loops
          </p>
          <p>Plays on scroll · Enable sound in player</p>
        </figcaption>
      </figure>
    </section>
  );
}
