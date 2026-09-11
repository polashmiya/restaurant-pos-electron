import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GuestCountModal } from '@/components/pos/GuestCountModal';
import { TableCard } from '@/components/tables/TableCard';
import { createFormatters } from '@/hooks/useFormatters';
import { applyStoreData } from '@/services/bootstrap';
import { promptGuestCount } from '@/services/posActions';
import { setStorageAdapter } from '@/services/storage';
import { usePosStore } from '@/store/posStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useTableStore } from '@/store/tableStore';
import { useUIStore } from '@/store/uiStore';
import type { DiningTable, Order } from '@/types';
import { createEmptyDraft } from '@/utils/orderHelpers';
import { createMemoryStorage } from '../helpers/memoryStorage';

const format = createFormatters({ language: 'bn', numberFormat: 'western', currencySymbol: '৳' });

const occupied: DiningTable = {
  id: 'table-05',
  number: 5,
  name: '05',
  capacity: 4,
  status: 'occupied',
  activeOrderId: 'order-1',
  statusSince: new Date(2026, 8, 10, 12, 0).toISOString(),
};

const order: Pick<Order, 'total' | 'items' | 'guests'> = {
  total: 845,
  guests: 3,
  items: [{ id: 'l1', menuItemId: 'm1', name: { bn: 'বার্গার', en: 'Burger' }, price: 211.25, quantity: 4 }],
};

afterEach(() => cleanup());

describe('TableCard drawing', () => {
  it('shows an occupied table with its guests seated, guests/seats and time at the table', () => {
    render(
      <TableCard table={occupied} order={order} format={format} onSelect={vi.fn()} view="iso" now={new Date(2026, 8, 10, 13, 25)} />,
    );
    const card = screen.getByRole('button', { name: 'টেবিল 05 — দখলকৃত — 3 জন অতিথি' });
    expect(card.textContent).toContain('3/4');
    expect(card.textContent).toContain('৳ 845.00');
    expect(card.textContent).toContain('1 ঘণ্টা 25 মিনিট');
    const drawing = card.querySelector('[data-view="iso"]');
    expect(drawing?.getAttribute('data-seated')).toBe('3');
    expect(drawing?.querySelector('svg')).toBeTruthy();
  });

  it('draws empty chairs at an available table, in either view', () => {
    const available: DiningTable = { id: 't2', number: 2, name: '02', capacity: 6, status: 'available' };
    const { rerender } = render(<TableCard table={available} format={format} onSelect={vi.fn()} view="plan" />);
    const card = screen.getByRole('button', { name: 'টেবিল 02 — খালি' });
    expect(card.querySelector('[data-view="plan"]')?.getAttribute('data-seated')).toBe('0');

    rerender(<TableCard table={available} format={format} onSelect={vi.fn()} view="iso" />);
    expect(card.querySelector('[data-view="iso"]')?.getAttribute('data-seated')).toBe('0');
  });

  it('a reserved table shows the booked party size but nobody seated yet', () => {
    const reserved: DiningTable = {
      id: 't3',
      number: 3,
      name: '03',
      capacity: 4,
      status: 'reserved',
      reservation: { guestName: 'Karim', time: '19:30', guests: 2, createdAt: new Date().toISOString() },
    };
    render(<TableCard table={reserved} format={format} onSelect={vi.fn()} view="iso" />);
    const card = screen.getByRole('button', { name: 'টেবিল 03 — সংরক্ষিত — 2 জন অতিথি' });
    expect(card.textContent).toContain('2/4');
    expect(card.querySelector('[data-view="iso"]')?.getAttribute('data-seated')).toBe('0');
  });

  it('the compact table picker card has no drawing', () => {
    render(<TableCard table={occupied} order={order} format={format} onSelect={vi.fn()} compact />);
    expect(screen.getByRole('button').querySelector('[data-view]')).toBeNull();
  });
});

describe('guest count', () => {
  beforeEach(() => {
    const storage = createMemoryStorage();
    setStorageAdapter(storage);
    applyStoreData(storage.data);
    const table = useTableStore.getState().tables.find((entry) => entry.name === '05')!;
    usePosStore.setState({ draft: { ...createEmptyDraft('dine-in'), tableId: table.id }, isProcessingPayment: false });
    useUIStore.setState({ modalStack: [], toasts: [] });
  });

  afterEach(() => setStorageAdapter(null));

  it('one tap sets the number of guests and closes the dialog', () => {
    const onClose = vi.fn();
    render(<GuestCountModal onClose={onClose} />);
    expect(screen.getAllByRole('button', { name: /জন অতিথি$/ })).toHaveLength(12);

    fireEvent.click(screen.getByRole('button', { name: '3 জন অতিথি' }));
    expect(usePosStore.getState().draft.guests).toBe(3);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('clears a guest count that was set by mistake', () => {
    usePosStore.getState().setGuests(5);
    render(<GuestCountModal onClose={vi.fn()} />);
    expect(screen.getByRole('button', { name: '5 জন অতিথি' }).getAttribute('aria-pressed')).toBe('true');
    fireEvent.click(screen.getByRole('button', { name: 'মুছে ফেলুন' }));
    expect(usePosStore.getState().draft.guests).toBeUndefined();
  });

  it('keeps guest counts within limits', () => {
    usePosStore.getState().setGuests(500);
    expect(usePosStore.getState().draft.guests).toBe(50);
    usePosStore.getState().setGuests(0);
    expect(usePosStore.getState().draft.guests).toBeUndefined();
  });

  it('asks only for a dine-in table order whose guests are unknown, when enabled in Settings', async () => {
    promptGuestCount();
    expect(useUIStore.getState().modalStack.at(-1)).toEqual({ type: 'guestCount' });

    useUIStore.setState({ modalStack: [] });
    usePosStore.getState().setGuests(2);
    promptGuestCount();
    expect(useUIStore.getState().modalStack).toHaveLength(0);

    usePosStore.getState().setGuests(undefined);
    await useSettingsStore.getState().updateUI({ askGuestCount: false });
    promptGuestCount();
    expect(useUIStore.getState().modalStack).toHaveLength(0);
  });
});
