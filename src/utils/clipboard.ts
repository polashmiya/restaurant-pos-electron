/**
 * Copies text to the clipboard. The desktop app denies permission requests,
 * which can block the Clipboard API, so a hidden text area with the copy
 * command is the fallback. Returns true when the text was copied.
 */
export async function copyText(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Blocked or unavailable — use the fallback below.
  }
  if (typeof document === 'undefined') return false;
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  Object.assign(area.style, { position: 'fixed', top: '0', insetInlineStart: '-9999px', opacity: '0' });
  document.body.appendChild(area);
  area.focus();
  area.select();
  try {
    return document.execCommand('copy');
  } catch {
    return false;
  } finally {
    area.remove();
    previousFocus?.focus();
  }
}
