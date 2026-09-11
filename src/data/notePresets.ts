import type { NotePreset } from '@/types';

/** Quick kitchen instructions offered for every cart item. */
export const NOTE_PRESETS: readonly NotePreset[] = [
  { id: 'no-onion', label: { bn: 'পেঁয়াজ ছাড়া', en: 'No onions' } },
  { id: 'extra-spicy', label: { bn: 'অতিরিক্ত ঝাল', en: 'Extra spicy' } },
  { id: 'less-spicy', label: { bn: 'কম ঝাল', en: 'Less spicy' } },
  { id: 'less-salt', label: { bn: 'কম লবণ', en: 'Less salt' } },
  { id: 'no-cheese', label: { bn: 'চিজ ছাড়া', en: 'No cheese' } },
  { id: 'extra-cheese', label: { bn: 'অতিরিক্ত চিজ', en: 'Extra cheese' } },
  { id: 'well-done', label: { bn: 'ভালোভাবে রান্না করা', en: 'Well done' } },
  { id: 'less-oil', label: { bn: 'কম তেল', en: 'Less oil' } },
  { id: 'extra-sauce', label: { bn: 'অতিরিক্ত সস', en: 'Extra sauce' } },
  { id: 'no-ice', label: { bn: 'বরফ ছাড়া', en: 'No ice' } },
  { id: 'less-sugar', label: { bn: 'কম চিনি', en: 'Less sugar' } },
  { id: 'pack-separately', label: { bn: 'আলাদা প্যাক করুন', en: 'Pack separately' } },
];

export function findNotePreset(id: string): NotePreset | undefined {
  return NOTE_PRESETS.find((preset) => preset.id === id);
}
