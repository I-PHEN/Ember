"use client";

import { useEffect, useRef, useState } from "react";

export default function LaunchFilm() {
  const [loadError, setLoadError] = useState(false);
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
          hasUserPausedRef.current = false;
        }
      },
      {
        threshold: 0.2, // Trigger when 20%+ of the video is visible
      }
    );

    observer.observe(container);

    const handlePause = () => {
      if (video.currentTime > 0.3 && !video.ended && !video.seeking) {
        hasUserPausedRef.current = true;
      }
    };
    const handlePlay = () => {
      hasUserPausedRef.current = false;
      setLoadError(false);
    };

    video.addEventListener("pause", handlePause);
    video.addEventListener("play", handlePlay);

    // Initial check in case it's already in viewport
    const rect = container.getBoundingClientRect();
    if (rect.top < window.innerHeight && rect.bottom > 0) {
      if (!hasUserPausedRef.current) {
        video.play().catch(() => {});
      }
    }

    return () => {
      observer.disconnect();
      video.removeEventListener("pause", handlePause);
      video.removeEventListener("play", handlePlay);
    };
  }, []);

  const handleRetry = () => {
    const video = videoRef.current;
    if (video) {
      setLoadError(false);
      video.load();
      video.play().catch(() => {});
    }
  };

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
        <div className="launch-film-screen relative">
          <video
            ref={videoRef}
            src="/media/ember-launch.mp4"
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
            onError={() => {
              // Log error without completely tearing down video element
              console.warn("Video playback error reported by element:", videoRef.current?.error);
              setLoadError(true);
            }}
            className="w-full h-full object-contain"
          >
            <source src="/media/ember-launch.mp4" type="video/mp4" />
            <track kind="captions" src="/media/ember-launch.vtt" srcLang="en" label="English" />
            <p>Your browser doesn’t support embedded video.</p>
          </video>

          {loadError && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0e1014]/90 p-4 text-center">
              <p className="text-sm font-medium text-[#f4f4f6]">Tap to load product film</p>
              <button
                type="button"
                onClick={handleRetry}
                className="mt-3 rounded-xl border border-[#e6b784]/40 bg-[#e6b784]/15 px-4 py-1.5 text-xs font-semibold text-[#e6b784] hover:bg-[#e6b784]/25 transition-all"
              >
                Play Film
              </button>
            </div>
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
