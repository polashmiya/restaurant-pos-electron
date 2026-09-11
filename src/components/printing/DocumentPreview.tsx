import { useMemo } from 'react';
import { createDocumentContext, renderDocumentElement, type PrintTarget } from '@/services/printService';
import { useSettingsStore } from '@/store/settingsStore';
import type { PrintDocument } from '@/types';
import { PrintPaper } from './PrintPaper';

/** Live preview of a document — the same markup and styles that are printed. */
export function DocumentPreview({ document, target }: { document: PrintDocument; target?: PrintTarget }) {
  const settings = useSettingsStore((state) => state.settings);
  const context = useMemo(() => createDocumentContext(document.language, settings), [document.language, settings]);
  return <PrintPaper paperWidth={context.paperWidth}>{renderDocumentElement(document, context, settings.printer, target)}</PrintPaper>;
}
