import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CartItem } from '@/components/pos/CartItem';
import { createFormatters } from '@/hooks/useFormatters';
import { usePosStore } from '@/store/posStore';
import { useUIStore } from '@/store/uiStore';
import { createEmptyDraft } from '@/utils/orderHelpers';
import { makeOrderItem } from '../helpers/factories';

const format = createFormatters({ language: 'bn', numberFormat: 'western', currencySymbol: '৳' });

function renderLine(quantity: number, extra: Parameters<typeof makeOrderItem>[0] = {}) {
  const item = makeOrderItem({ id: 'line-1', price: 250, quantity, ...extra });
  usePosStore.setState({ draft: { ...createEmptyDraft('takeaway'), items: [item] }, isProcessingPayment: false });
  render(
    <ul>
      <CartItem item={item} format={format} />
    </ul>,
  );
  return item;
}

beforeEach(() => useUIStore.setState({ modalStack: [], toasts: [] }));
afterEach(() => cleanup());

describe('CartItem (compact cart line)', () => {
  it('shows name, unit price, quantity and line total in one row', () => {
    renderLine(2);
    const line = screen.getByRole('listitem');
    expect(line.textContent).toContain('চিকেন বার্গার');
    expect(line.textContent).toContain('প্রতিটি ৳ 250.00');
    expect(line.textContent).toContain('৳ 500.00');
    expect(screen.getByRole('group', { name: 'চিকেন বার্গার এর পরিমাণ' }).textContent).toContain('2');
  });

  it('"−" lowers the quantity; at quantity 1 it removes the line instead', () => {
    renderLine(2);
    fireEvent.click(screen.getByRole('button', { name: 'চিকেন বার্গার এর পরিমাণ কমান' }));
    expect(usePosStore.getState().draft.items[0]?.quantity).toBe(1);

    cleanup();
    renderLine(1);
    expect(screen.queryByRole('button', { name: 'চিকেন বার্গার এর পরিমাণ কমান' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'চিকেন বার্গার অর্ডার থেকে সরান' }));
    expect(usePosStore.getState().draft.items).toHaveLength(0);
  });

  it('shows the kitchen note and kitchen status, and opens the note dialog', () => {
    renderLine(3, { note: { bn: 'পেঁয়াজ ছাড়া', en: 'No onions' }, sentToKitchen: 1 });
    const line = screen.getByRole('listitem');
    expect(line.textContent).toContain('পেঁয়াজ ছাড়া');
    expect(line.textContent).toContain('কিচেনের জন্য নতুন 2টি');

    fireEvent.click(screen.getByRole('button', { name: 'নোট পরিবর্তন' }));
    expect(useUIStore.getState().modalStack.at(-1)).toEqual({ type: 'itemNote', lineId: 'line-1' });
  });
});
