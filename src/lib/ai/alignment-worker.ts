import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import path from "node:path";
import { validateWordTiming, validateRecognizedTiming, type SpeechAlignment, type AlignmentStatus } from "../video/speech-alignment";

interface WorkerOptions { command?: string; args?: string[]; timeoutMs?: number; idleMs?: number }
interface Pending {
  text: string;
  resolve: (value: SpeechAlignment) => void;
  timer: ReturnType<typeof setTimeout>;
}
const fallback = (status: AlignmentStatus): SpeechAlignment => ({ status, words: [] });

/** One local model process reused across scenes. No shell, runtime downloads or
 * transcript logs. Missing installation is an ordinary unavailable result. */
export class AlignmentWorker {
  private child?: ChildProcessWithoutNullStreams;
  private pending = new Map<number, Pending>();
  private sequence = 0;
  private output = "";
  private idle?: ReturnType<typeof setTimeout>;
  constructor(private options: WorkerOptions = {}) {}

  private start(): void {
    if (this.child) return;
    const directory = path.resolve(process.env.EMBER_ALIGNMENT_DIR ?? "workers/alignment");
    const python = process.env.EMBER_ALIGNMENT_PYTHON ?? path.join(directory, ".venv", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
    const child = spawn(this.options.command ?? python, this.options.args ?? [path.join(directory, "worker.py")], {
      stdio: ["pipe", "pipe", "pipe"], windowsHide: true,
      env: { ...process.env, PYTHONIOENCODING: "utf-8", OMP_NUM_THREADS: "2" },
    });
    this.child = child;
    child.stderr.on("data", () => undefined);
    child.stdin.on("error", () => { if (this.child === child) this.stop("unavailable"); });
    child.on("error", () => { if (this.child === child) this.stop("unavailable"); });
    child.on("close", () => { if (this.child === child) this.stop("unavailable"); });
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (data: string) => {
      if (this.child !== child) return;
      this.output += data;
      if (this.output.length > 512_000) { this.stop("invalid"); return; }
      let newline: number;
      while ((newline = this.output.indexOf("\n")) >= 0) {
        const line = this.output.slice(0, newline);
        this.output = this.output.slice(newline + 1);
        try {
          const result = JSON.parse(line);
          const pending = this.pending.get(result.id);
          if (!pending) { this.stop("invalid"); return; }
          const words = result.status === "recognized"
            ? validateRecognizedTiming(pending.text, result.words, result.duration)
            : result.status === "aligned" ? validateWordTiming(pending.text, result.words, result.duration) : null;
          const alignment: SpeechAlignment = words
            ? { status: result.status, words, duration: result.duration, engine: typeof result.engine === "string" ? result.engine.slice(0, 120) : "local" }
            : fallback(result.status === "unavailable" ? "unavailable" : "invalid");
          clearTimeout(pending.timer);
          this.pending.delete(result.id);
          pending.resolve(alignment);
          if (!this.pending.size) {
            this.idle = setTimeout(() => this.stop("unavailable"), this.options.idleMs ?? 60_000);
            this.idle.unref?.();
          }
        } catch { this.stop("invalid"); return; }
      }
    });
  }

  align(text: string, audio: Buffer): Promise<SpeechAlignment> {
    if (!text.trim() || text.length > 1020 || !audio.length || audio.length > 16 * 1024 * 1024) {
      return Promise.resolve(fallback("invalid"));
    }
    if (this.idle) clearTimeout(this.idle);
    return new Promise(resolve => {
      const id = ++this.sequence;
      const timer = setTimeout(() => this.stop("timeout"), this.options.timeoutMs ?? 30_000);
      this.pending.set(id, { text, resolve, timer });
      try {
        this.start();
        this.child!.stdin.write(JSON.stringify({ id, text, audio: audio.toString("base64") }) + "\n");
      } catch { this.stop("unavailable"); }
    });
  }

  private stop(status: AlignmentStatus): void {
    const child = this.child;
    this.child = undefined;
    this.output = "";
    if (this.idle) clearTimeout(this.idle);
    child?.kill();
    for (const pending of this.pending.values()) {
      clearTimeout(pending.timer);
      pending.resolve(fallback(status));
    }
    this.pending.clear();
  }
  dispose(): void { this.stop("unavailable"); }
}

const state = globalThis as typeof globalThis & { __emberAlignmentWorker?: AlignmentWorker };
export function alignNarration(text: string, audio: Buffer): Promise<SpeechAlignment> {
  if (process.env.EMBER_ALIGNMENT_ENABLED === "false") return Promise.resolve(fallback("unavailable"));
  state.__emberAlignmentWorker ??= new AlignmentWorker();
  return state.__emberAlignmentWorker.align(text, audio);
}

