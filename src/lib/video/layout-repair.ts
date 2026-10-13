import { compileTimeline } from "./compile";
import { auditTimeline, type LayoutViolation } from "./layout-audit";
import type { SolveScript, Beat } from "./types";

export interface RepairResult {
  script: SolveScript;
  repaired: boolean;
  initialViolations: number;
  remainingViolations: number;
}

/**
 * Deterministic post-merge layout repair:
 * Runs layout audit on the compiled timeline. If collisions or overflows
 * are detected, applies corrective surgery (inserting mid-scene erases or
 * routing auxiliary elements to the side region) and validates the improvement.
 */
export function repairLayout(script: SolveScript): RepairResult {
  const initialTl = compileTimeline(script);
  const initialViolations = auditTimeline(initialTl);

  if (!initialViolations.length) {
    return {
      script,
      repaired: false,
      initialViolations: 0,
      remainingViolations: 0,
    };
  }

  const candidateScript: SolveScript = JSON.parse(JSON.stringify(script));
  let didRepair = false;

  const violationsByScene = new Map<number, LayoutViolation[]>();
  for (const v of initialViolations) {
    const list = violationsByScene.get(v.scene) ?? [];
    list.push(v);
    violationsByScene.set(v.scene, list);
  }

  for (const [sceneIdx, violations] of violationsByScene.entries()) {
    const scene = candidateScript.scenes[sceneIdx];
    if (!scene || scene.intro) continue;

    const originalBeats = [...scene.beats];

    // Strategy 1: Clear crowding with a clean erase break
    const hasOverflow = violations.some((v) => v.kind === "overflow");
    const hasSevereOverlap = violations.length >= 2;

    if (hasOverflow || hasSevereOverlap) {
      let writeCount = 0;
      let splitIdx = -1;
      for (let i = 0; i < scene.beats.length; i++) {
        if (scene.beats[i].type === "write") {
          writeCount++;
          if (writeCount >= 3 && splitIdx === -1) {
            splitIdx = i;
          }
        }
      }

      if (splitIdx > 0 && splitIdx < scene.beats.length) {
        const eraseBeat: Beat = { type: "erase" };
        const newBeats = [
          ...scene.beats.slice(0, splitIdx + 1),
          eraseBeat,
          ...scene.beats.slice(splitIdx + 1),
        ];

        scene.beats = newBeats;
        const testTl = compileTimeline(candidateScript);
        const testViolations = auditTimeline(testTl);

        if (testViolations.length < initialViolations.length) {
          didRepair = true;
          continue;
        } else {
          scene.beats = originalBeats;
        }
      }
    }

    // Strategy 2: Route positioned beats to the side panel
    let modified = false;
    scene.beats = scene.beats.map((b) => {
      if (b.type === "write" && (b.x !== undefined || b.y !== undefined)) {
        modified = true;
        const { x: _x, y: _y, ...rest } = b;
        return { ...rest, region: "side" as const };
      }
      return b;
    });

    if (modified) {
      const testTl = compileTimeline(candidateScript);
      const testViolations = auditTimeline(testTl);
      if (testViolations.length < initialViolations.length) {
        didRepair = true;
      } else {
        scene.beats = originalBeats;
      }
    }
  }

  const finalTl = compileTimeline(candidateScript);
  const remaining = auditTimeline(finalTl);

  return {
    script: didRepair ? candidateScript : script,
    repaired: didRepair,
    initialViolations: initialViolations.length,
    remainingViolations: remaining.length,
  };
}
