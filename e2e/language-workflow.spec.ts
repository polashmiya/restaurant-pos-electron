import { expect, test } from '@playwright/test';
import { createUserDataDir, launchApp, removeUserDataDir } from './helpers';

test('master spec §81: language switching keeps the cart and survives restarts', async () => {
  const userDataDir = createUserDataDir();
  let launched = await launchApp(userDataDir);
  try {
    let { window } = launched;
    const nav = () => window.getByRole('navigation', { name: /প্রধান নেভিগেশন|Main navigation/ });

    // Launch → Bangla
    await expect(nav().getByRole('button', { name: 'বিক্রয়' })).toBeVisible();
    await window.getByRole('button', { name: 'চিকেন বার্গার অর্ডারে যোগ করুন', exact: true }).click();
    await window.getByRole('button', { name: 'কোকা-কোলা অর্ডারে যোগ করুন', exact: true }).click();

    // Change language to English → labels become English, cart unchanged
    await window.getByRole('radio', { name: 'English' }).first().click();
    await expect(window.locator('html')).toHaveAttribute('lang', 'en');
    await expect(nav().getByRole('button', { name: 'POS' })).toBeVisible();
    await expect(window.getByRole('button', { name: /Pay & Print Bill/ })).toBeVisible();
    const cart = window.getByRole('list', { name: 'Order items' });
    await expect(cart.getByText('Chicken Burger')).toBeVisible();
    await expect(cart.getByText('Coca-Cola')).toBeVisible();
    await expect(window.getByText('৳ 325.50').first()).toBeVisible();

    // Complete the order → receipt is English
    await window.getByRole('button', { name: /Pay & Print Bill/ }).click();
    await window.getByRole('dialog').getByRole('button', { name: 'Open shift' }).click();
    await window.getByRole('dialog').getByLabel('Cashier name').fill('Karim');
    await window.getByRole('dialog').getByRole('button', { name: 'Open shift' }).click();
    await window.getByRole('dialog').getByRole('radio', { name: /Card/ }).click();
    await window.getByRole('dialog').getByRole('button', { name: 'Complete payment' }).click();
    await expect(window.getByRole('heading', { name: 'Receipt preview' })).toBeVisible();
    await expect(window.locator('[data-document="receipt"]').getByText('RECEIPT', { exact: true })).toBeVisible();
    await expect(window.locator('[data-document="receipt"]').getByText('THANK YOU')).toBeVisible();
    await window.getByRole('dialog').getByRole('button', { name: 'New order', exact: true }).click();

    // Restart → English remains
    await launched.app.close();
    launched = await launchApp(userDataDir);
    window = launched.window;
    await expect(nav().getByRole('button', { name: 'POS' })).toBeVisible();

    // The English receipt stays English even when the UI is Bangla
    await window.getByRole('radio', { name: 'বাংলা' }).first().click();
    await expect(nav().getByRole('button', { name: 'বিক্রয়' })).toBeVisible();
    await window.keyboard.press('F3');
    await window.getByRole('cell', { name: /^ORD-/ }).click();
    await window.getByRole('button', { name: 'রসিদ পুনরায় প্রিন্ট' }).click();
    await expect(window.locator('[data-document="receipt"]').getByText('RECEIPT', { exact: true })).toBeVisible();
    await window.keyboard.press('Escape');
    await window.keyboard.press('Escape');

    // Theme also persists
    await window.getByRole('button', { name: /থিম: ডার্ক/ }).click();
    await expect(window.locator('html')).toHaveClass(/light/);

    // Restart → Bangla + light theme remain
    await launched.app.close();
    launched = await launchApp(userDataDir);
    window = launched.window;
    await expect(nav().getByRole('button', { name: 'বিক্রয়' })).toBeVisible();
    await expect(window.locator('html')).toHaveClass(/light/);
  } finally {
    await launched.app.close();
    removeUserDataDir(userDataDir);
  }
});
