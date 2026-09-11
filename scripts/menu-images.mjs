// Menu photo pipeline (development-time only — the app itself never downloads anything).
//
//   node scripts/menu-images.mjs candidates [CODE ...] [--commons-first]
//        search + download up to 5 options per item into scripts/.image-cache, build contact sheets
//   node scripts/menu-images.mjs sheets [CODE ...]       rebuild contact sheets from the cache
//   node scripts/menu-images.mjs apply                   crop/compress the photos picked in
//                                                        scripts/menu-image-choices.json into public/images/menu
//
// Photos come from Openverse (https://openverse.org) and Wikimedia Commons and are
// restricted to licenses that allow commercial use: CC0, Public Domain, CC BY and CC BY-SA.
// Attribution is generated into src/data/imageCredits.ts and public/images/menu/CREDITS.md
// and shown in Settings → About.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cacheDir = path.join(root, 'scripts', '.image-cache');
const choicesFile = path.join(root, 'scripts', 'menu-image-choices.json');
const outputDir = path.join(root, 'public', 'images', 'menu');
const creditsFile = path.join(root, 'src', 'data', 'imageCredits.ts');

const OUTPUT_WIDTH = 560;
const OUTPUT_HEIGHT = 350;
const CANDIDATES_PER_ITEM = 5;
const LICENSES = 'cc0,pdm,by,by-sa';
const USER_AGENT = 'RestaurantPOS-asset-script/1.0 (offline POS menu photos; attribution kept)';

/** Menu item codes (src/data/seed.ts) with search phrases, best first. */
const ITEMS = [
  ['APP-001', 'Chicken Wings', ['chicken wings', 'buffalo wings']],
  ['APP-002', 'French Fries', ['french fries', 'fries basket']],
  ['APP-003', 'Chicken Nuggets', ['chicken nuggets plate', 'chicken tenders', 'fried chicken strips']],
  ['APP-004', 'Vegetable Spring Roll', ['spring rolls', 'vegetable spring rolls']],
  ['APP-005', 'Thai Soup', ['tom yum soup', 'thai soup']],
  ['APP-006', 'Prawn Tempura', ['shrimp tempura', 'prawn tempura']],
  ['APP-007', 'Caesar Salad', ['caesar salad']],
  ['MAIN-001', 'Butter Chicken', ['butter chicken', 'murgh makhani']],
  ['MAIN-002', 'Beef Bhuna', ['beef bhuna', 'beef curry']],
  ['MAIN-003', 'Mutton Rezala', ['rezala', 'mutton rezala', 'mutton korma', 'lamb korma']],
  ['MAIN-004', 'Fried Hilsa', ['ilish bhaja', 'hilsa fish', 'ilish', 'fried hilsa']],
  ['MAIN-005', 'Chicken Roast', ['chicken roast bangladesh', 'murgir roast', 'chicken korma', 'chicken rezala']],
  ['MAIN-006', 'Mixed Vegetables', ['mixed vegetable curry', 'vegetable curry']],
  ['PIZ-001', 'Margherita Pizza', ['margherita pizza']],
  ['PIZ-002', 'Chicken Pizza', ['chicken pizza']],
  ['PIZ-003', 'Beef Pepperoni Pizza', ['pepperoni pizza']],
  ['PIZ-004', 'BBQ Chicken Pizza', ['bbq chicken pizza', 'barbecue pizza', 'chicken pizza slice']],
  ['PIZ-005', 'Seafood Pizza', ['seafood pizza', 'shrimp pizza']],
  ['BUR-001', 'Chicken Burger', ['chicken burger', 'grilled chicken burger']],
  ['BUR-002', 'Beef Burger', ['beef burger', 'hamburger']],
  ['BUR-003', 'Double Cheese Burger', ['double cheeseburger', 'cheeseburger']],
  ['BUR-004', 'Crispy Chicken Burger', ['crispy chicken burger', 'fried chicken sandwich']],
  ['BUR-005', 'Mushroom Swiss Burger', ['mushroom swiss burger', 'mushroom burger']],
  ['RICE-001', 'Chicken Biryani', ['chicken biryani']],
  ['RICE-002', 'Kacchi Biryani', ['kacchi biryani', 'mutton biryani']],
  ['RICE-003', 'Chicken Fried Rice', ['chicken fried rice', 'fried rice']],
  ['RICE-004', 'Chicken Chow Mein', ['chicken chow mein', 'chow mein']],
  ['RICE-005', 'Morog Polao', ['morog polao', 'polao', 'chicken pulao', 'pulao rice']],
  ['RICE-006', 'Beef Tehari', ['tehari', 'beef tehari', 'beef biryani', 'beef pulao']],
  ['RICE-007', 'Vegetable Chow Mein', ['vegetable lo mein', 'vegetable stir fry noodles', 'veg hakka noodles']],
  ['RICE-008', 'Plain Rice', ['steamed rice bowl', 'white rice bowl']],
  ['GRL-001', 'Chicken Tikka', ['chicken tikka']],
  ['GRL-002', 'Beef Seekh Kebab', ['seekh kebab', 'sheekh kabab']],
  ['GRL-003', 'Grilled Chicken', ['grilled chicken', 'tandoori chicken']],
  ['GRL-004', 'Chicken Reshmi Kebab', ['reshmi kebab', 'malai kebab', 'chicken kebab']],
  ['GRL-005', 'Butter Naan', ['naan bread', 'butter naan']],
  ['GRL-006', 'Paratha', ['paratha', 'porota']],
  ['BEV-001', 'Fresh Orange Juice', ['orange juice glass', 'fresh orange juice']],
  ['BEV-002', 'Coffee', ['cappuccino', 'coffee cup latte']],
  ['BEV-003', 'Cold Coffee', ['iced coffee', 'cold coffee']],
  ['BEV-004', 'Cola', ['glass of cola', 'cola with ice', 'soda ice cubes glass', 'dark soda glass']],
  ['BEV-005', 'Mineral Water', ['bottled water', 'water bottle']],
  ['BEV-006', 'Borhani', ['borhani', 'lassi', 'chaas', 'buttermilk glass']],
  ['BEV-007', 'Masala Tea', ['masala chai', 'chai tea cup']],
  ['BEV-008', 'Mint Lemonade', ['mint lemonade', 'lemonade mint']],
  ['DES-001', 'Chocolate Cake', ['chocolate cake slice', 'chocolate cake']],
  ['DES-002', 'Ice Cream', ['vanilla ice cream scoop', 'ice cream bowl dessert', 'gelato scoops']],
  ['DES-003', 'Firni', ['phirni', 'firni', 'kheer']],
  ['DES-004', 'Rasmalai', ['rasmalai', 'ras malai', 'rosomalai', 'rasgulla']],
  ['DES-005', 'Brownie with Ice Cream', ['brownie ice cream', 'brownie a la mode']],
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchWithRetry(url, options = {}, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    let response;
    try {
      response = await fetch(url, { ...options, signal: AbortSignal.timeout(20_000), headers: { 'User-Agent': USER_AGENT, ...options.headers } });
    } catch (error) {
      console.warn(`  network error (${error.name}) — attempt ${attempt}/${attempts}`);
      await sleep(2000);
      continue;
    }
    if (response.status === 429 || response.status >= 500) {
      const wait = Number(response.headers.get('retry-after')) * 1000 || attempt * 8000;
      console.warn(`  ${response.status} — retrying in ${Math.round(wait / 1000)}s`);
      await sleep(wait);
      continue;
    }
    return response;
  }
  throw new Error(`Request failed after ${attempts} attempts: ${url}`);
}

function describeLicense(result) {
  const name = { cc0: 'CC0', pdm: 'Public Domain Mark', by: 'CC BY', 'by-sa': 'CC BY-SA' }[result.license] ?? result.license;
  return result.license === 'cc0' || result.license === 'pdm' ? name : `${name} ${result.license_version ?? ''}`.trim();
}

/** Openverse (Flickr, Wikimedia, museums…): strict landscape photos first, then relaxed. */
async function searchOpenverse(query, strict) {
  const params = new URLSearchParams({ q: query, license: LICENSES, mature: 'false', page_size: '12' });
  if (strict) {
    params.set('category', 'photograph');
    params.set('aspect_ratio', 'wide');
  }
  const response = await fetchWithRetry(`https://api.openverse.org/v1/images/?${params}`);
  if (!response.ok) throw new Error(`Openverse ${response.status} for "${query}"`);
  const body = await response.json();
  return (body.results ?? [])
    .filter((result) => (result.width ?? 0) >= 640 && (result.height ?? 0) >= 400)
    .map((result) => ({
      id: `ov-${result.id}`,
      url: result.url,
      title: result.title,
      creator: result.creator ?? 'Unknown',
      license: describeLicense(result),
      licenseUrl: result.license_url ?? '',
      source: result.foreign_landing_url ?? result.url,
    }));
}

const stripHtml = (value) => String(value ?? '').replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
const FREE_LICENSE = /^(CC0|Public domain|PD|CC BY(-SA)? \d)/i;

/** Wikimedia Commons: good coverage of Bangladeshi dishes; free licenses only. */
async function searchCommons(query) {
  const params = new URLSearchParams({
    action: 'query',
    format: 'json',
    generator: 'search',
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: '6',
    gsrlimit: '15',
    prop: 'imageinfo',
    iiprop: 'url|size|extmetadata|mime',
    iiurlwidth: '1280',
  });
  const response = await fetchWithRetry(`https://commons.wikimedia.org/w/api.php?${params}`);
  if (!response.ok) throw new Error(`Commons ${response.status} for "${query}"`);
  const body = await response.json();
  const pages = Object.values(body.query?.pages ?? {}).sort((a, b) => (a.index ?? 0) - (b.index ?? 0));
  return pages
    .map((page) => ({ page, info: page.imageinfo?.[0] }))
    .filter(({ info }) => info && /image\/(jpeg|png|webp)/.test(info.mime) && info.width >= 640 && info.height >= 400)
    .filter(({ info }) => FREE_LICENSE.test(info.extmetadata?.LicenseShortName?.value ?? ''))
    .map(({ page, info }) => ({
      id: `wc-${page.pageid}`,
      url: info.thumburl ?? info.url,
      title: stripHtml(info.extmetadata?.ObjectName?.value) || page.title.replace(/^File:/, '').replace(/\.\w+$/, ''),
      creator: stripHtml(info.extmetadata?.Artist?.value) || 'Unknown',
      license: stripHtml(info.extmetadata?.LicenseShortName?.value),
      licenseUrl: info.extmetadata?.LicenseUrl?.value ?? '',
      source: info.descriptionurl ?? `https://commons.wikimedia.org/wiki/${encodeURIComponent(page.title.replace(/ /g, '_'))}`,
    }));
}

async function download(url) {
  const response = await fetchWithRetry(url);
  if (!response.ok) throw new Error(`Download ${response.status}`);
  return Buffer.from(await response.arrayBuffer());
}

async function collectCandidates(codes, commonsFirst = false) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const selected = ITEMS.filter(([code]) => codes.length === 0 || codes.includes(code));
  for (const [code, name, queries] of selected) {
    const dir = path.join(cacheDir, code);
    fs.rmSync(dir, { recursive: true, force: true });
    fs.mkdirSync(dir, { recursive: true });
    const seen = new Set();
    const candidates = [];
    const commons = queries.map((query) => () => searchCommons(query));
    const searches = [
      ...(commonsFirst ? commons : []),
      ...queries.map((query) => () => searchOpenverse(query, true)),
      ...(commonsFirst ? [] : commons),
      ...queries.map((query) => () => searchOpenverse(query, false)),
    ];
    for (const search of searches) {
      if (candidates.length >= CANDIDATES_PER_ITEM) break;
      let results = [];
      try {
        results = await search();
      } catch (error) {
        console.warn(`  search failed: ${error.message}`);
      }
      await sleep(1200);
      for (const result of results) {
        if (candidates.length >= CANDIDATES_PER_ITEM) break;
        if (seen.has(result.id)) continue;
        seen.add(result.id);
        try {
          const buffer = await download(result.url);
          const index = candidates.length;
          await sharp(buffer).rotate().resize(320, 200, { fit: 'cover', position: 'attention' }).jpeg({ quality: 80 }).toFile(path.join(dir, `${index}.jpg`));
          fs.writeFileSync(path.join(dir, `${index}.source`), buffer);
          candidates.push({ index, ...result, title: result.title || name });
        } catch (error) {
          console.warn(`  skipped ${result.url}: ${error.message}`);
        }
      }
    }
    fs.writeFileSync(path.join(dir, 'candidates.json'), JSON.stringify({ code, name, candidates }, null, 2));
    console.info(`${code} ${name}: ${candidates.length} candidate(s)`);
  }
  await buildContactSheets(selected.map(([code]) => code));
}

/** Contact sheets (one PNG per 8 items) for choosing the best photo. */
async function buildContactSheets(only = ITEMS.map(([code]) => code)) {
  const codes = only.filter((code) => fs.existsSync(path.join(cacheDir, code, 'candidates.json')));
  const thumbW = 240;
  const thumbH = 150;
  const labelW = 220;
  const rowH = thumbH + 24;
  const perSheet = 8;
  for (let sheet = 0; sheet * perSheet < codes.length; sheet += 1) {
    const rows = codes.slice(sheet * perSheet, (sheet + 1) * perSheet);
    const width = labelW + CANDIDATES_PER_ITEM * (thumbW + 10);
    const height = rows.length * rowH + 10;
    const composites = [];
    for (const [row, code] of rows.entries()) {
      const { name, candidates } = JSON.parse(fs.readFileSync(path.join(cacheDir, code, 'candidates.json'), 'utf-8'));
      const top = 10 + row * rowH;
      const label = `<svg width="${labelW}" height="${thumbH}"><text x="8" y="40" font-size="22" font-family="Arial" font-weight="bold" fill="#111">${code}</text><text x="8" y="72" font-size="17" font-family="Arial" fill="#333">${name.replace(/&/g, '&amp;')}</text></svg>`;
      composites.push({ input: Buffer.from(label), left: 0, top });
      for (const candidate of candidates) {
        const left = labelW + candidate.index * (thumbW + 10);
        // Preview thumbnails are 320×200 — scale them into the grid cells.
        const thumb = await sharp(path.join(cacheDir, code, `${candidate.index}.jpg`)).resize(thumbW, thumbH).toBuffer();
        composites.push({ input: thumb, left, top });
        const badge = `<svg width="34" height="30"><rect width="34" height="30" rx="6" fill="#2563eb"/><text x="11" y="22" font-size="19" font-family="Arial" font-weight="bold" fill="#fff">${candidate.index}</text></svg>`;
        composites.push({ input: Buffer.from(badge), left: left + 4, top: top + 4 });
      }
    }
    await sharp({ create: { width, height, channels: 3, background: '#f3f4f6' } })
      .composite(composites)
      .png()
      .toFile(path.join(cacheDir, `sheet-${sheet + 1}.png`));
    console.info(`contact sheet: scripts/.image-cache/sheet-${sheet + 1}.png`);
  }
}

/** Some sources return escaped names ("Krzysztof%20Puszczy%u0144ski") or "Unknown". */
function cleanCreator(value) {
  let text = String(value ?? '').trim();
  try {
    text = decodeURIComponent(text.replace(/%u([0-9a-f]{4})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16))));
  } catch {
    // Not URI-encoded — keep as is.
  }
  return /^unknown$/i.test(text) ? '' : text;
}

async function applyChoices() {
  const choices = JSON.parse(fs.readFileSync(choicesFile, 'utf-8'));
  fs.mkdirSync(outputDir, { recursive: true });
  const credits = [];
  for (const [code, name] of ITEMS) {
    const choice = choices[code];
    if (choice === undefined || choice === null) continue;
    const { candidates } = JSON.parse(fs.readFileSync(path.join(cacheDir, code, 'candidates.json'), 'utf-8'));
    const candidate = candidates.find((entry) => entry.index === choice);
    if (!candidate) throw new Error(`${code}: candidate ${choice} not found`);
    const source = fs.readFileSync(path.join(cacheDir, code, `${choice}.source`));
    const file = `${code.toLowerCase()}.webp`;
    await sharp(source)
      .rotate()
      .resize(OUTPUT_WIDTH, OUTPUT_HEIGHT, { fit: 'cover', position: 'attention' })
      .modulate({ saturation: 1.05 })
      .webp({ quality: 76, effort: 6 })
      .toFile(path.join(outputDir, file));
    const creator = cleanCreator(candidate.creator);
    credits.push({ code, name, file: `images/menu/${file}`, title: candidate.title, creator, license: candidate.license, licenseUrl: candidate.licenseUrl, source: candidate.source });
    console.info(`${code} ← candidate ${choice} (${candidate.license}, ${creator || 'unknown author'})`);
  }

  const ts = `/* Generated by scripts/menu-images.mjs — do not edit by hand. */

export interface ImageCredit {
  code: string;
  name: string;
  /** Path relative to index.html (bundled with the app). */
  file: string;
  title: string;
  /** Empty when the source does not name an author. */
  creator: string;
  license: string;
  licenseUrl: string;
  source: string;
}

/** Menu photos bundled with the app and their licenses (shown in Settings → About). */
export const MENU_IMAGE_CREDITS: readonly ImageCredit[] = ${JSON.stringify(credits, null, 2)};

/** Bundled photo for a seeded menu item code, if any. */
export function getBundledMenuImage(code: string): string | undefined {
  return MENU_IMAGE_CREDITS.find((credit) => credit.code === code)?.file;
}
`;
  fs.writeFileSync(creditsFile, ts);

  const markdown = [
    '# Menu photo credits',
    '',
    'Demo menu photos are openly licensed and were resized/cropped for the application.',
    '',
    '| Item | Photo | Author | License |',
    '| --- | --- | --- | --- |',
    ...credits.map((credit) => `| ${credit.name} | [${credit.title.replace(/\|/g, '/')}](${credit.source}) | ${credit.creator.replace(/\|/g, '/') || '—'} | ${credit.licenseUrl ? `[${credit.license}](${credit.licenseUrl})` : credit.license} |`),
    '',
  ].join('\n');
  fs.writeFileSync(path.join(outputDir, 'CREDITS.md'), markdown);
  console.info(`\n${credits.length} photos written to public/images/menu, credits in src/data/imageCredits.ts`);
}

const [mode, ...args] = process.argv.slice(2);
if (mode === 'candidates') await collectCandidates(args.filter((arg) => !arg.startsWith('--')), args.includes('--commons-first'));
else if (mode === 'sheets') await buildContactSheets(args.length ? args : undefined);
else if (mode === 'apply') await applyChoices();
else console.info('Usage: node scripts/menu-images.mjs candidates [CODE ...] [--commons-first] | sheets [CODE ...] | apply');
