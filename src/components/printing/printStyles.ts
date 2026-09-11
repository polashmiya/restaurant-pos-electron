import { PAPER_DIMENSIONS } from '@/config/app.config';
import type { PaperWidth } from '@/types';

/**
 * Thermal document styles (receipt, KOT, shift report). Black on white,
 * tuned for 80 mm / 58 mm roll printers. Used both for printing and for the
 * in-app preview, so what the cashier sees is what prints. All selectors are
 * scoped under .pos-doc so they never leak into the application UI.
 */
export const DOCUMENT_CSS = `
.pos-doc{box-sizing:border-box;width:var(--pos-doc-width,72mm);margin:0 auto;padding:3mm 0 5mm;color:#000;background:#fff;
font-family:'POS Print','Noto Sans Bengali Variable','Noto Sans Bengali','Nirmala UI','Vrinda','Segoe UI',Arial,sans-serif;
font-size:12px;line-height:1.4;-webkit-print-color-adjust:exact;print-color-adjust:exact;text-align:start}
.pos-doc--80{--pos-doc-width:72mm}
.pos-doc--58{--pos-doc-width:48mm;font-size:11px}
.pos-doc *{box-sizing:border-box}
.pos-doc p{margin:0}
.pos-doc .c{text-align:center}
.pos-doc .title{font-size:17px;font-weight:800;line-height:1.25;margin:0}
.pos-doc .heading{text-align:center;font-size:14px;font-weight:800;letter-spacing:.04em;margin:2px 0}
.pos-doc .small{font-size:11px}
.pos-doc .strong{font-weight:800}
.pos-doc hr{border:0;border-top:1px dashed #000;margin:6px 0;height:0}
.pos-doc hr.double{border-top:3px double #000}
.pos-doc table{width:100%;border-collapse:collapse}
.pos-doc th,.pos-doc td{padding:1px 0;vertical-align:top;text-align:start;font-weight:400}
.pos-doc thead th{font-weight:700;border-bottom:1px solid #000;padding-bottom:2px}
.pos-doc .num{text-align:end;white-space:nowrap;font-variant-numeric:tabular-nums;padding-inline-start:6px}
.pos-doc .qty{text-align:center;white-space:nowrap;width:9mm;font-variant-numeric:tabular-nums}
.pos-doc .meta th{font-weight:700;width:36%;white-space:nowrap;padding-inline-end:6px}
.pos-doc .item-name{font-weight:600;display:block}
.pos-doc .item-sub{display:block;font-size:10.5px}
.pos-doc .total td{font-size:16px;font-weight:800;padding-top:3px}
.pos-doc .kot-row td{font-size:15px;font-weight:700;padding:3px 0}
.pos-doc .kot-qty{width:17mm;white-space:nowrap;padding-inline-end:4px}
.pos-doc td.kot-qty{font-size:17px;font-weight:800}
.pos-doc .kot-note{display:block;font-size:12.5px;font-weight:600;font-style:italic;margin-top:1px}
.pos-doc .badge{display:inline-block;border:1.5px solid #000;padding:0 6px;font-weight:800;margin:2px 2px 0}
.pos-doc .thanks{font-size:15px;font-weight:800;margin-top:4px}
.pos-doc .lg{font-size:16px}
.pos-doc .gap-top{margin-top:6px}
`;

/** Page setup for a print job of the given roll width. */
export function pageCss(paperWidth: PaperWidth): string {
  const { paperMm } = PAPER_DIMENSIONS[paperWidth];
  return `@page{size:${paperMm}mm auto;margin:0}
html,body{margin:0;padding:0;background:#fff}
body{width:${paperMm}mm}
@media print{.no-print{display:none!important}.pos-doc{width:var(--pos-doc-width)}}`;
}

export function paperClass(paperWidth: PaperWidth): string {
  return paperWidth === '58mm' ? 'pos-doc pos-doc--58' : 'pos-doc pos-doc--80';
}
