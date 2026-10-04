import { expect, test } from "bun:test";
import path from "node:path";
import { AlignmentWorker } from "../src/lib/ai/alignment-worker";
function worker(timeoutMs = 3000) {
  return new AlignmentWorker({ command: "node", args: [path.resolve("tests/fixtures/alignment-worker.cjs")], timeoutMs, idleMs: 50 });
}
test("persistent worker accepts valid timings and rejects transcript mismatch", async () => {
  const w = worker();
  try {
    expect((await w.align("hello", Buffer.from("audio"))).status).toBe("aligned");
    expect((await w.align("mismatch", Buffer.from("audio"))).status).toBe("invalid");
  } finally { w.dispose(); }
});
test("malformed output and process spawn errors degrade explicitly", async () => {
  const w = worker();
  try { expect((await w.align("malformed", Buffer.from("audio"))).status).toBe("invalid"); }
  finally { w.dispose(); }
  const missing = new AlignmentWorker({ command: "ember-missing-aligner", args: [] });
  try { expect((await missing.align("hello", Buffer.from("audio"))).status).toBe("unavailable"); }
  finally { missing.dispose(); }
});
test("worker timeout is bounded and stops the child", async () => {
  const w = worker(100);
  try { expect((await w.align("timeout", Buffer.from("audio"))).status).toBe("timeout"); }
  finally { w.dispose(); }
});

test("recognized candidates retain probability and normalized transcript through the process boundary", async () => {
  const w = worker();
  try {
    const result = await w.align("two x", Buffer.from("audio"));
    expect(result.status).toBe("recognized");
    expect(result.words).toEqual([{text:"2x",start:0.1,end:0.9,probability:0.9}]);
  } finally { w.dispose(); }
});

