/**
 * Serializes order-related persistence. Workflows (complete, hold, resume,
 * table changes) and the draft auto-save all run through this queue, so a
 * late auto-save can never overwrite the result of a completed payment.
 *
 * Tasks must not call runExclusive() themselves (that would deadlock).
 */
let tail: Promise<unknown> = Promise.resolve();

export function runExclusive<T>(task: () => Promise<T>): Promise<T> {
  const result = tail.then(task, task);
  tail = result.catch(() => undefined);
  return result;
}

/** Resolves once every queued task has finished (tests, refresh). */
export function whenIdle(): Promise<void> {
  return tail.then(() => undefined);
}
