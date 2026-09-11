import { create } from 'zustand';
import { APP_CONFIG } from '@/config/app.config';
import type { CustomRangeInput, ReportRangePreset } from '@/types';
import { formatIsoDay } from '@/utils/format';
import { addDays, startOfDay } from '@/utils/reports';

/** Reports page filters — kept while the app runs, so leaving the page keeps the selection. */
interface ReportFilterState {
  preset: ReportRangePreset;
  custom: CustomRangeInput;
  setPreset: (preset: ReportRangePreset) => void;
  setCustom: (custom: CustomRangeInput) => void;
}

function defaultCustomRange(): CustomRangeInput {
  const today = startOfDay(new Date());
  return { from: formatIsoDay(addDays(today, -6)), to: formatIsoDay(today) };
}

export const useReportStore = create<ReportFilterState>()((set) => ({
  preset: APP_CONFIG.reports.defaultRange,
  custom: defaultCustomRange(),
  setPreset: (preset) => set({ preset }),
  setCustom: (custom) => set({ custom }),
}));
