export function galleryPublisher(name?: string | null): string {
  const value = name?.trim();
  return !value || ["Community Scholar", "Anonymous Scholar", "Scholar"].includes(value) ? "Ember Community" : value;
}

export function galleryScene(progress: number) {
  const p = Number.isFinite(progress) ? Math.max(0, Math.min(1, progress)) : 0;
  const segment = Math.min(2, Math.floor(p * 3));
  const local = Math.min(1, p * 3 - segment);
  const ease = (t: number) => t * t * (3 - 2 * t);
  const contact = ease(Math.max(0, Math.min(1, (local - .35) / .5)));
  const targets = [[20, 22], [57, 48], [33, 76]];
  const from = segment ? targets[segment - 1] : [4, 4];
  const target = targets[segment];
  const travel = ease(Math.min(1, local / .65));
  return { segment, contact, x: from[0] + (target[0] - from[0]) * travel, y: from[1] + (target[1] - from[1]) * travel - Math.sin(Math.PI * travel) * 8 };
}
