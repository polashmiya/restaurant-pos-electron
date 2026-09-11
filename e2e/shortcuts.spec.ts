import { expect, test } from '@playwright/test';
import { createUserDataDir, launchApp, removeUserDataDir, type LaunchedApp } from './helpers';

let userDataDir: string;
let launched: LaunchedApp;

test.beforeAll(async () => {
  userDataDir = createUserDataDir();
  launched = await launchApp(userDataDir);
});

test.afterAll(async () => {
  await launched?.app.close();
  removeUserDataDir(userDataDir);
});

test('keyboard shortcuts (master spec §45)', async () => {
  const { window } = launched;
  await expect(window.getByRole('navigation', { name: 'প্রধান নেভিগেশন' })).toBeVisible();

  // The first key press right after launch can arrive before the shortcut
  // listener is attached — retry until the app is interactive.
  await expect(async () => {
    await window.keyboard.press('F2');
    await expect(window.getByRole('heading', { name: 'টেবিল', exact: true })).toBeVisible({ timeout: 1000 });
  }).toPass();

  await window.keyboard.press('F6');
  await expect(window.getByRole('heading', { name: 'রিপোর্ট', exact: true })).toBeVisible();

  await window.keyboard.press('F3');
  await expect(window.getByRole('heading', { name: 'অর্ডার', exact: true })).toBeVisible();

  await window.keyboard.press('F1');
  await expect(window.getByRole('searchbox', { name: 'মেনু অনুসন্ধান' })).toBeVisible();

  // F4 and Ctrl+K focus the menu search (from any page)
  await window.keyboard.press('F3');
  await window.keyboard.press('F4');
  await expect(window.getByRole('searchbox', { name: 'মেনু অনুসন্ধান' })).toBeFocused();
  await window.keyboard.press('Tab');
  await window.keyboard.press('Control+k');
  await expect(window.getByRole('searchbox', { name: 'মেনু অনুসন্ধান' })).toBeFocused();
  await window.keyboard.type('বার্গার');
  await expect(window.getByText('5টি আইটেম')).toBeVisible();
  await window.keyboard.press('Escape');

  // F9 with an empty cart explains why payment cannot open
  await window.keyboard.press('F9');
  await expect(window.getByText('অর্ডারে অন্তত একটি আইটেম যোগ করুন')).toBeVisible();

  // F9 with items but no shift asks to open one; Esc closes the dialog
  await window.getByRole('button', { name: 'মাসালা চা অর্ডারে যোগ করুন', exact: true }).click();
  await window.keyboard.press('F9');
  await expect(window.getByRole('dialog', { name: 'কোনো শিফট চালু নেই' })).toBeVisible();
  await window.keyboard.press('Escape');
  await expect(window.getByRole('dialog')).toHaveCount(0);

  // F5 refreshes data without losing the current order
  await window.keyboard.press('F5');
  await expect(window.getByText('তথ্য রিফ্রেশ করা হয়েছে')).toBeVisible();
  await expect(window.getByRole('list', { name: 'অর্ডারের আইটেম' }).getByText('মাসালা চা')).toBeVisible();

  // Ctrl + / Ctrl − / Ctrl 0 change the text size of the whole interface
  const rootFontSize = () => window.evaluate(() => document.documentElement.style.fontSize);
  await window.keyboard.press('Control+Equal');
  await expect.poll(rootFontSize).toBe('112.5%');
  await window.keyboard.press('Control+Equal');
  await expect.poll(rootFontSize).toBe('125%');
  await window.keyboard.press('Control+Minus');
  await expect.poll(rootFontSize).toBe('112.5%');
  await window.keyboard.press('Control+Digit0');
  await expect.poll(rootFontSize).toBe('100%');
});
