/** Returns a safe message for values caught from a promise or callback. */
export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
