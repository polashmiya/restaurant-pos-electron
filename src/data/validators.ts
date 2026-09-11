import type {
  Category,
  CategoryColor,
  CategoryIcon,
  DiningTable,
  LocalizedText,
  MenuItem,
  Order,
  OrderCounter,
  OrderItem,
  Shift,
} from '@/types';
import { APP_CONFIG } from '@/config/app.config';
import { isPlainObject } from './storeKeys';

/*
 * Runtime validators for persisted records. Used when importing a backup
 * (never trust a file from disk) and when repairing data on startup.
 */

const ORDER_TYPES = ['dine-in', 'takeaway', 'delivery'];
const ORDER_STATUSES = ['draft', 'held', 'completed', 'cancelled'];
const PAYMENT_METHODS = ['cash', 'card', 'mobile'];
const TABLE_STATUSES = ['available', 'occupied', 'reserved', 'waiting'];
const CATEGORY_ICONS: CategoryIcon[] = [
  'appetizer',
  'main',
  'pizza',
  'burger',
  'rice',
  'grill',
  'beverage',
  'dessert',
  'soup',
  'salad',
  'coffee',
  'general',
];
const CATEGORY_COLORS: CategoryColor[] = ['orange', 'red', 'amber', 'green', 'teal', 'blue', 'violet', 'pink'];

const isString = (value: unknown): value is string => typeof value === 'string';
const isNonEmptyString = (value: unknown): value is string => typeof value === 'string' && value.trim().length > 0;
const isFiniteNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isOptional = <T>(value: unknown, check: (input: unknown) => input is T): boolean =>
  value === undefined || check(value);

export function isGuestCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= APP_CONFIG.order.maxGuests;
}

/**
 * Menu photos are either an embedded data URL (picked in Settings) or a photo
 * bundled with the app — never a remote or arbitrary local file URL.
 */
const MENU_IMAGE_SOURCE = /^(?:data:image\/(?:png|jpeg|webp|gif);base64,[A-Za-z0-9+/]+=*|images\/menu\/[a-z0-9-]+\.(?:webp|jpg|png))$/;

export function isMenuImageSource(value: unknown): value is string {
  return typeof value === 'string' && MENU_IMAGE_SOURCE.test(value);
}

export function isLocalizedText(value: unknown): value is LocalizedText {
  return isPlainObject(value) && isString(value.bn) && isString(value.en);
}

export function isCategoryIcon(value: unknown): value is CategoryIcon {
  return typeof value === 'string' && (CATEGORY_ICONS as string[]).includes(value);
}

export function isCategoryColor(value: unknown): value is CategoryColor {
  return typeof value === 'string' && (CATEGORY_COLORS as string[]).includes(value);
}

export function isCategory(value: unknown): value is Category {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isLocalizedText(value.name) &&
    isCategoryIcon(value.icon) &&
    isCategoryColor(value.color) &&
    isFiniteNumber(value.sortOrder)
  );
}

export function isMenuItem(value: unknown): value is MenuItem {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isString(value.code) &&
    isLocalizedText(value.name) &&
    isOptional(value.description, isLocalizedText) &&
    isNonEmptyString(value.categoryId) &&
    isFiniteNumber(value.price) &&
    value.price >= 0 &&
    typeof value.isAvailable === 'boolean' &&
    isOptional(value.image, isMenuImageSource) &&
    isOptional(value.taxRate, isFiniteNumber) &&
    isOptional(value.preparationTime, isFiniteNumber)
  );
}

export function isDiningTable(value: unknown): value is DiningTable {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isFiniteNumber(value.number) &&
    isString(value.name) &&
    isFiniteNumber(value.capacity) &&
    typeof value.status === 'string' &&
    TABLE_STATUSES.includes(value.status) &&
    isOptional(value.activeOrderId, isString)
  );
}

function isOrderItem(value: unknown): value is OrderItem {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isString(value.menuItemId) &&
    isLocalizedText(value.name) &&
    isFiniteNumber(value.price) &&
    isFiniteNumber(value.quantity) &&
    value.quantity > 0 &&
    isOptional(value.note, isLocalizedText)
  );
}

export function isOrder(value: unknown): value is Order {
  if (!isPlainObject(value)) return false;
  const payment = value.payment;
  const paymentValid =
    payment === undefined ||
    (isPlainObject(payment) &&
      typeof payment.method === 'string' &&
      PAYMENT_METHODS.includes(payment.method) &&
      isFiniteNumber(payment.amountPaid) &&
      isFiniteNumber(payment.change) &&
      isString(payment.paidAt));
  return (
    isNonEmptyString(value.id) &&
    isNonEmptyString(value.orderNumber) &&
    typeof value.orderType === 'string' &&
    ORDER_TYPES.includes(value.orderType) &&
    typeof value.status === 'string' &&
    ORDER_STATUSES.includes(value.status) &&
    Array.isArray(value.items) &&
    value.items.every(isOrderItem) &&
    isFiniteNumber(value.subtotal) &&
    isFiniteNumber(value.discount) &&
    isFiniteNumber(value.tax) &&
    isFiniteNumber(value.total) &&
    (value.language === 'bn' || value.language === 'en') &&
    isString(value.createdAt) &&
    isOptional(value.guests, isGuestCount) &&
    paymentValid
  );
}

export function isShift(value: unknown): value is Shift {
  return (
    isPlainObject(value) &&
    isNonEmptyString(value.id) &&
    isString(value.openedAt) &&
    isFiniteNumber(value.openingCash) &&
    isFiniteNumber(value.totalSales) &&
    isFiniteNumber(value.cashSales) &&
    isFiniteNumber(value.cardSales) &&
    isFiniteNumber(value.mobileSales) &&
    isFiniteNumber(value.taxCollected) &&
    isFiniteNumber(value.discountTotal) &&
    isFiniteNumber(value.orderCount) &&
    (value.status === 'open' || value.status === 'closed')
  );
}

export function isOrderCounter(value: unknown): value is OrderCounter {
  return isPlainObject(value) && isString(value.date) && isFiniteNumber(value.sequence) && value.sequence >= 0;
}
