import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { createUserDataDir, launchApp, printOutputDir, removeUserDataDir, type LaunchedApp } from './helpers';

let userDataDir: string;
let launched: LaunchedApp;

const pdfCount = () =>
  fs.existsSync(printOutputDir(userDataDir))
    ? fs.readdirSync(printOutputDir(userDataDir)).filter((file) => file.endsWith('.pdf')).length
    : 0;

test.beforeAll(async () => {
  userDataDir = createUserDataDir();
  launched = await launchApp(userDataDir);
});

test.afterAll(async () => {
  await launched?.app.close();
  removeUserDataDir(userDataDir);
});

test('bundled menu photos load in the packaged renderer', async () => {
  const { window } = launched;
  const photo = window.locator('img[src="images/menu/app-001.webp"]').first();
  await expect(photo).toBeVisible();
  await expect.poll(() => photo.evaluate((image: HTMLImageElement) => image.complete && image.naturalWidth)).toBe(560);
});

test('reports: empty state, sample sales, charts, table view and printed report', async () => {
  const { window } = launched;

  await window.keyboard.press('F6');
  await expect(window.getByRole('heading', { name: 'রিপোর্ট', exact: true })).toBeVisible();
  await expect(window.getByText('এই সময়ে কোনো বিক্রয় নেই')).toBeVisible();

  // Load demo sales from Settings → About & developer
  await window.getByRole('navigation', { name: 'প্রধান নেভিগেশন' }).getByRole('button', { name: 'সেটিংস' }).click();
  await window.getByRole('navigation', { name: 'সেটিংস' }).getByRole('button', { name: 'পরিচিতি ও ডেভেলপার' }).click();
  await expect(window.getByText('মেনুর ছবির কৃতজ্ঞতা')).toBeVisible();
  await window.getByRole('button', { name: 'নমুনা বিক্রয় লোড করুন' }).click();
  await window.getByRole('dialog').getByRole('button', { name: 'নমুনা বিক্রয় লোড করুন' }).click();
  await expect(window.getByText(/টি নমুনা অর্ডার যোগ হয়েছে/)).toBeVisible();
  await expect(window.getByRole('button', { name: 'নমুনা বিক্রয় মুছুন' })).toBeVisible();

  // Last 7 days (default)
  await window.keyboard.press('F6');
  await expect(window.getByText('নমুনা ডেটা সহ')).toBeVisible();
  await expect(window.getByText('মোট বিক্রয়', { exact: true }).first()).toBeVisible();
  await expect(window.getByRole('heading', { name: 'দৈনিক বিক্রয়' })).toBeVisible();
  await expect(window.getByRole('heading', { name: 'সর্বাধিক বিক্রিত আইটেম' })).toBeVisible();

  // Keyboard reading of the chart announces each value
  const trend = window.getByRole('group', { name: /দৈনিক বিক্রয়/ });
  await trend.focus();
  await window.keyboard.press('Home');
  const liveId = await trend.getAttribute('aria-describedby');
  await expect(window.locator(`[id="${liveId}"]`)).toContainText('৳');

  // Table view twin of the trend chart: 7 days
  await window.getByRole('button', { name: 'টেবিল আকারে দেখুন' }).first().click();
  await expect(window.getByRole('table').first().locator('tbody tr')).toHaveCount(7);
  await window.getByRole('button', { name: 'চার্ট আকারে দেখুন' }).click();

  // Printed sales report (saved as PDF by the test environment)
  const before = pdfCount();
  await window.getByRole('button', { name: 'রিপোর্ট প্রিন্ট' }).click();
  const dialog = window.getByRole('dialog', { name: 'রিপোর্ট প্রিন্ট' });
  await expect(dialog.getByText('বিক্রয় রিপোর্ট', { exact: true })).toBeVisible();
  await dialog.getByRole('button', { name: 'প্রিন্ট', exact: true }).click();
  await expect(window.getByText('বিক্রয় রিপোর্ট প্রিন্ট হয়েছে')).toBeVisible();
  await expect.poll(pdfCount).toBe(before + 1);
  await dialog.getByRole('button', { name: 'বন্ধ করুন', exact: true }).click();

  // Sample data covers the days before today only
  await window.getByRole('radio', { name: 'আজ' }).click();
  await expect(window.getByText('এই সময়ে কোনো বিক্রয় নেই')).toBeVisible();
  await window.getByRole('radio', { name: 'গত ৩০ দিন' }).click();
  await expect(window.getByRole('heading', { name: 'ব্যস্ততম সময়' })).toBeVisible();
});
