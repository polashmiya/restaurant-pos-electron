import { describe, expect, it } from 'vitest';
import { computeTableLayout, facing, isFarSide, MAX_DRAWN_SEATS, type Seat } from '@/utils/tableLayout';

const sides = (seats: Seat[]) => seats.map((seat) => seat.side);

describe('computeTableLayout', () => {
  it('draws exactly one chair per seat', () => {
    for (const capacity of [1, 2, 3, 4, 5, 6, 7, 8, 10, 12]) {
      expect(computeTableLayout(capacity).seats, `capacity ${capacity}`).toHaveLength(capacity);
    }
  });

  it('seats small tables face to face first', () => {
    expect(sides(computeTableLayout(2).seats)).toEqual(['bottom', 'top']);
    expect(sides(computeTableLayout(4).seats)).toEqual(['bottom', 'top', 'left', 'right']);
    const square = computeTableLayout(4);
    expect(square.length).toBe(square.depth);
  });

  it('long tables have one chair at each end and the rest along the sides', () => {
    const layout = computeTableLayout(8);
    expect(sides(layout.seats).filter((side) => side === 'left' || side === 'right')).toHaveLength(2);
    expect(sides(layout.seats).filter((side) => side === 'top')).toHaveLength(3);
    expect(sides(layout.seats).filter((side) => side === 'bottom')).toHaveLength(3);
    // Guests fill facing pairs first, the ends last.
    expect(sides(layout.seats).slice(0, 2)).toEqual(['bottom', 'top']);
    expect(sides(layout.seats).slice(-2)).toEqual(['left', 'right']);
    expect(layout.length).toBeGreaterThan(layout.depth);
  });

  it('keeps chairs outside the table top and never on top of each other', () => {
    for (const capacity of [2, 4, 6, 9, 12]) {
      const { length, depth, seats } = computeTableLayout(capacity);
      for (const seat of seats) {
        expect(Math.abs(seat.x) > length / 2 || Math.abs(seat.y) > depth / 2).toBe(true);
      }
      const keys = new Set(seats.map((seat) => `${seat.x.toFixed(3)},${seat.y.toFixed(3)}`));
      expect(keys.size).toBe(seats.length);
    }
  });

  it('caps the drawing for very large tables and reports the rest', () => {
    const layout = computeTableLayout(20);
    expect(layout.seats).toHaveLength(MAX_DRAWN_SEATS);
    expect(layout.hiddenSeats).toBe(20 - MAX_DRAWN_SEATS);
    expect(computeTableLayout(0).seats).toHaveLength(1);
  });

  it('every guest faces the table; far-side chairs are drawn behind it', () => {
    for (const seat of computeTableLayout(6).seats) {
      const { dx, dy } = facing(seat.side);
      // Moving towards the table brings the chair closer to the centre.
      expect(Math.hypot(seat.x + dx * 0.1, seat.y + dy * 0.1)).toBeLessThan(Math.hypot(seat.x, seat.y));
    }
    expect(isFarSide('top')).toBe(true);
    expect(isFarSide('left')).toBe(true);
    expect(isFarSide('bottom')).toBe(false);
    expect(isFarSide('right')).toBe(false);
  });
});
