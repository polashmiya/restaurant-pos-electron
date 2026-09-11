import { describe, expect, it } from 'vitest';
import { createBackupFile, parseBackupFile, summarizeBackup } from '@/data/backup';
import { prepareStoreData } from '@/data/initialize';
import { isMenuImageSource } from '@/data/validators';
import { makeOrder } from '../helpers/factories';

describe('backup files', () => {
  const data = prepareStoreData({ completedOrders: [makeOrder()] }, new Date('2026-09-10T10:00:00Z')).data;

  it('round-trips a valid backup', () => {
    const backup = createBackupFile(data, '1.0.0', new Date('2026-09-10T12:00:00Z'));
    const parsed = parseBackupFile(JSON.parse(JSON.stringify(backup)));

    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    const summary = summarizeBackup(parsed.backup);
    expect(summary.completedOrders).toBe(1);
    expect(summary.menuItems).toBe(data.menuItems.length);
    expect(summary.tables).toBe(20);
  });

  it('rejects files that are not Restaurant POS backups', () => {
    expect(parseBackupFile({ hello: 'world' }).ok).toBe(false);
    expect(parseBackupFile(null).ok).toBe(false);
    expect(parseBackupFile([]).ok).toBe(false);
  });

  it('accepts bundled and embedded menu photos but never remote or file URLs', () => {
    expect(isMenuImageSource('images/menu/bur-001.webp')).toBe(true);
    expect(isMenuImageSource('data:image/webp;base64,UklGRiIAAABXRUJQ')).toBe(true);
    expect(isMenuImageSource('https://example.com/tracker.png')).toBe(false);
    expect(isMenuImageSource('file:///C:/Windows/win.ini')).toBe(false);
    expect(isMenuImageSource('images/menu/../../secret.webp')).toBe(false);
    expect(isMenuImageSource('data:text/html;base64,PHNjcmlwdD4=')).toBe(false);

    const backup = createBackupFile(data, '1.0.0', new Date());
    const remote = JSON.parse(JSON.stringify(backup)) as { data: { menuItems: { image?: string }[] } };
    remote.data.menuItems[0]!.image = 'https://example.com/tracker.png';
    expect(parseBackupFile(remote).ok).toBe(false);
  });

  it('rejects a backup containing a malformed record', () => {
    const backup = createBackupFile(data, '1.0.0', new Date());
    const broken = JSON.parse(JSON.stringify(backup)) as { data: { menuItems: unknown[] } };
    broken.data.menuItems[0] = { id: 'x', price: 'free' };

    const parsed = parseBackupFile(broken);
    expect(parsed.ok).toBe(false);
    if (!parsed.ok) expect(parsed.error).toContain('menuItems[0]');
  });
});
