/**
 * Tracks open dialogs so that only the top-most one reacts to Escape and so
 * global keyboard shortcuts pause while any dialog is open.
 */
const stack: string[] = [];
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) listener();
}

export function pushModal(id: string): void {
  if (!stack.includes(id)) {
    stack.push(id);
    notify();
  }
}

export function removeModal(id: string): void {
  const index = stack.indexOf(id);
  if (index >= 0) {
    stack.splice(index, 1);
    notify();
  }
}

export function isTopModal(id: string): boolean {
  return stack[stack.length - 1] === id;
}

export function hasOpenModal(): boolean {
  return stack.length > 0;
}

export function subscribeModalStack(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
