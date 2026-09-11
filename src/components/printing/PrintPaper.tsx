import type { ReactNode } from 'react';
import { PAPER_DIMENSIONS } from '@/config/app.config';
import type { PaperWidth } from '@/types';
import { DOCUMENT_CSS } from './printStyles';

/** Shows a thermal document on a paper-like sheet inside the app. */
export function PrintPaper({ paperWidth, children }: { paperWidth: PaperWidth; children: ReactNode }) {
  return (
    <div className="max-h-[62vh] overflow-y-auto rounded-card bg-surface-3/70 p-4">
      <style>{DOCUMENT_CSS}</style>
      <div
        className="mx-auto bg-paper text-paper-fg shadow-xl selectable"
        style={{ width: `${PAPER_DIMENSIONS[paperWidth].paperMm}mm`, maxWidth: '100%' }}
      >
        {children}
      </div>
    </div>
  );
}
