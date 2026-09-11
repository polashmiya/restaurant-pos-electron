import type { MenuItem, Order, OrderItem, Shift } from '@/types';

export function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return {
    id: 'item-test',
    code: 'TST-001',
    name: { bn: 'চিকেন বার্গার', en: 'Chicken Burger' },
    categoryId: 'cat-burgers',
    price: 250,
    isAvailable: true,
    ...overrides,
  };
}

export function makeOrderItem(overrides: Partial<OrderItem> = {}): OrderItem {
  return {
    id: 'line-1',
    menuItemId: 'item-test',
    name: { bn: 'চিকেন বার্গার', en: 'Chicken Burger' },
    price: 250,
    quantity: 1,
    ...overrides,
  };
}

export function makeOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: 'order-1',
    orderNumber: 'ORD-20260910-0001',
    orderType: 'takeaway',
    items: [makeOrderItem()],
    taxRate: 5,
    subtotal: 250,
    discount: 0,
    tax: 12.5,
    total: 262.5,
    status: 'completed',
    language: 'bn',
    createdAt: '2026-09-10T08:00:00.000Z',
    updatedAt: '2026-09-10T08:05:00.000Z',
    completedAt: '2026-09-10T08:05:00.000Z',
    payment: { method: 'cash', amountPaid: 300, change: 37.5, paidAt: '2026-09-10T08:05:00.000Z' },
    kotCount: 0,
    ...overrides,
  };
}

export function makeShift(overrides: Partial<Shift> = {}): Shift {
  return {
    id: 'shift-1',
    openedAt: '2026-09-10T07:00:00.000Z',
    cashierName: 'Rahim',
    openingCash: 1000,
    totalSales: 0,
    cashSales: 0,
    cardSales: 0,
    mobileSales: 0,
    taxCollected: 0,
    discountTotal: 0,
    orderCount: 0,
    status: 'open',
    ...overrides,
  };
}
