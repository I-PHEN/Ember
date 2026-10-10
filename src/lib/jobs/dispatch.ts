import type { DurableJobStore } from "./repository";

export interface GenerationEvent {
  id: string;
  name: "ember/video.requested";
  data: { jobId: string };
}

/** The transport must resolve only after event acknowledgement, never fire-and-forget. */
export async function dispatchJob(
  id: string, store: DurableJobStore,
  send: (event: GenerationEvent) => Promise<unknown>,
): Promise<void> {
  await send({ id, name: "ember/video.requested", data: { jobId: id } });
  await store.acknowledgeDispatch(id);
}
