import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PaymentModal } from '@/components/payment/PaymentModal';
import { applyStoreData } from '@/services/bootstrap';
import { whenIdle } from '@/services/persistQueue';
import { setStorageAdapter } from '@/services/storage';
import { useMenuStore } from '@/store/menuStore';
import { usePosStore } from '@/store/posStore';
import { useShiftStore } from '@/store/shiftStore';
import { useUIStore } from '@/store/uiStore';
import { createEmptyDraft } from '@/utils/orderHelpers';
import { createMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage';

let storage: MemoryStorage;

function addSeedItem(code: string) {
  const item = useMenuStore.getState().items.find((entry) => entry.code === code);
  if (!item) throw new Error(`missing ${code}`);
  usePosStore.getState().addItem(item);
}

beforeEach(async () => {
  storage = createMemoryStorage();
  setStorageAdapter(storage);
  usePosStore.setState({ draft: createEmptyDraft('takeaway'), isProcessingPayment: false });
  useUIStore.setState({ modalStack: [{ type: 'payment' }], toasts: [] });
  applyStoreData(storage.data);
  await useShiftStore.getState().openShift({ cashierName: 'Rahim', openingCash: 500 });
  addSeedItem('BUR-001'); // 250
  addSeedItem('BUR-001'); // 2 × 250 = 500 → total 525 with 5% tax
});

afterEach(async () => {
  cleanup();
  await whenIdle();
  setStorageAdapter(null);
});

const completeButton = () => screen.getByRole('button', { name: /পেমেন্ট সম্পন্ন করুন/ });

describe('PaymentModal', () => {
  it('shows the total due prominently and pre-selects cash', () => {
    render(<PaymentModal onClose={vi.fn()} />);
    expect(screen.getByText('মোট পরিশোধযোগ্য')).toBeTruthy();
    expect(screen.getAllByText('৳ 525.00').length).toBeGreaterThan(0);
    expect(screen.getByRole('radio', { name: /নগদ/ }).getAttribute('aria-checked')).toBe('true');
    expect((completeButton() as HTMLButtonElement).disabled).toBe(true);
  });

  it('quick cash calculates the change and completes the order', async () => {
    render(<PaymentModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '৳ 1,000' }));
    expect(screen.getByText('৳ 475.00')).toBeTruthy();

    fireEvent.click(completeButton());
    await waitFor(() => expect(storage.data.completedOrders).toHaveLength(1));

    const order = storage.data.completedOrders[0];
    expect(order?.payment).toMatchObject({ method: 'cash', amountPaid: 1000, change: 475 });
    expect(useUIStore.getState().modalStack.at(-1)).toMatchObject({ type: 'printPreview', document: 'receipt' });
    expect(usePosStore.getState().draft.items).toHaveLength(0);
  });

  it('exact change pays the total with zero change', async () => {
    render(<PaymentModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'সঠিক টাকা' }));
    fireEvent.click(completeButton());
    await waitFor(() => expect(storage.data.completedOrders).toHaveLength(1));
    expect(storage.data.completedOrders[0]?.payment).toMatchObject({ amountPaid: 525, change: 0 });
  });

  it('blocks completion when not enough cash is received', () => {
    render(<PaymentModal onClose={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('গৃহীত টাকা'), { target: { value: '500' } });

    expect(screen.getByRole('alert').textContent).toContain('পর্যাপ্ত টাকা দেওয়া হয়নি');
    expect((completeButton() as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(completeButton());
    expect(storage.data.completedOrders).toHaveLength(0);
  });

  it('keypad entry works like typing', () => {
    render(<PaymentModal onClose={vi.fn()} />);
    for (const key of ['5', '3', '0']) fireEvent.click(screen.getByRole('button', { name: key }));
    expect((screen.getByLabelText('গৃহীত টাকা') as HTMLInputElement).value).toBe('530');
    expect(screen.getByText('৳ 5.00')).toBeTruthy();
  });

  it('card payments are recorded as paid in full with the reference', async () => {
    render(<PaymentModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('radio', { name: /কার্ড/ }));
    fireEvent.change(screen.getByLabelText('লেনদেন / অনুমোদন নম্বর'), { target: { value: 'APPR-42' } });
    fireEvent.click(completeButton());
    await waitFor(() => expect(storage.data.completedOrders).toHaveLength(1));
    expect(storage.data.completedOrders[0]?.payment).toMatchObject({ method: 'card', amountPaid: 525, change: 0, reference: 'APPR-42' });
  });

  it('a double click saves the order only once', async () => {
    render(<PaymentModal onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'সঠিক টাকা' }));
    const button = completeButton();
    fireEvent.click(button);
    fireEvent.click(button);
    fireEvent.click(button);
    await waitFor(() => expect(storage.data.completedOrders).toHaveLength(1));
    await whenIdle();
    expect(storage.data.completedOrders).toHaveLength(1);
  });
});
