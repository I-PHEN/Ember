export const GENERATION_ERROR_MESSAGE = "We couldn’t finish generating your lesson. Your question is saved—please try again. You don’t need to change it.";

/** Make old saved failures readable without guessing why the request failed. */
export function lessonErrorMessage(error: string | null | undefined): string {
  if (!error || error === "Video generation hit a snag. Please try again.") return GENERATION_ERROR_MESSAGE;
  return error;
}
