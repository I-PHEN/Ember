type Status = "passed" | "failed" | "timed-out";

/** Collection owns acceptance; worker promises never mutate shipped scenes. */
export async function collectSceneReviews<T>(tasks: readonly Promise<T|null>[], timeoutMs: number) {
  const results: (T|null)[] = tasks.map(()=>null);
  const statuses: Status[] = tasks.map(()=>"timed-out");
  let closed = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const settled = tasks.map(async (task,i) => {
    try {
      const result = await task;
      if (!closed) { results[i] = result; statuses[i] = result === null ? "failed" : "passed"; }
    } catch { if (!closed) statuses[i] = "failed"; }
  });
  await Promise.race([
    Promise.all(settled),
    new Promise<void>(resolve => { timer = setTimeout(resolve, Math.max(0, timeoutMs)); }),
  ]);
  closed = true;
  clearTimeout(timer);
  return { passed:tasks.length > 0 && statuses.every(s=>s === "passed"), results:[...results], statuses:[...statuses] };
}
