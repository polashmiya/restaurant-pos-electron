/**
 * @font-face rules embedding the bundled Noto Sans Bengali font as data URIs,
 * so printed documents render Bangla correctly in the sandboxed print window
 * without any file or network access. Loaded lazily on the first print.
 */
const BENGALI_RANGE =
  'U+0951-0952,U+0964-0965,U+0980-09FE,U+1CD0,U+1CD2,U+1CD5-1CD6,U+1CD8,U+1CE1,U+1CEA,U+1CED,U+1CF2,U+1CF5-1CF7,U+200C-200D,U+20B9,U+25CC,U+A8F1';
const LATIN_RANGE =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';

let fontCss: Promise<string> | null = null;

function fontFace(dataUrl: string, unicodeRange: string): string {
  return `@font-face{font-family:'POS Print';font-style:normal;font-weight:100 900;src:url(${dataUrl}) format('woff2');unicode-range:${unicodeRange}}`;
}

export function getPrintFontCss(): Promise<string> {
  fontCss ??= Promise.all([
    import('@fontsource-variable/noto-sans-bengali/files/noto-sans-bengali-bengali-wght-normal.woff2?inline'),
    import('@fontsource-variable/noto-sans-bengali/files/noto-sans-bengali-latin-wght-normal.woff2?inline'),
  ])
    .then(([bengali, latin]) => fontFace(bengali.default, BENGALI_RANGE) + fontFace(latin.default, LATIN_RANGE))
    // System Bangla fonts (Nirmala UI, Vrinda) remain as a fallback.
    .catch(() => '');
  return fontCss;
}
