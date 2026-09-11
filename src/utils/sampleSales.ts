import type { Customer, DiningTable, Language, MenuItem, Order, OrderItem, OrderType, PaymentMethod, Shift } from '@/types';
import { calculateOrderTotals, calculatePayment } from './calculations';
import { formatDateKey } from './format';
import { sumMoney } from './money';
import { generateOrderNumber } from './orderNumber';
import { addDays, startOfDay } from './reports';
import { computeShiftTotals } from './shiftMath';

/* ==========================================================================
   Sample sales for demonstrations (Settings → About & developer).
   Realistic, deterministic history for the days BEFORE today: lunch and
   dinner peaks, busier weekends, a mix of order types and payments, a few
   discounts and cancellations, and one closed shift per day. Every record
   is flagged `sample: true` so it can be removed in one step.
   ========================================================================== */

export interface SampleSalesInput {
  menuItems: readonly MenuItem[];
  tables: readonly DiningTable[];
  taxRate: number;
  language: Language;
  /** Order numbers already in use (never reused). */
  existingOrderNumbers: ReadonlySet<string>;
  now: Date;
  days: number;
  seed?: number;
}

export interface SampleSalesResult {
  orders: Order[];
  shifts: Shift[];
}

type Random = () => number;

/** Small seeded PRNG (mulberry32) so the same seed gives the same history. */
function createRandom(seed: number): Random {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function pickWeighted<T>(random: Random, entries: readonly (readonly [T, number])[]): T {
  const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
  let roll = random() * total;
  for (const [value, weight] of entries) {
    roll -= weight;
    if (roll < 0) return value;
  }
  return entries[entries.length - 1]![0];
}

function pick<T>(random: Random, values: readonly T[]): T {
  return values[Math.floor(random() * values.length)]!;
}

/** Stable, skewed popularity per item (1–81), so some dishes are clear best sellers. */
function popularity(item: MenuItem): number {
  let hash = 0;
  for (const char of item.id + item.code) hash = (Math.imul(hash, 31) + char.charCodeAt(0)) >>> 0;
  const level = 1 + (hash % 9);
  return level * level;
}

const HOUR_WEIGHTS = [
  [11, 3],
  [12, 7],
  [13, 10],
  [14, 8],
  [15, 4],
  [16, 3],
  [17, 4],
  [18, 6],
  [19, 8],
  [20, 10],
  [21, 8],
  [22, 3],
] as const;

const ORDER_TYPE_WEIGHTS = [
  ['dine-in', 58],
  ['takeaway', 27],
  ['delivery', 15],
] as const satisfies readonly (readonly [OrderType, number])[];

const PAYMENT_WEIGHTS = [
  ['cash', 55],
  ['mobile', 27],
  ['card', 18],
] as const satisfies readonly (readonly [PaymentMethod, number])[];

/** Names are typed by cashiers in their own language, so samples follow the UI language. */
const CASHIERS: Record<Language, readonly string[]> = {
  bn: ['রহিম', 'নুসরাত', 'করিম'],
  en: ['Rahim', 'Nusrat', 'Karim'],
};

const CUSTOMERS: Record<Language, readonly Customer[]> = {
  bn: [
    { name: 'তানভীর আহমেদ', phone: '01711-482915', address: 'বাড়ি ১২, রোড ৫, ধানমন্ডি, ঢাকা' },
    { name: 'ফারহানা আক্তার', phone: '01819-305276', address: 'ফ্ল্যাট ৪বি, লেক ভিউ, গুলশান ১, ঢাকা' },
    { name: 'সাব্বির হোসেন', phone: '01552-719034', address: 'বাড়ি ৭, সেক্টর ১১, উত্তরা, ঢাকা' },
    { name: 'নুসরাত জাহান', phone: '01915-260483', address: '২২/১ গ্রিন রোড, পান্থপথ, ঢাকা' },
    { name: 'ইমরান খান', phone: '01676-834120', address: 'বাড়ি ৪৫, ব্লক সি, বনানী, ঢাকা' },
    { name: 'শারমিন সুলতানা', phone: '01321-557908', address: 'রোড ৩, মিরপুর ডিওএইচএস, ঢাকা' },
  ],
  en: [
    { name: 'Tanvir Ahmed', phone: '01711-482915', address: 'House 12, Road 5, Dhanmondi, Dhaka' },
    { name: 'Farhana Akter', phone: '01819-305276', address: 'Flat 4B, Lake View, Gulshan 1, Dhaka' },
    { name: 'Sabbir Hossain', phone: '01552-719034', address: 'House 7, Sector 11, Uttara, Dhaka' },
    { name: 'Nusrat Jahan', phone: '01915-260483', address: '22/1 Green Road, Panthapath, Dhaka' },
    { name: 'Imran Khan', phone: '01676-834120', address: 'House 45, Block C, Banani, Dhaka' },
    { name: 'Sharmin Sultana', phone: '01321-557908', address: 'Road 3, Mirpur DOHS, Dhaka' },
  ],
};

function atLocalTime(day: Date, hour: number, minute: number): Date {
  return new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, Math.floor(minute * 0.7) % 60);
}

function cashReceived(random: Random, total: number): number {
  const step = pickWeighted(random, [
    [10, 2],
    [50, 3],
    [100, 4],
    [500, 2],
  ] as const);
  return Math.ceil(total / step) * step;
}

function buildItems(random: Random, orderId: string, menu: readonly MenuItem[], weights: readonly (readonly [MenuItem, number])[]): OrderItem[] {
  const lineCount = Math.min(
    menu.length,
    pickWeighted(random, [
      [1, 20],
      [2, 35],
      [3, 30],
      [4, 15],
    ] as const),
  );
  const chosen = new Map<string, MenuItem>();
  for (let guard = 0; chosen.size < lineCount && guard < 50; guard += 1) {
    const item = pickWeighted(random, weights);
    chosen.set(item.id, item);
  }
  return [...chosen.values()].map((item, index) => {
    const quantity = pickWeighted(random, [
      [1, 70],
      [2, 25],
      [3, 5],
    ] as const);
    return {
      id: `${orderId}-l${index + 1}`,
      menuItemId: item.id,
      code: item.code,
      name: { ...item.name },
      price: item.price,
      quantity,
      ...(item.taxRate !== undefined ? { taxRate: item.taxRate } : {}),
      sentToKitchen: quantity,
    };
  });
}

/** Generates `days` days of history ending yesterday. Empty when the menu has nothing for sale. */
export function generateSampleSales(input: SampleSalesInput): SampleSalesResult {
  const menu = input.menuItems.filter((item) => item.isAvailable && item.price > 0);
  if (menu.length === 0 || input.days <= 0) return { orders: [], shifts: [] };

  const random = createRandom(input.seed ?? 20_260_910);
  const weights = menu.map((item) => [item, popularity(item)] as const);
  const numbers = new Set(input.existingOrderNumbers);
  const today = startOfDay(input.now);
  const orders: Order[] = [];
  const shifts: Shift[] = [];

  for (let offset = input.days; offset >= 1; offset -= 1) {
    const day = addDays(today, -offset);
    const dateKey = formatDateKey(day);
    const weekday = day.getDay();
    const weekend = weekday === 5 || weekday === 6; // Friday & Saturday (Bangladesh)
    const growth = 1 + (input.days - offset) * 0.006;
    const orderCount = Math.round((16 + random() * 10) * (weekend ? 1.35 : 1) * growth);

    const cashiers = CASHIERS[input.language];
    const cashierName = cashiers[offset % cashiers.length]!;
    const shiftId = `sample-shift-${dateKey}`;
    const openedAt = atLocalTime(day, 10, 0);
    const closedAt = atLocalTime(day, 23, 15);

    const times = Array.from({ length: orderCount }, () =>
      atLocalTime(day, pickWeighted(random, HOUR_WEIGHTS), Math.floor(random() * 60)),
    ).sort((a, b) => a.getTime() - b.getTime());

    let counter = { date: '', sequence: 0 };
    const dayOrders: Order[] = [];
    for (const [index, completedAt] of times.entries()) {
      const generated = generateOrderNumber(counter, numbers, day);
      counter = generated.counter;
      numbers.add(generated.orderNumber);

      const id = `sample-${dateKey}-${index + 1}`;
      let orderType: OrderType = pickWeighted(random, ORDER_TYPE_WEIGHTS);
      if (orderType === 'dine-in' && input.tables.length === 0) orderType = 'takeaway';
      const table = orderType === 'dine-in' ? pick(random, input.tables) : undefined;
      const items = buildItems(random, id, menu, weights);
      const discountInput =
        random() < 0.12
          ? {
              type: 'percentage' as const,
              value: pickWeighted(random, [
                [5, 3],
                [10, 4],
                [15, 1],
              ] as const),
            }
          : undefined;
      const totals = calculateOrderTotals(items, discountInput, input.taxRate);
      const createdAt = new Date(completedAt.getTime() - (12 + Math.floor(random() * 30)) * 60_000);
      const cancelled = random() < 0.03;
      const method: PaymentMethod = pickWeighted(random, PAYMENT_WEIGHTS);
      const received = method === 'cash' ? cashReceived(random, totals.total) : totals.total;
      const reference =
        method === 'card'
          ? `APR${String(100_000 + Math.floor(random() * 900_000))}`
          : method === 'mobile'
            ? `TX${Math.floor(random() * 36 ** 8)
                .toString(36)
                .toUpperCase()
                .padStart(8, '0')}`
            : undefined;

      const order: Order = {
        id,
        orderNumber: generated.orderNumber,
        orderType,
        ...(table ? { tableId: table.id, tableName: table.name } : {}),
        items,
        ...(discountInput ? { discountInput } : {}),
        taxRate: input.taxRate,
        subtotal: totals.subtotal,
        discount: totals.discount,
        tax: totals.tax,
        total: totals.total,
        status: cancelled ? 'cancelled' : 'completed',
        language: input.language,
        createdAt: createdAt.toISOString(),
        updatedAt: completedAt.toISOString(),
        ...(cancelled
          ? { cancelledAt: completedAt.toISOString() }
          : {
              completedAt: completedAt.toISOString(),
              payment: {
                method,
                ...calculatePayment(method, totals.total, received),
                paidAt: completedAt.toISOString(),
                ...(reference ? { reference } : {}),
              },
            }),
        ...(orderType === 'delivery' ? { customer: { ...pick(random, CUSTOMERS[input.language]) } } : {}),
        shiftId,
        cashierName,
        kotCount: 1,
        sample: true,
      };
      dayOrders.push(order);
    }

    const totals = computeShiftTotals(dayOrders, shiftId);
    const openingCash = 2000;
    const drift = random() < 0.15 ? pick(random, [-50, -20, 20, 100]) : 0;
    shifts.push({
      id: shiftId,
      openedAt: openedAt.toISOString(),
      closedAt: closedAt.toISOString(),
      cashierName,
      openingCash,
      closingCash: Math.max(0, sumMoney([openingCash, totals.cashSales, drift])),
      ...totals,
      status: 'closed',
      sample: true,
    });
    orders.push(...dayOrders);
  }

  return { orders, shifts };
}
