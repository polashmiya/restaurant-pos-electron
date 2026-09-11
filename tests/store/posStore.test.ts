import { beforeEach, describe, expect, it } from 'vitest';
import { usePosStore } from '@/store/posStore';
import { createEmptyDraft } from '@/utils/orderHelpers';
import { makeMenuItem } from '../helpers/factories';

const burger = makeMenuItem({ id: 'item-burger', name: { bn: 'চিকেন বার্গার', en: 'Chicken Burger' }, price: 250 });
const fries = makeMenuItem({ id: 'item-fries', code: 'APP-002', name: { bn: 'ফ্রেঞ্চ ফ্রাই', en: 'French Fries' }, price: 150 });

describe('POS cart', () => {
  beforeEach(() => {
    usePosStore.setState({ draft: createEmptyDraft('takeaway'), isProcessingPayment: false });
  });

  const lines = () => usePosStore.getState().draft.items;

  it('adds items and increases quantity for the same item', () => {
    const pos = usePosStore.getState();
    expect(pos.addItem(burger)).toBe('added');
    pos.addItem(fries);
    pos.addItem(burger);

    expect(lines()).toHaveLength(2);
    expect(lines()[0]).toMatchObject({ menuItemId: 'item-burger', quantity: 2, price: 250 });
    expect(lines()[1]).toMatchObject({ menuItemId: 'item-fries', quantity: 1 });
  });

  it('refuses unavailable items', () => {
    expect(usePosStore.getState().addItem({ ...burger, isAvailable: false })).toBe('unavailable');
    expect(lines()).toHaveLength(0);
  });

  it('updates quantities with + / − and never goes below 1', () => {
    const pos = usePosStore.getState();
    pos.addItem(burger);
    const lineId = lines()[0]!.id;
    pos.incrementItem(lineId);
    pos.incrementItem(lineId);
    expect(lines()[0]?.quantity).toBe(3);
    pos.decrementItem(lineId);
    pos.decrementItem(lineId);
    pos.decrementItem(lineId);
    expect(lines()[0]?.quantity).toBe(1);
    pos.setItemQuantity(lineId, 12);
    expect(lines()[0]?.quantity).toBe(12);
  });

  it('removes an item', () => {
    const pos = usePosStore.getState();
    pos.addItem(burger);
    pos.addItem(fries);
    pos.removeItem(lines()[0]!.id);
    expect(lines().map((line) => line.menuItemId)).toEqual(['item-fries']);
  });

  it('stores bilingual notes and keeps customized lines separate', () => {
    const pos = usePosStore.getState();
    pos.addItem(burger);
    const lineId = lines()[0]!.id;
    pos.setItemNote(lineId, ['no-onion', 'extra-spicy'], 'Serve hot');

    expect(lines()[0]?.note).toEqual({ bn: 'পেঁয়াজ ছাড়া, অতিরিক্ত ঝাল, Serve hot', en: 'No onions, Extra spicy, Serve hot' });
    expect(lines()[0]?.noteTags).toEqual(['no-onion', 'extra-spicy']);

    // Same item, different customization → a separate line.
    pos.addItem(burger);
    expect(lines()).toHaveLength(2);
    expect(lines()[1]?.note).toBeUndefined();

    // Clearing the note removes it completely.
    pos.setItemNote(lineId, [], '');
    expect(lines()[0]?.note).toBeUndefined();
    expect(lines()[0]?.noteTags).toBeUndefined();
  });

  it('sets and removes a discount', () => {
    const pos = usePosStore.getState();
    pos.setDiscount({ type: 'percentage', value: 10 });
    expect(usePosStore.getState().draft.discountInput).toEqual({ type: 'percentage', value: 10 });
    pos.setDiscount(undefined);
    expect(usePosStore.getState().draft.discountInput).toBeUndefined();
  });
});
