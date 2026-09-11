import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { applyStoreData } from '@/services/bootstrap';
import { renderDocumentHtml } from '@/services/printService';
import { setStorageAdapter } from '@/services/storage';
import { selectCurrentShift, useShiftStore } from '@/store/shiftStore';
import { isAppError } from '@/utils/errors';
import { createMemoryStorage, type MemoryStorage } from '../helpers/memoryStorage';

let storage: MemoryStorage;

beforeEach(() => {
  storage = createMemoryStorage();
  setStorageAdapter(storage);
  applyStoreData(storage.data);
});

afterEach(() => setStorageAdapter(null));

describe('shift store', () => {
  it('opens a shift and persists it', async () => {
    const shift = await useShiftStore.getState().openShift({ cashierName: '  রহিম  ', openingCash: 1500 });
    expect(shift).toMatchObject({ cashierName: 'রহিম', openingCash: 1500, status: 'open', totalSales: 0, orderCount: 0 });
    expect(storage.data.shifts).toHaveLength(1);
    expect(selectCurrentShift(useShiftStore.getState())?.id).toBe(shift.id);
  });

  it('allows only one open shift at a time', async () => {
    await useShiftStore.getState().openShift({ cashierName: 'A', openingCash: 0 });
    await expect(useShiftStore.getState().openShift({ cashierName: 'B', openingCash: 0 })).rejects.toSatisfy(
      (error: unknown) => isAppError(error) && error.messageKey === 'shift.alreadyOpen',
    );
  });

  it('closes the shift with the counted cash and notes', async () => {
    await useShiftStore.getState().openShift({ cashierName: 'Rahim', openingCash: 1000 });
    const closed = await useShiftStore.getState().closeShift({ closingCash: 950.5, notes: ' short by 49.50 ' });

    expect(closed).toMatchObject({ status: 'closed', closingCash: 950.5, notes: 'short by 49.50' });
    expect(closed.closedAt).toBeDefined();
    expect(selectCurrentShift(useShiftStore.getState())).toBeUndefined();
    expect(storage.data.shifts[0]?.status).toBe('closed');
  });

  it('prints a localized shift report', async () => {
    await useShiftStore.getState().openShift({ cashierName: 'Rahim', openingCash: 1000 });
    const shift = await useShiftStore.getState().closeShift({ closingCash: 1000 });

    const bangla = await renderDocumentHtml({ type: 'shiftReport', shift, language: 'bn' });
    expect(bangla).toContain('শিফট রিপোর্ট');
    expect(bangla).toContain('মোট বিক্রয়');
    expect(bangla).toContain('প্রত্যাশিত নগদ');

    const english = await renderDocumentHtml({ type: 'shiftReport', shift, language: 'en' });
    expect(english).toContain('SHIFT REPORT');
    expect(english).toContain('Cash sales');
  });
});
