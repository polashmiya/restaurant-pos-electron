/*
 * Geometry of a dining table and its chairs, in "table units" (one chair is
 * about 0.44 units wide). The table is centred on (0, 0); x runs along its
 * length, y along its depth with +y towards the viewer. Both the top view
 * and the 3D (isometric) drawing on the Tables page use this layout.
 */

export type SeatSide = 'top' | 'bottom' | 'left' | 'right';

export interface Seat {
  /** Chair centre. */
  x: number;
  y: number;
  /** The table edge the chair stands at; the guest faces the table. */
  side: SeatSide;
}

export interface TableLayout {
  /** Table top size. */
  length: number;
  depth: number;
  /** Chairs in the order guests take them: facing pairs first, then the ends. */
  seats: Seat[];
  /** Seats beyond the drawn chairs (very large tables). */
  hiddenSeats: number;
}

/** Most chairs drawn around one table; larger tables show "+n". */
export const MAX_DRAWN_SEATS = 12;
const SEAT_PITCH = 0.78;
const CHAIR_GAP = 0.36;

/** Positions along a side for `count` chairs, centred. */
function spread(count: number): number[] {
  return Array.from({ length: count }, (_, index) => (index - (count - 1) / 2) * SEAT_PITCH);
}

/** Alternates two lists: a0, b0, a1, b1, … */
function interleave<T>(first: readonly T[], second: readonly T[]): T[] {
  const result: T[] = [];
  for (let index = 0; index < Math.max(first.length, second.length); index++) {
    if (index < first.length) result.push(first[index]!);
    if (index < second.length) result.push(second[index]!);
  }
  return result;
}

export function computeTableLayout(capacity: number): TableLayout {
  const total = Math.max(Math.trunc(capacity) || 1, 1);
  const drawn = Math.min(total, MAX_DRAWN_SEATS);

  if (drawn <= 4) {
    // Small square table: one chair per side.
    const size = drawn <= 2 ? 1.05 : 1.2;
    const offset = size / 2 + CHAIR_GAP;
    const sides: Seat[] = [
      { x: 0, y: offset, side: 'bottom' },
      { x: 0, y: -offset, side: 'top' },
      { x: -offset, y: 0, side: 'left' },
      { x: offset, y: 0, side: 'right' },
    ];
    return { length: size, depth: size, seats: sides.slice(0, drawn), hiddenSeats: total - drawn };
  }

  // Long table: one chair at each end, the rest along the two long sides.
  const alongSides = drawn - 2;
  const topCount = Math.ceil(alongSides / 2);
  const bottomCount = alongSides - topCount;
  const length = Math.max(1.6, topCount * SEAT_PITCH + 0.3);
  const depth = 1.1;
  const sideOffset = depth / 2 + CHAIR_GAP;
  const endOffset = length / 2 + CHAIR_GAP;

  const bottom = spread(bottomCount).map((x): Seat => ({ x, y: sideOffset, side: 'bottom' }));
  const top = spread(topCount).map((x): Seat => ({ x, y: -sideOffset, side: 'top' }));
  const ends: Seat[] = [
    { x: -endOffset, y: 0, side: 'left' },
    { x: endOffset, y: 0, side: 'right' },
  ];
  return { length, depth, seats: [...interleave(bottom, top), ...ends], hiddenSeats: total - drawn };
}

/** Unit vector from a chair towards the table. */
export function facing(side: SeatSide): { dx: number; dy: number } {
  switch (side) {
    case 'top':
      return { dx: 0, dy: 1 };
    case 'bottom':
      return { dx: 0, dy: -1 };
    case 'left':
      return { dx: 1, dy: 0 };
    case 'right':
      return { dx: -1, dy: 0 };
  }
}

/** Chairs on these sides are behind the table when seen from the front-right (3D view). */
export function isFarSide(side: SeatSide): boolean {
  return side === 'top' || side === 'left';
}
