# Restaurant POS

A fully offline restaurant **point-of-sale desktop application** for Windows, macOS and Linux —
built with Electron, React, TypeScript, Vite, Tailwind CSS, Zustand and electron-store.

**বাংলা (Bangla) is the default language**; English is one tap away. Everything — ordering,
tables, payments, receipts, kitchen tickets (KOT), order history, sales reports, shifts and
settings — works with Wi-Fi off, no backend and no internet.

---

## Contents

1. [Features](#features)
2. [Technology stack](#technology-stack)
3. [Architecture](#architecture)
4. [Directory structure](#directory-structure)
5. [Installation](#installation)
6. [Development](#development)
7. [Running Electron](#running-electron)
8. [Building](#building)
9. [Packaging (installers)](#packaging-installers)
10. [Customizing & rebranding](#customizing--rebranding)
11. [Local data storage](#local-data-storage)
12. [Backup, restore and data reset](#backup-restore-and-data-reset)
13. [Reports](#reports)
14. [Menu photos](#menu-photos)
15. [Printing](#printing)
16. [Thermal printer setup](#thermal-printer-setup)
17. [Bangla / English localization](#bangla--english-localization)
18. [Theme configuration](#theme-configuration)
19. [Tables and guests](#tables-and-guests)
20. [Keyboard shortcuts](#keyboard-shortcuts)
21. [Testing](#testing)
22. [Security](#security)
23. [Troubleshooting](#troubleshooting)

---

## Features

| Area | What it does |
| --- | --- |
| **POS** | Split screen (≈65 % menu / 35 % cart), large touch cards with real food photos, category tabs, instant search by Bangla name, English name or item code, unavailable items blocked, quantity badges on cards. |
| **Cart** | + / − / delete (48 px controls), per-line bilingual kitchen notes (quick presets + free text), same item + same customization merges, fixed or percentage discount (never above the subtotal), tax, live totals. |
| **Order types** | Dine-in (table required), takeaway, delivery (customer name, phone, address printed on receipt and KOT). |
| **Tables** | 20 seeded tables, each drawn as a real table — chairs for every seat and the seated guests with their plates — in **3D** (isometric) or from above; available / occupied / reserved / waiting-for-bill shown with color **and** icon **and** text; guests / seats and time at the table; start, open, reserve, request bill, open bill; never two active orders on one table. |
| **Guests** | Number of guests per dine-in order (asked when a table is seated — one tap, optional — or taken from the reservation); editable from the cart; drawn on the table and printed on the KOT and receipt. |
| **Hold / resume** | Held orders persist; switching orders auto-holds the one on screen so nothing is lost. |
| **Payment** | Cash, card, mobile banking; quick cash (৳100/500/1000/2000), exact change, touch keypad, live change, "insufficient amount" block, double-click protection. |
| **Transaction safety** | Order saved → table freed → shift updated → cart cleared → print. A failed save changes nothing; a failed print never affects the saved order. Interrupted operations are repaired on the next start. |
| **Receipts & KOT** | 80 mm / 58 mm thermal layouts, Bangla or English (receipts keep the order's original language, reprint in either), incremental KOTs ("additional items"), pre-payment bill, shift (Z) report, test page. Every document opens in the app's print dialog with a live preview, printer and copies, and **Save as PDF**. |
| **Orders** | History with search (order no., customer, phone, table, item, payment reference), date/status/type/payment filters, paging, read-only details, reprint receipt / KOT; active & held orders. |
| **Reports** | Date ranges (today, yesterday, last 7/30 days, this/last month, custom); KPIs with change vs the previous period; daily/hourly/monthly sales chart; busiest hours; payment methods, order types, categories, cashiers; top-selling items with photos; sales summary; chart ⇄ table view; printable thermal sales report; CSV export. |
| **Shift** | Open (cashier + opening cash), live totals (revenue, orders, cash/card/mobile, tax, discount, average, expected drawer cash), close with counted cash and over/short, printable report, history. |
| **Settings** | Restaurant (bilingual), tax, currency (BDT, USD, EUR, GBP, INR), language, theme, number format (English or Bangla digits), **text size, card size, accent color, layout density and table view with a live preview**, images, sounds, guest count prompt, printers, menu & category management (with local images), table management, JSON backup / import, demo reset, sample sales for demonstrations, developer details, photo credits. |
| **Localization** | Every UI string translated; typed keys; Bangla default; dates/times per locale; optional Bangla numerals; bundled Bangla font. |
| **Keyboard & a11y** | F1–F9 shortcuts (F6 Reports), Ctrl/Cmd+K search, Ctrl + / Ctrl − / Ctrl 0 text size, Esc closes dialogs, focus-trapped accessible dialogs, ARIA labels, visible focus, touch-sized targets. |

## Technology stack

| Layer | Library |
| --- | --- |
| Desktop shell | Electron 44 (sandboxed renderer, context isolation) |
| Build | Vite 8 + vite-plugin-electron, TypeScript 6 (strict) |
| UI | React 19, Tailwind CSS 4, Lucide React icons |
| State | Zustand 5 |
| Persistence | electron-store 11 (atomic JSON files) |
| i18n | i18next + react-i18next (typed keys) |
| Font | Noto Sans Bengali (bundled via @fontsource, OFL licensed) |
| Tests | Vitest + Testing Library (unit/integration), Playwright for Electron (end-to-end) |
| Packaging | electron-builder (NSIS, DMG, AppImage) |

## Architecture

```
Electron main process  (electron/main)
  window · security · electron-store · printing · backup · IPC
        │  explicit, validated IPC channels (store:*, print:*, data:*, app:*)
        ▼
Preload (electron/preload)  — contextBridge → window.electronAPI (typed, minimal)
        ▼
React renderer (src)
  components ── UI only
  services   ── workflows: order completion, draft auto-save, printing, backup
  store      ── Zustand: pos, menu, tables, orders, shift, settings, reports, ui
  utils      ── pure logic: calculations, formatting, validation, order numbers, reports
        ▼
Storage adapter (src/services/storage.ts) → IPC → electron-store files
```

Key rules:

- The renderer never touches `fs`, `path`, `electron`, `ipcRenderer` or `process` (enforced by
  the sandbox, by ESLint and by end-to-end tests).
- **Persist first, then update state.** Workflows (`src/services/orderWorkflow.ts`) write to
  disk and only then commit to the stores, so the screen always shows saved data.
- **Derived values are never stored.** Subtotal, tax and total are computed from items,
  discount and tax rate (`src/utils/calculations.ts`, integer minor units — no float errors).
- The same pure data logic (`src/data`, `src/utils`) runs in the main process (seeding, repair,
  backup validation) and in tests.

## Directory structure

```
restaurant-pos/
├── electron/
│   ├── main/            index.ts (lifecycle) · windowManager.ts · security.ts · store.ts
│   │                    ipcHandlers.ts · printManager.ts · dataTransfer.ts · logger.ts · paths.ts
│   ├── preload/         index.ts (contextBridge API)
│   ├── shared/          ipcChannels.ts
│   └── types/           electron.d.ts (typed window.electronAPI contract)
├── src/
│   ├── config/          app.config.ts  ← global constants (defaults, currencies, shortcuts…)
│   ├── styles/          theme.css ← ALL colors & fonts · index.css
│   ├── i18n/            bn.ts · en.ts · index.ts · types.ts · keys.ts
│   ├── types/           domain types (menu, order, table, shift, settings, storage, report)
│   ├── data/            seed.ts · defaults.ts · initialize.ts · backup.ts · validators.ts
│   │                    imageCredits.ts (generated — bundled menu photos and their licenses)
│   ├── store/           posStore · menuStore · tableStore · orderStore · shiftStore · settingsStore
│   │                    reportStore · uiStore
│   ├── services/        orderWorkflow · draftSync · posActions · printService · printActions
│   │                    tableActions · dataActions · reportActions · sampleSalesActions
│   │                    storage · bootstrap · sound
│   ├── utils/           calculations · format · money · orderNumber · orderFilters · search
│   │                    tableRules · shiftMath · validation · localize · keypad · image
│   │                    reports · sampleSales · csv
│   ├── hooks/           useFormatters · useKeyboardShortcuts · useAppBootstrap · useClock …
│   ├── components/
│   │   ├── common/      Button · IconButton · Modal · ConfirmDialog · SearchInput · Select
│   │   │                Input · NumberInput · Badge · Card · EmptyState · LoadingSpinner
│   │   │                Toast · Tooltip · Switch · SegmentedControl · Kbd · ErrorBoundary
│   │   ├── layout/      AppShell · Header · Sidebar · ModalHost · SplashScreen
│   │   ├── pos/         POSLayout · CategoryTabs · MenuGrid · MenuItemCard · CartPanel · CartItem …
│   │   ├── tables/      TablesPage · TableGrid · TableCard · TableActionsModal · ReserveTableModal
│   │   ├── payment/     PaymentModal · CashPaymentPanel · PaymentMethodSelector · NumericKeypad
│   │   ├── printing/    ReceiptPrint · KOTPrint · ShiftReportPrint · SalesReportPrint · PrintPreviewModal …
│   │   ├── orders/      OrdersPage · OrderHistory · OrderDetailsModal · ActiveOrders
│   │   ├── reports/     ReportsPage · ReportFilters · ReportStatTile · ColumnChart · BarList
│   │   │                ChartCard · TopItemsTable · SalesReportModal
│   │   ├── shift/       ShiftPage · ShiftSummary · OpenShiftModal · CloseShiftModal …
│   │   └── settings/    SettingsPage + one component per section
│   ├── App.tsx · main.tsx
├── tests/               Vitest unit & integration tests
├── e2e/                 Playwright tests that drive the real Electron app
├── public/images/menu/  bundled menu photos (webp) + CREDITS.md
├── scripts/             generate-icon.mjs · menu-images.mjs (menu photo pipeline)
├── build/               icon.png (installer/app icon)
├── electron-builder.yml · vite.config.ts · vitest.config.ts · playwright.config.ts
├── tsconfig*.json · eslint.config.js · package.json
```

## Installation

Requirements: **Node.js 20.19+ or 22.12+** (Node 24 recommended) and npm.

```bash
cd restaurant-pos
npm install
```

The Electron binary downloads on first use. After that no internet connection is needed to
develop, build or run the app.

## Development

```bash
npm run dev
```

Starts the Vite dev server **and** Electron with hot reload (renderer changes reload
instantly; main/preload changes restart Electron). Press **F12** in development to open
DevTools.

Development builds store data in a separate folder (`Restaurant POS Dev`) so testing never
touches a restaurant's real data.

> Opening `http://localhost:5173` in a normal browser also works for UI work: the app runs in
> "browser preview mode" using localStorage, and printing falls back to `window.print()`.

## Running Electron

```bash
npm run start      # build, then run the production bundle in Electron
npm run electron   # run the last build (after `npm run build`)
```

## Building

```bash
npm run build       # compile renderer (dist/), main + preload (dist-electron/)
npm run typecheck   # strict TypeScript for renderer, Electron and tests
npm run lint        # ESLint
npm run test        # unit & integration tests
npm run verify      # all of the above
```

## Packaging (installers)

```bash
npm run dist:win     # Windows  → release/<version>/Restaurant POS-Setup-<version>.exe (NSIS)
npm run dist:mac     # macOS    → release/<version>/Restaurant POS-<version>-<arch>.dmg
npm run dist:linux   # Linux    → release/<version>/Restaurant POS-<version>.AppImage
npm run build:electron  # unpacked app for a quick check (release/<version>/<platform>-unpacked)
```

- Build each platform on that platform (or in CI): DMGs require macOS, AppImages are best
  built on Linux.
- The NSIS installer lets the user choose the install folder and creates desktop and Start-menu
  shortcuts. Uninstalling **keeps** the restaurant data.
- Code signing is optional. Without a certificate Windows SmartScreen may warn on first run.
  Add your certificate through electron-builder's standard `CSC_LINK` / `CSC_KEY_PASSWORD`
  environment variables.
- The installed app is fully offline: every script, style, font and image is bundled.

## Customizing & rebranding

Everything that is "global" lives in one obvious place:

| What | Where |
| --- | --- |
| Application name, version, description | `package.json` → `productName`, `version`, `description` (used by the window title, header, installer and About screen) |
| Installer id / copyright / targets | `electron-builder.yml` |
| **Colors** (dark & light), fonts, radii, chart colors | `src/styles/theme.css` — plain hex values, one block per theme |
| App icon | `build/icon.png` (512×512) — or change `BRAND_COLOR` in `scripts/generate-icon.mjs` and run `npm run icons` |
| Defaults (language, theme, currency, tax rate, paper width) | `src/config/app.config.ts` → `defaults` |
| Currencies, quick cash buttons, discount presets, shortcuts, window size, page size | `src/config/app.config.ts` |
| Report defaults (opening range, top-items count, longest custom range, sample days) | `src/config/app.config.ts` → `reports` |
| Demo menu photos | `scripts/menu-images.mjs` + `scripts/menu-image-choices.json` (see [Menu photos](#menu-photos)) |
| Demo menu, categories, tables | `src/data/seed.ts` |
| Default restaurant details and printer/UI settings | `src/data/defaults.ts` |
| Kitchen note presets | `src/data/notePresets.ts` |
| All UI text | `src/i18n/bn.ts` and `src/i18n/en.ts` |

Restaurant name, address, tax rate, currency, menu, tables, printers and preferences can also be
changed at runtime from **Settings** without touching code.

## Local data storage

Data is stored with electron-store as JSON files in the application's data folder:

| OS | Folder |
| --- | --- |
| Windows | `%APPDATA%\Restaurant POS` |
| macOS | `~/Library/Application Support/Restaurant POS` |
| Linux | `~/.config/Restaurant POS` |

| File | Contents |
| --- | --- |
| `pos-settings.json` | settings (restaurant, language, theme, currency, tax, printer, UI) |
| `pos-catalog.json` | categories and menu items |
| `pos-operations.json` | tables, open & held orders, shifts, order counter, POS session |
| `orders/pos-orders-YYYY-MM.json` | completed and cancelled orders, one file per month |
| `backups/` | automatic safety copies made before an import or reset |
| `logs/main.log` | diagnostics log |

Reliability features:

- Writes are atomic (temp file + rename): a crash or power cut never leaves a half-written file.
- On every start `initializeStore()` creates missing collections, seeds demo data **only** when a
  collection has never existed, fills in settings added by newer versions and never overwrites
  user data.
- Interrupted operations are repaired automatically (e.g. an order saved but its table not
  freed, shift totals recomputed from orders).
- Schema migrations run once when an older data version is found (e.g. v2 adds the bundled
  photos to untouched demo menu items — items with your own image are never changed).
- An unreadable file is moved aside as `*.corrupt-<time>.json` (never silently deleted).
- Only one instance of the app can run at a time.
- `POS_USER_DATA_DIR=<folder>` overrides the data folder (portable installs, testing).

The **Settings → Data & backup** screen shows the exact folder and can open it.

## Backup, restore and data reset

- **Export data**: Settings → Data & backup → *Export data* saves one JSON file with the menu,
  categories, tables, orders, shifts and settings wherever you choose. Nothing is uploaded.
- **Import data**: *Import data* validates the whole file first (every record is checked), shows
  what it contains and asks for confirmation. A safety copy of the current data is written to
  `backups/` before anything is replaced.
- **Reset demo data**: Settings → About & developer → *Reset demo data* (with a warning) clears
  orders and shifts and restores the demo menu, tables and default settings — also after a
  safety backup.
- **Sample sales**: Settings → About & developer → *Load sample sales* adds 60 days of realistic,
  clearly flagged demo orders and closed shifts **before today** so Reports can be explored.
  *Remove sample sales* deletes exactly those records; real orders are never touched.

## Reports

**Reports** (sidebar or **F6**) summarizes completed orders for a date range:

- **Date range**: today, yesterday, last 7 days (default), last 30 days, this month, last month
  or a custom from–to range (both days included, up to 366 days).
- **KPI tiles**: total sales, orders, average order, items sold, discounts given, cancelled
  orders — each with the change against the previous period of the same length (arrow + color;
  more discounts/cancellations count as bad news).
- **Sales trend**: hourly for one day, daily up to ~3 months, monthly beyond. Hover a column or
  focus the chart and use ← → to read each value; every chart has a *table view*.
- **Busiest hours**, **payment methods**, **order types**, **sales by category** (item sales
  before discount and tax), **sales by cashier**, **top-selling items** (with photos) and a
  **sales summary** (item sales − discounts + tax = total sales).
- **Print report**: an 80/58 mm thermal sales report with totals, payment and order-type splits
  and the best sellers.
- **Export CSV**: one row per order (UTF-8, opens correctly in Excel with Bangla text; numbers are
  plain so they can be summed; text that looks like a formula is neutralized).

All figures are computed on the fly from the saved orders (integer money math) — nothing extra
is stored. Chart colors are tokens in `theme.css` (`--c-chart-*`), validated for contrast in both
themes.

## Menu photos

The 50 demo menu items ship with real food photos (`public/images/menu/*.webp`, 560×350,
≈25 KB each, 1.3 MB total). They are openly licensed (CC0, public domain, CC BY, CC BY-SA)
from Openverse and Wikimedia Commons; authors, licenses and sources are listed in
**Settings → About & developer → Menu photo credits** and `public/images/menu/CREDITS.md`.

- Your own photos: Settings → Menu → edit an item → *Choose image* (stored locally, resized).
- Photos load from the app bundle — the app still never uses the network.
- Regenerating the demo photos (development only, needs internet):

  ```bash
  node scripts/menu-images.mjs candidates [CODE ...] [--commons-first]  # download options + contact sheets
  # pick the best index per item in scripts/menu-image-choices.json
  node scripts/menu-images.mjs apply                                     # crop, compress, write credits
  ```

| Document | When |
| --- | --- |
| Receipt | After payment (preview opens automatically; optional auto-print), reprint from Orders |
| Pre-payment bill | POS → *Bill* (dine-in) — the table becomes *waiting for bill* |
| KOT | POS → *KOT* (sends only new items; later tickets are marked "additional"), after payment (optional auto-print), reprint from Orders |
| Shift report | Shift → *View report* / after closing a shift |
| Sales report | Reports → *Print report* (for the selected date range) |
| Test page | Settings → Printer |

**The print dialog.** Every document opens in the app's own print dialog: a live preview (the
exact page that prints), the *Printer* (defaults to Settings → Printer) and the number of
*Copies*, plus **Save as PDF** and **Print**. The receipt dialog also switches between receipt
and KOT and between Bangla and English. With *Print without dialog* turned on, the POS *KOT* and
*Bill* buttons (and the test prints) skip the dialog and print straight away. If that printer is
missing or fails, the dialog opens so the cashier can choose another printer or save a PDF.
Automatic printing after payment always goes straight to the configured printers.

**Save as PDF** asks where to save (Documents the first time, then the last folder used) and
suggests a name such as `receipt-ORD-20260910-0001.pdf`, `kot-…`, `bill-…`,
`shift-report-2026-09-10-2135.pdf` or `sales-report-2026-09-04-to-2026-09-10.pdf`. The PDF is
roll-sized, the same as the printout.

How it works: documents are React components rendered to self-contained HTML (inline CSS, the
Bangla font embedded) and printed by the main process from a hidden sandboxed window whose page
is exactly as wide as the roll and as tall as the content. Jobs always go straight to the chosen
printer. The operating-system print dialog is not used: it cannot preview these documents, and
opened from a hidden window it may never return. Every job ends as printed, or as failed with a
reason: no printer installed, printer not found, or no answer within 30 seconds. The order is
never affected, and every document can be reprinted from *Orders*.

`POS_PRINT_TO_PDF_DIR=<folder>` saves every print job, and every *Save as PDF*, as a PDF in that
folder without asking (useful for testing without paper).

## Thermal printer setup

1. Install the manufacturer's Windows/macOS/Linux driver (e.g. Epson TM-T20/T82, Xprinter,
   Rongta) and print a test page from the operating system.
2. In the driver preferences set the paper to **80 mm (72 mm printable)** roll, or 58 mm, and
   enable the auto cutter if you have one.
3. In the POS: **Settings → Printer**
   - choose the *Receipt printer* and the *KOT printer* (the KOT can go to a kitchen printer);
   - choose the *Paper width* (80 mm or 58 mm);
   - turn on *Print without dialog* for one-tap KOT / bill printing (leave it off to see the
     preview and pick the printer each time);
   - optionally turn on *Auto-print receipt / KOT after payment* and *Show prices on KOT*;
   - press *Test receipt printer* / *Test KOT printer*.
4. The test page contains Bangla and English text and digits — if Bangla shows boxes, the
   printer is printing as a raster from a different font: make sure the driver is not set to a
   "device font"/"text only" mode.

## Bangla / English localization

- **Default language is Bangla.** Switch with the বাংলা | English control in the header or in
  Settings → Language & appearance. The choice is saved and restored after a restart.
- Switching language never reloads the app and never touches the cart, tables, orders or shift.
- Translations live in `src/i18n/bn.ts` and `src/i18n/en.ts`. `en.ts` defines the key structure;
  `bn.ts` is type-checked against it, so a missing or extra key is a **compile error**.
  `t('payment.payAndPrint')` keys are type-checked too.
- Adding text: add the key to `en.ts`, add the Bangla text to `bn.ts`, use `t('your.key')`.
- Menu items and categories have `{ bn, en }` names; the UI shows the current language and
  search matches both.
- Receipts store the order's language and reprint in it by default; the cashier may choose the
  other language for a reprint. New KOTs use the current UI language.
- Numbers: English digits by default; Settings → *Number format* switches all prices, dates,
  quantities and receipts to Bangla digits (০১২৩).
- Dates use `bn-BD` / `en-GB` locales (10/09/2026), formatted centrally in `src/utils/format.ts`.
- Currency is formatted centrally (`formatCurrency`) with the configured symbol (default `৳`).
- The Noto Sans Bengali font is bundled (no Google Fonts); Nirmala UI / Vrinda are fallbacks.
- Layouts use logical CSS properties (`ms-`, `pe-`, `start-`…) so an RTL language can be added.

## Theme configuration

- Dark (default), Light or System (follows the OS) — Settings → Language & appearance or the
  header button. The choice persists and also themes the native title bar and dialogs.
- Colors are semantic tokens (`bg`, `surface`, `primary`, `success`, `status-occupied`…)
  defined once per theme in `src/styles/theme.css`. Receipts always print black on white.
- **Settings → Language & appearance → Display & size** (applied instantly, with a live
  preview of menu cards, a table and buttons):
  - *Text size* — small / normal / large / extra large. The whole interface scales (everything
    is sized in `rem`; touch targets never go below 48 px). Also Ctrl + / Ctrl − / Ctrl 0.
  - *Card size* — width of menu item and table cards (`--app-card-scale`).
  - *Accent color* — blue, green, violet, orange or teal for buttons, selections, highlights,
    the report charts, date pickers and selected text (`html[data-accent]` sets in
    `theme.css`, contrast-checked in both themes; chart colors pass the dataviz validator).
    The loading screen starts in the last used theme, accent and text size.
  - *Layout density* (comfortable / compact) and *Table view* (3D / top view).
  - *Reset to defaults* puts all four back.
- *Show item images*, *Sound effects* and *Ask for the number of guests* are under Interface
  preferences.

## Tables and guests

Each table on the Tables page (F2) is drawn from its number of seats (`utils/tableLayout.ts`,
`components/tables/TableIllustration.tsx`): small tables are square with a chair per side,
larger ones are long with a chair at each end. Occupied tables show the guests in their chairs
with plates in front of them, a bill appears on tables waiting for payment, a "reserved" card on
reserved tables, and a plant on free ones. Switch between **3D** and **top view** in the page
header. The card also shows guests / seats and how long the table has been occupied.

The guest count is asked when a table is seated (tap a number, or *Skip*; turn the question off
in Settings), comes from the reservation when a reserved party is seated, and can be changed
any time with the guests button next to the table in the cart.

## Keyboard shortcuts

| Key | Action |
| --- | --- |
| F1 | POS |
| F2 | Tables |
| F3 | Orders |
| F4 / Ctrl+K (⌘K) | Search the menu |
| F5 | Refresh data from local storage (keeps the current order) |
| F6 | Reports |
| F9 | Open payment |
| Ctrl + / Ctrl − | Larger / smaller text (the whole interface) |
| Ctrl 0 | Normal text size |
| Esc | Close the top dialog / clear the search |

Shortcuts are shown in tooltips and in Settings → About.

## Testing

```bash
npm run test       # Vitest: calculations, cart, order ids, tables, workflows, persistence,
                   # shift math, i18n completeness, settings persistence, printing, filters,
                   # reports, sample sales, CSV, data migrations…
npm run test:e2e   # builds, then drives the real Electron app with Playwright:
                   # security, persistence across restarts, full cashier workflow,
                   # language workflow, keyboard shortcuts, reports & menu photos
```

End-to-end tests use a temporary data folder and save print jobs as PDFs, so they never touch
real data or waste paper.

## Security

- `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true` for every window;
  `app.enableSandbox()`.
- Only the typed `window.electronAPI` is exposed; every IPC handler checks that the call comes
  from the app's own page and validates every argument (unknown store keys and malformed
  records are rejected). Menu images must be embedded data URLs or bundled `images/menu/…`
  files — remote or file URLs in a backup are rejected.
- All network requests to remote hosts are blocked; a Content-Security-Policy forbids remote
  scripts, styles, fonts and images; permission requests (camera, location…) are denied;
  navigation, pop-ups and `<webview>` are blocked.
- DevTools and reload shortcuts are disabled in packaged builds.

## Troubleshooting

| Problem | Solution |
| --- | --- |
| **"The application could not start"** | The data folder may not be writable. Check `logs/main.log` in the data folder; make sure the disk isn't full or read-only. |
| **The app does not open a second time** | Only one instance may run (protects the data). The existing window is brought to the front. |
| **Nothing prints / "printer is not available" / "printer did not respond"** | The selected printer was not found, is off or failed. In the print dialog pick another printer or use *Save as PDF*; in Settings → Printer press *Refresh printers* and run a *Test* print. The order is saved either way — reprint from Orders. Details are in `logs/main.log`. |
| **Print on an office (A4) printer** | Documents are roll-sized (80/58 mm); an A4 printer may ask for custom paper. Use a receipt printer, or *Save as PDF* and print the PDF. |
| **Receipt is cut short or too long** | Set the correct *Paper width* in Settings → Printer and the same roll size in the printer driver. |
| **Bangla shows as boxes on screen** | The bundled font is used automatically; if you replaced fonts in `theme.css`, keep "Noto Sans Bengali Variable" first. |
| **Wrong currency symbol / tax** | Settings → Tax & currency. Past orders keep the values they were sold with. |
| **Reports are empty** | Reports only count completed orders in the selected range. For a demonstration use Settings → About & developer → *Load sample sales*. |
| **Start fresh for a new restaurant** | Settings → Data & backup → *Export data* (keep a copy), then Settings → About & developer → *Reset demo data*, then edit the menu and tables. |
| **Move to a new computer** | Export data on the old computer, install the app on the new one, *Import data*. |
| **A data file was reported as corrupt** | It was renamed to `*.corrupt-<time>.json` in the data folder; restore from `backups/` or an exported backup via *Import data*. |
| **Dev: port 5173 in use** | Stop the other process or change `server.port` in `vite.config.ts`. |
| **Dev: `npm run test` times out starting workers on Windows** | The config already uses the `threads` pool; make sure antivirus is not scanning `node_modules`. |

---

© 2026 Restaurant POS. Noto Sans Bengali is licensed under the SIL Open Font License. Demo menu
photos are licensed by their authors as listed in `public/images/menu/CREDITS.md`.
