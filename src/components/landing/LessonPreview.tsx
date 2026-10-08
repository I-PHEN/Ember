"use client";
import { useEffect, useMemo, useState } from "react";
import SolvePlayer from "@/components/player/SolvePlayer";
import { LANDING_LESSON } from "@/lib/landing-lesson";
import { validateRecognizedTiming } from "@/lib/video/speech-alignment";
import type { NarrationTrack } from "@/lib/narration-store";

export default function LessonPreview({ requestedChapter, onSelectChapter }: { requestedChapter: { index: number; n: number }; onSelectChapter: (index: number) => void }) {
  const [tracks, setTracks] = useState<NarrationTrack[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [activeScene, setActiveScene] = useState(0);
  const seek = useMemo(() => requestedChapter.n ? { sceneIndex: requestedChapter.index, script: LANDING_LESSON, n: requestedChapter.n } : null, [requestedChapter]);
  useEffect(() => {
    const controller = new AbortController();
    fetch("/lessons/matrix-preview/tracks.json", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Preview unavailable");
      const data = await response.json();
      if (!Array.isArray(data) || data.length !== LANDING_LESSON.scenes.length) throw new Error("Invalid preview");
      return data.map((track, index): NarrationTrack => {
        const expectedUrl = `/lessons/matrix-preview/${index === 0 ? "matrix" : "repeated"}.wav`;
        const words = validateRecognizedTiming(LANDING_LESSON.scenes[index].narration!, track.alignment?.words, track.alignment?.duration);
        if (track.text !== LANDING_LESSON.scenes[index].narration || track.url !== expectedUrl || !words || track.alignment?.status !== "recognized") throw new Error("Invalid saved narration");
        return { url: expectedUrl, alignment: { status: "recognized", words, duration: track.alignment.duration } };
      });
    }).then(setTracks).catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [attempt]);
  return <div className="lesson-preview-shell">
    <div className="preview-title"><span>Reading a matrix</span><span>Linear algebra · short excerpt</span></div>
    {tracks ? <SolvePlayer script={LANDING_LESSON} themeId="blackboard" narrationTracks={tracks} seekRequest={seek} onTimeUpdate={(_time, scene) => setActiveScene(scene)} /> : <div className="preview-placeholder" role="status">{failed ? <><p>The recorded preview couldn’t load.</p><button className="landing-outline" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>Retry preview</button></> : "Loading the recorded lesson…"}</div>}
    <div className="preview-chapters" aria-label="Lesson chapters">{LANDING_LESSON.scenes.map((scene, index) => <button key={scene.chapter} aria-current={activeScene === index ? "step" : undefined} disabled={!tracks} onClick={() => onSelectChapter(index)}><span>{String(index + 1).padStart(2, "0")}</span>{scene.chapter}</button>)}</div>
  </div>;
}
