/* ------------------------------------------------------------------
   Ember Launch Film: Client Entrypoint
------------------------------------------------------------------- */

import { initPlayer } from "./preview";
import { renderFilmFrame, TOTAL_FRAMES, CHAPTERS } from "./film";
import { preloadFilmAssets, ASSETS } from "./fx";
import { buildMasterAudioBuffer, FILM_DURATION_SEC } from "./soundtrack";

// Expose on window for browser player & headless recorder
if (typeof window !== "undefined") {
  (window as any).renderFilmFrame = renderFilmFrame;
  (window as any).TOTAL_FRAMES = TOTAL_FRAMES;
  (window as any).FILM_DURATION_SEC = FILM_DURATION_SEC;
  (window as any).CHAPTERS = CHAPTERS;
  (window as any).preloadFilmAssets = preloadFilmAssets;
  (window as any).ASSETS = ASSETS;
  (window as any).buildMasterAudioBuffer = buildMasterAudioBuffer;

  const isHeadless = new URLSearchParams(window.location.search).get("headless") === "1";
  if (!isHeadless) {
    initPlayer();
  }
}
