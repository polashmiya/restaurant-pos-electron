import fs from 'node:fs';
import { expect, test, type Page } from '@playwright/test';
import { createUserDataDir, launchApp, printOutputDir, removeUserDataDir } from './helpers';

const addItem = (window: Page, name: string) =>
  window.getByRole('button', { name: `${name} অর্ডারে যোগ করুন`, exact: true }).click();

const pdfCount = (userDataDir: string) =>
  fs.existsSync(printOutputDir(userDataDir))
    ? fs.readdirSync(printOutputDir(userDataDir)).filter((file) => file.endsWith('.pdf')).length
    : 0;

test('master spec §80: complete cashier workflow in the real app', async () => {
  const userDataDir = createUserDataDir();
  let launched = await launchApp(userDataDir);
  try {
    let { window } = launched;

    // Launch → Bangla UI
    await expect(window.getByRole('navigation', { name: 'প্রধান নেভিগেশন' })).toBeVisible();
    await expect(window.locator('html')).toHaveAttribute('lang', 'bn');

    // Open shift
    await window.getByRole('button', { name: 'শিফট শুরু করুন' }).click();
    const shiftDialog = window.getByRole('dialog');
    await shiftDialog.getByLabel('ক্যাশিয়ারের নাম').fill('রহিম');
    await shiftDialog.getByLabel('শুরুর নগদ').fill('1000');
    await shiftDialog.getByRole('button', { name: 'শিফট শুরু করুন' }).click();
    await expect(window.getByText('শিফট চালু')).toBeVisible();

    // Dine-in → Table 05
    await window.getByRole('radio', { name: 'ডাইন-ইন' }).click();
    await window.getByRole('button', { name: /টেবিল নির্বাচন করুন/ }).click();
    await window.getByRole('dialog').getByRole('button', { name: /^টেবিল 05/ }).click();
    // How many guests? One tap (shown on the table drawing, KOT and receipt)
    await window.getByRole('dialog', { name: 'অতিথির সংখ্যা' }).getByRole('button', { name: '2 জন অতিথি', exact: true }).click();
    await expect(window.getByRole('dialog')).toHaveCount(0);
    await expect(window.getByRole('button', { name: 'অতিথি: 2 — পরিবর্তন করুন' })).toBeVisible();

    // Items, quantity, note
    await addItem(window, 'চিকেন বার্গার');
    await addItem(window, 'ফ্রেঞ্চ ফ্রাই');
    await window.getByRole('button', { name: 'চিকেন বার্গার এর পরিমাণ বাড়ান' }).click();
    const burgerLine = window.getByRole('list', { name: 'অর্ডারের আইটেম' }).getByRole('listitem').filter({ hasText: 'চিকেন বার্গার' });
    await burgerLine.getByRole('button', { name: 'নোট যোগ করুন' }).click();
    await window.getByRole('dialog').getByRole('button', { name: 'পেঁয়াজ ছাড়া' }).click();
    await window.getByRole('dialog').getByRole('button', { name: 'নোট সংরক্ষণ' }).click();
    await expect(burgerLine.getByText('পেঁয়াজ ছাড়া')).toBeVisible();

    // Discount 10% → tax 5% → total 614.25
    await window.getByRole('button', { name: 'ছাড় যোগ করুন' }).click();
    await window.getByRole('dialog').getByRole('button', { name: '10%', exact: true }).click();
    await window.getByRole('dialog').getByRole('button', { name: 'ছাড় প্রয়োগ করুন' }).click();
    await expect(window.getByText('৳ 614.25').first()).toBeVisible();

    // The Tables page draws table 05 with its 2 guests seated
    await window.keyboard.press('F2');
    const table05 = window.getByRole('button', { name: 'টেবিল 05 — দখলকৃত — 2 জন অতিথি' });
    await expect(table05).toBeVisible();
    await expect(table05.locator('[data-view="iso"]')).toHaveAttribute('data-seated', '2');
    await window.keyboard.press('F1');

    // KOT button → the app's print dialog (preview, printer, Save as PDF) → Print
    await window.getByRole('button', { name: 'কিচেনে পাঠান' }).click();
    const kotDialog = window.getByRole('dialog', { name: 'প্রিন্ট' });
    await expect(kotDialog.getByText('কিচেন অর্ডার', { exact: true }).first()).toBeVisible();
    await expect(kotDialog.getByRole('button', { name: 'PDF হিসেবে সংরক্ষণ' })).toBeVisible();
    await kotDialog.getByRole('button', { name: 'প্রিন্ট', exact: true }).click();
    await expect(window.getByRole('dialog')).toHaveCount(0);
    await expect(window.getByText('কিচেন অর্ডার পাঠানো হয়েছে')).toBeVisible();
    await expect.poll(() => pdfCount(userDataDir)).toBe(1);

    // Pay & Print → Cash → quick amount → change → complete
    await window.getByRole('button', { name: /পেমেন্ট ও বিল প্রিন্ট/ }).click();
    const payment = window.getByRole('dialog');
    await payment.getByRole('button', { name: '৳ 1,000' }).click();
    await expect(payment.getByText('৳ 385.75')).toBeVisible();
    await payment.getByRole('button', { name: 'পেমেন্ট সম্পন্ন করুন' }).click();

    // Receipt preview → print receipt → switch to KOT and print it → save the receipt as PDF
    await expect(window.getByRole('heading', { name: 'রসিদ প্রিভিউ' })).toBeVisible();
    await expect(window.getByText('ফেরত দিন: ৳ 385.75')).toBeVisible();
    await window.getByRole('button', { name: 'রসিদ প্রিন্ট', exact: true }).click();
    await expect(window.getByText('রসিদ প্রিন্ট হয়েছে')).toBeVisible();
    await expect.poll(() => pdfCount(userDataDir)).toBe(2);
    await window.getByRole('dialog').getByRole('radio', { name: 'কিচেন অর্ডার' }).click();
    await window.getByRole('button', { name: 'কিচেন অর্ডার প্রিন্ট', exact: true }).click();
    await expect.poll(() => pdfCount(userDataDir)).toBe(3);
    await window.getByRole('dialog').getByRole('radio', { name: 'রসিদ' }).click();
    await window.getByRole('dialog').getByRole('button', { name: 'PDF হিসেবে সংরক্ষণ' }).click();
    await expect(window.getByText(/PDF সংরক্ষিত হয়েছে: .*saved-.*receipt-ORD-\d{8}-0001\.pdf/)).toBeVisible();
    await expect.poll(() => pdfCount(userDataDir)).toBe(4);
    await window.getByRole('dialog').getByRole('button', { name: 'নতুন অর্ডার', exact: true }).click();

    // Table 05 is available again
    await window.keyboard.press('F2');
    await expect(window.getByRole('button', { name: 'টেবিল 05 — খালি' })).toBeVisible();

    // Order appears in history and can be reprinted
    await window.keyboard.press('F3');
    const orderCell = window.getByRole('cell', { name: /^ORD-\d{8}-0001$/ });
    await expect(orderCell).toBeVisible();
    await orderCell.click();
    await window.getByRole('button', { name: 'রসিদ পুনরায় প্রিন্ট' }).click();
    await expect(window.getByText('পুনঃমুদ্রণ')).toBeVisible();
    await window.getByRole('button', { name: 'রসিদ প্রিন্ট', exact: true }).click();
    await expect.poll(() => pdfCount(userDataDir)).toBe(5);

    // Shift totals were updated
    await window.keyboard.press('Escape');
    await window.keyboard.press('Escape');
    await window.getByRole('button', { name: 'শিফট', exact: true }).click();
    await expect(window.getByText('৳ 614.25').first()).toBeVisible();

    // Everything survives a restart
    await launched.app.close();
    launched = await launchApp(userDataDir);
    window = launched.window;
    await expect(window.getByText('শিফট চালু')).toBeVisible();
    await window.getByRole('navigation', { name: 'প্রধান নেভিগেশন' }).getByRole('button', { name: 'অর্ডার' }).click();
    await expect(window.getByRole('cell', { name: /^ORD-\d{8}-0001$/ })).toBeVisible();
    await window.getByRole('navigation', { name: 'প্রধান নেভিগেশন' }).getByRole('button', { name: 'টেবিল' }).click();
    await expect(window.getByRole('button', { name: 'টেবিল 05 — খালি' })).toBeVisible();
  } finally {
    await launched.app.close();
    removeUserDataDir(userDataDir);
  }
});
