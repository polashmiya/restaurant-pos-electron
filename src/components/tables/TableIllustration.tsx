import { memo, type ReactElement } from 'react';
import type { TableStatus, TableView } from '@/types';
import { cn } from '@/utils/cn';
import { computeTableLayout, facing, isFarSide, type Seat, type TableLayout } from '@/utils/tableLayout';

/* ==========================================================================
   Drawing of a dining table with its chairs and seated guests, as an SVG.
   Two views of the same layout: "plan" (from above) and "iso" (3D,
   isometric, seen from the front-right). Colors are theme tokens
   (--c-scene-*); status is also shown as text on the card, never by the
   drawing alone.
   ========================================================================== */

/** SVG user units per table unit. */
const S = 40;
const COS30 = Math.cos(Math.PI / 6);
const SIN30 = 0.5;

const TABLE_HEIGHT = 0.74;
const TOP_THICKNESS = 0.07;
const SEAT_HEIGHT = 0.44;
const SEAT_THICKNESS = 0.06;
const BACK_TOP = 0.98;
const CHAIR_HALF = 0.21;
const SHOULDER_HEIGHT = 1.0;
const HEAD_HEIGHT = 1.15;
const HEAD_RADIUS = 0.12;

const SHIRTS = [
  'fill-scene-shirt-1',
  'fill-scene-shirt-2',
  'fill-scene-shirt-3',
  'fill-scene-shirt-4',
  'fill-scene-shirt-5',
  'fill-scene-shirt-6',
] as const;
const SKINS = ['fill-scene-skin-1', 'fill-scene-skin-2', 'fill-scene-skin-3'] as const;
const HAIRS = ['fill-scene-hair-1', 'fill-scene-hair-2'] as const;

interface Look {
  shirt: string;
  skin: string;
  hair: string;
}

/** Deterministic variety of clothes and hair per table and seat. */
function lookFor(seed: number, index: number): Look {
  return {
    shirt: SHIRTS[(seed * 5 + index * 7) % SHIRTS.length]!,
    skin: SKINS[(seed * 7 + index * 2) % SKINS.length]!,
    hair: HAIRS[(seed + index * 3) % HAIRS.length]!,
  };
}

type CenterItem = 'plant' | 'reserved' | 'bill' | 'dish' | null;

export interface TableIllustrationProps {
  capacity: number;
  /** Guests at the table; drawn only while it is occupied or waiting for the bill. */
  guests?: number;
  status: TableStatus;
  view: TableView;
  /** Varies clothing colors between tables (e.g. the table number). */
  seed?: number;
  className?: string;
}

interface Scene {
  layout: TableLayout;
  seated: number;
  center: CenterItem;
  seed: number;
}

function buildScene({ capacity, guests, status, seed = 0 }: TableIllustrationProps): Scene {
  const layout = computeTableLayout(capacity);
  const busy = status === 'occupied' || status === 'waiting';
  const seated = busy ? Math.min(Math.max(guests ?? 0, 0), layout.seats.length) : 0;
  const center: CenterItem =
    status === 'available' ? 'plant' : status === 'reserved' ? 'reserved' : status === 'waiting' ? 'bill' : seated === 0 ? 'dish' : null;
  return { layout, seated, center, seed };
}

/** The point on the table top in front of a seat (where the plate goes). */
function plateSpot(seat: Seat, inset = 0.58): { x: number; y: number } {
  const { dx, dy } = facing(seat.side);
  return { x: seat.x + dx * inset, y: seat.y + dy * inset };
}

/* --------------------------------- Plan --------------------------------- */

function planChair(seat: Seat, key: string): ReactElement {
  const horizontal = seat.side === 'top' || seat.side === 'bottom';
  const w = (horizontal ? 0.46 : 0.42) * S;
  const h = (horizontal ? 0.42 : 0.46) * S;
  const { dx, dy } = facing(seat.side);
  const backW = horizontal ? w : 0.1 * S;
  const backH = horizontal ? 0.1 * S : h;
  const backX = seat.x * S - dx * 0.26 * S - backW / 2;
  const backY = seat.y * S - dy * 0.26 * S - backH / 2;
  return (
    <g key={key}>
      <rect x={seat.x * S - w / 2} y={seat.y * S - h / 2} width={w} height={h} rx={0.09 * S} className="fill-scene-chair" />
      <rect x={backX} y={backY} width={backW} height={backH} rx={0.05 * S} className="fill-scene-chair-back" />
    </g>
  );
}

function planPerson(seat: Seat, look: Look, key: string): ReactElement {
  const { dx, dy } = facing(seat.side);
  const horizontal = seat.side === 'top' || seat.side === 'bottom';
  const cx = (seat.x + dx * 0.06) * S;
  const cy = (seat.y + dy * 0.06) * S;
  const along = { x: horizontal ? 1 : 0, y: horizontal ? 0 : 1 };
  return (
    <g key={key}>
      {[-1, 1].map((hand) => (
        <ellipse
          key={hand}
          cx={cx + along.x * hand * 0.2 * S + dx * 0.16 * S}
          cy={cy + along.y * hand * 0.2 * S + dy * 0.16 * S}
          rx={(horizontal ? 0.06 : 0.11) * S}
          ry={(horizontal ? 0.11 : 0.06) * S}
          className={look.shirt}
        />
      ))}
      <ellipse cx={cx} cy={cy} rx={(horizontal ? 0.27 : 0.16) * S} ry={(horizontal ? 0.16 : 0.27) * S} className={look.shirt} />
      <circle cx={cx} cy={cy} r={0.135 * S} className={look.hair} />
      <circle cx={cx + dx * 0.05 * S} cy={cy + dy * 0.05 * S} r={0.085 * S} className={look.skin} />
    </g>
  );
}

function planPlate(x: number, y: number, radius: number, key: string): ReactElement {
  return (
    <g key={key}>
      <circle cx={x * S} cy={y * S} r={radius * S} strokeWidth={0.02 * S} className="fill-scene-plate stroke-scene-plate-rim" />
      <circle cx={x * S} cy={y * S} r={radius * 0.55 * S} className="fill-scene-food" />
    </g>
  );
}

function planCenter(item: CenterItem): ReactElement | null {
  switch (item) {
    case 'plant':
      return (
        <g>
          <circle cx={0} cy={0} r={0.13 * S} className="fill-scene-pot" />
          {[0, 72, 144, 216, 288].map((angle) => (
            <circle
              key={angle}
              cx={Math.cos((angle * Math.PI) / 180) * 0.1 * S}
              cy={Math.sin((angle * Math.PI) / 180) * 0.1 * S}
              r={0.08 * S}
              className="fill-scene-leaf"
            />
          ))}
        </g>
      );
    case 'reserved':
      return (
        <g>
          <rect x={-0.22 * S} y={-0.1 * S} width={0.44 * S} height={0.2 * S} rx={0.03 * S} className="fill-status-reserved" />
          <rect x={-0.14 * S} y={-0.02 * S} width={0.28 * S} height={0.04 * S} className="fill-scene-paper" />
        </g>
      );
    case 'bill':
      return (
        <g>
          <rect x={-0.13 * S} y={-0.18 * S} width={0.26 * S} height={0.36 * S} rx={0.02 * S} className="fill-scene-paper" />
          {[-0.08, 0, 0.08].map((y) => (
            <line key={y} x1={-0.08 * S} x2={0.08 * S} y1={y * S} y2={y * S} strokeWidth={0.02 * S} className="stroke-scene-plate-rim" />
          ))}
        </g>
      );
    case 'dish':
      return (
        <g>
          {planPlate(-0.2, 0, 0.16, 'a')}
          {planPlate(0.22, 0.04, 0.13, 'b')}
        </g>
      );
    default:
      return null;
  }
}

function PlanView({ scene }: { scene: Scene }) {
  const { layout, seated, center, seed } = scene;
  const { length, depth, seats } = layout;
  const extentX = Math.max(length / 2, ...seats.map((seat) => Math.abs(seat.x))) + 0.4;
  const extentY = Math.max(depth / 2, ...seats.map((seat) => Math.abs(seat.y))) + 0.4;
  const viewBox = `${-extentX * S} ${-extentY * S} ${extentX * 2 * S} ${extentY * 2 * S}`;
  const grain = [-0.22, 0.05, 0.3].filter((line) => Math.abs(line) < depth / 2 - 0.1);

  return (
    <svg viewBox={viewBox} preserveAspectRatio="xMidYMid meet" aria-hidden className="size-full overflow-visible">
      {seats.map((seat, index) => planChair(seat, `chair-${index}`))}
      <rect
        x={(-length / 2 + 0.05) * S}
        y={(-depth / 2 + 0.08) * S}
        width={length * S}
        height={depth * S}
        rx={0.1 * S}
        className="fill-scene-shadow"
      />
      <rect x={(-length / 2) * S} y={(-depth / 2) * S} width={length * S} height={depth * S} rx={0.1 * S} className="fill-scene-table" />
      <rect
        x={(-length / 2 + 0.07) * S}
        y={(-depth / 2 + 0.07) * S}
        width={(length - 0.14) * S}
        height={(depth - 0.14) * S}
        rx={0.06 * S}
        className="fill-scene-table-shine"
        opacity={0.55}
      />
      {grain.map((y) => (
        <line
          key={y}
          x1={(-length / 2 + 0.16) * S}
          x2={(length / 2 - 0.16) * S}
          y1={y * S}
          y2={y * S}
          strokeWidth={0.015 * S}
          className="stroke-scene-table-edge"
          opacity={0.35}
        />
      ))}
      {seats.slice(0, seated).map((seat, index) => {
        const spot = plateSpot(seat);
        return planPlate(spot.x, spot.y, 0.14, `plate-${index}`);
      })}
      {planCenter(center)}
      {seats.slice(0, seated).map((seat, index) => planPerson(seat, lookFor(seed, index), `person-${index}`))}
    </svg>
  );
}

/* ---------------------------------- 3D ---------------------------------- */

type Point3 = readonly [number, number, number];

function project([x, y, z]: Point3): [number, number] {
  return [(x - y) * COS30 * S, (x + y) * SIN30 * S - z * S];
}

function points(corners: readonly Point3[]): string {
  return corners.map((corner) => project(corner).join(',')).join(' ');
}

interface BoxColors {
  top: string;
  front: string;
  side: string;
}

/** An axis-aligned box: the three faces visible from the front-right. */
function isoBox(key: string, [x0, x1]: [number, number], [y0, y1]: [number, number], [z0, z1]: [number, number], colors: BoxColors): ReactElement {
  return (
    <g key={key}>
      <polygon points={points([[x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]])} className={colors.front} />
      <polygon points={points([[x1, y0, z1], [x1, y1, z1], [x1, y1, z0], [x1, y0, z0]])} className={colors.side} />
      <polygon points={points([[x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]])} className={colors.top} />
    </g>
  );
}

const CHAIR_COLORS: BoxColors = { top: 'fill-scene-chair', front: 'fill-scene-chair-back', side: 'fill-scene-chair-side' };
const LEG_COLORS: BoxColors = { top: 'fill-scene-chair-side', front: 'fill-scene-chair-side', side: 'fill-scene-chair-side' };

function isoChairLegs(seat: Seat, key: string): ReactElement {
  const leg = 0.035;
  const inset = CHAIR_HALF - 0.04;
  return (
    <g key={key}>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sy]) => {
        const cx = seat.x + sx! * inset;
        const cy = seat.y + sy! * inset;
        return isoBox(`${sx}${sy}`, [cx - leg, cx + leg], [cy - leg, cy + leg], [0, SEAT_HEIGHT - SEAT_THICKNESS], LEG_COLORS);
      })}
    </g>
  );
}

function isoSeat(seat: Seat, key: string): ReactElement {
  return isoBox(
    key,
    [seat.x - CHAIR_HALF, seat.x + CHAIR_HALF],
    [seat.y - CHAIR_HALF, seat.y + CHAIR_HALF],
    [SEAT_HEIGHT - SEAT_THICKNESS, SEAT_HEIGHT],
    CHAIR_COLORS,
  );
}

/** Backrest on the chair's outer edge (away from the table). */
function isoBackrest(seat: Seat, key: string): ReactElement {
  const t = 0.05;
  const h = CHAIR_HALF;
  const z: [number, number] = [SEAT_HEIGHT, BACK_TOP];
  switch (seat.side) {
    case 'top':
      return isoBox(key, [seat.x - h, seat.x + h], [seat.y - h, seat.y - h + t], z, CHAIR_COLORS);
    case 'bottom':
      return isoBox(key, [seat.x - h, seat.x + h], [seat.y + h - t, seat.y + h], z, CHAIR_COLORS);
    case 'left':
      return isoBox(key, [seat.x - h, seat.x - h + t], [seat.y - h, seat.y + h], z, CHAIR_COLORS);
    case 'right':
      return isoBox(key, [seat.x + h - t, seat.x + h], [seat.y - h, seat.y + h], z, CHAIR_COLORS);
  }
}

function isoPerson(seat: Seat, look: Look, key: string): ReactElement {
  const { dx, dy } = facing(seat.side);
  const px = seat.x + dx * 0.05;
  const py = seat.y + dy * 0.05;
  const [baseX, baseY] = project([px, py, SEAT_HEIGHT]);
  const [, shoulderY] = project([px, py, SHOULDER_HEIGHT]);
  const [headX, headY] = project([px, py, HEAD_HEIGHT]);
  const halfWidth = 0.2 * S;
  const faceVisible = isFarSide(seat.side);
  const r = HEAD_RADIUS * S;
  return (
    <g key={key}>
      <rect
        x={baseX - halfWidth}
        y={shoulderY}
        width={halfWidth * 2}
        height={baseY - shoulderY + 0.03 * S}
        rx={0.12 * S}
        className={look.shirt}
      />
      <rect x={headX - 0.045 * S} y={headY + r * 0.6} width={0.09 * S} height={0.1 * S} className={look.skin} />
      {faceVisible ? (
        <>
          <circle cx={headX} cy={headY} r={r} className={look.hair} />
          <circle cx={headX} cy={headY + r * 0.22} r={r * 0.82} className={look.skin} />
        </>
      ) : (
        <circle cx={headX} cy={headY} r={r} className={look.hair} />
      )}
    </g>
  );
}

/** Hands resting on the table in front of a guest who faces the viewer. */
function isoHands(seat: Seat, look: Look, key: string): ReactElement {
  const { dx, dy } = facing(seat.side);
  const across = { x: dy !== 0 ? 1 : 0, y: dx !== 0 ? 1 : 0 };
  return (
    <g key={key}>
      {[-1, 1].map((hand) => {
        const [x, y] = project([
          seat.x + dx * 0.44 + across.x * hand * 0.13,
          seat.y + dy * 0.44 + across.y * hand * 0.13,
          TABLE_HEIGHT,
        ]);
        return <ellipse key={hand} cx={x} cy={y} rx={0.065 * S} ry={0.04 * S} className={look.skin} />;
      })}
    </g>
  );
}

function isoPlate(x: number, y: number, radius: number, key: string): ReactElement {
  const [cx, cy] = project([x, y, TABLE_HEIGHT]);
  const rx = Math.SQRT2 * COS30 * radius * S;
  const ry = Math.SQRT2 * SIN30 * radius * S;
  return (
    <g key={key}>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} strokeWidth={0.02 * S} className="fill-scene-plate stroke-scene-plate-rim" />
      <ellipse cx={cx} cy={cy} rx={rx * 0.55} ry={ry * 0.55} className="fill-scene-food" />
    </g>
  );
}

function isoCenter(item: CenterItem): ReactElement | null {
  const z = TABLE_HEIGHT;
  switch (item) {
    case 'plant': {
      const [lx, ly] = project([0, 0, z + 0.2]);
      return (
        <g>
          {isoBox('pot', [-0.08, 0.08], [-0.08, 0.08], [z, z + 0.13], {
            top: 'fill-scene-pot',
            front: 'fill-scene-pot',
            side: 'fill-scene-table-edge',
          })}
          {[
            [-0.07, 0],
            [0.07, 0],
            [0, -0.06],
          ].map(([ox, oy]) => (
            <circle key={`${ox}${oy}`} cx={lx + ox! * S} cy={ly + oy! * S} r={0.08 * S} className="fill-scene-leaf" />
          ))}
        </g>
      );
    }
    case 'reserved':
      return isoBox('card', [-0.17, 0.17], [-0.025, 0.025], [z, z + 0.17], {
        top: 'fill-status-reserved',
        front: 'fill-status-reserved',
        side: 'fill-scene-paper',
      });
    case 'bill':
      return (
        <g>
          <polygon
            points={points([
              [-0.12, -0.17, z + 0.003],
              [0.12, -0.17, z + 0.003],
              [0.12, 0.17, z + 0.003],
              [-0.12, 0.17, z + 0.003],
            ])}
            className="fill-scene-paper"
          />
          {[-0.08, 0, 0.08].map((y) => {
            const [x1, y1] = project([-0.08, y, z + 0.004]);
            const [x2, y2] = project([0.08, y, z + 0.004]);
            return <line key={y} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth={0.02 * S} className="stroke-scene-plate-rim" />;
          })}
        </g>
      );
    case 'dish':
      return (
        <g>
          {isoPlate(-0.2, 0, 0.16, 'a')}
          {isoPlate(0.22, 0.05, 0.13, 'b')}
        </g>
      );
    default:
      return null;
  }
}

function isoTable(layout: TableLayout): ReactElement {
  const hl = layout.length / 2;
  const hd = layout.depth / 2;
  const leg = 0.045;
  const inset = 0.1;
  const legColors: BoxColors = { top: 'fill-scene-leg', front: 'fill-scene-leg', side: 'fill-scene-table-side' };
  return (
    <g>
      {[
        [-1, -1],
        [1, -1],
        [-1, 1],
        [1, 1],
      ].map(([sx, sy]) => {
        const cx = sx! * (hl - inset);
        const cy = sy! * (hd - inset);
        return isoBox(`leg${sx}${sy}`, [cx - leg, cx + leg], [cy - leg, cy + leg], [0, TABLE_HEIGHT - TOP_THICKNESS], legColors);
      })}
      {isoBox('top', [-hl, hl], [-hd, hd], [TABLE_HEIGHT - TOP_THICKNESS, TABLE_HEIGHT], {
        top: 'fill-scene-table',
        front: 'fill-scene-table-edge',
        side: 'fill-scene-table-side',
      })}
      <polygon
        points={points([
          [-hl + 0.07, -hd + 0.07, TABLE_HEIGHT],
          [hl - 0.07, -hd + 0.07, TABLE_HEIGHT],
          [hl - 0.07, hd - 0.07, TABLE_HEIGHT],
          [-hl + 0.07, hd - 0.07, TABLE_HEIGHT],
        ])}
        className="fill-scene-table-shine"
        opacity={0.55}
      />
    </g>
  );
}

function isoViewBox(layout: TableLayout): string {
  const corners: Point3[] = [];
  const hl = layout.length / 2;
  const hd = layout.depth / 2;
  for (const x of [-hl, hl]) for (const y of [-hd, hd]) corners.push([x, y, 0], [x, y, TABLE_HEIGHT + 0.3]);
  for (const seat of layout.seats) {
    for (const sx of [-0.3, 0.3]) for (const sy of [-0.3, 0.3]) corners.push([seat.x + sx, seat.y + sy, 0], [seat.x + sx, seat.y + sy, BACK_TOP]);
    corners.push([seat.x, seat.y, HEAD_HEIGHT + HEAD_RADIUS + 0.06]);
  }
  const projected = corners.map(project);
  const xs = projected.map(([x]) => x);
  const ys = projected.map(([, y]) => y);
  const pad = 4;
  const minX = Math.min(...xs) - pad;
  const minY = Math.min(...ys) - pad;
  return `${minX} ${minY} ${Math.max(...xs) - minX + pad} ${Math.max(...ys) - minY + pad}`;
}

function IsoView({ scene }: { scene: Scene }) {
  const { layout, seated, center, seed } = scene;
  const depthOf = (seat: Seat) => seat.x + seat.y;
  const indexed = layout.seats.map((seat, index) => ({ seat, index, occupied: index < seated }));
  const far = indexed.filter(({ seat }) => isFarSide(seat.side)).sort((a, b) => depthOf(a.seat) - depthOf(b.seat));
  const near = indexed.filter(({ seat }) => !isFarSide(seat.side)).sort((a, b) => depthOf(a.seat) - depthOf(b.seat));
  const hl = layout.length / 2 + 0.12;
  const hd = layout.depth / 2 + 0.12;

  return (
    <svg viewBox={isoViewBox(layout)} preserveAspectRatio="xMidYMid meet" aria-hidden className="size-full overflow-visible">
      <polygon
        points={points([
          [-hl, -hd, 0],
          [hl, -hd, 0],
          [hl, hd, 0],
          [-hl, hd, 0],
        ])}
        className="fill-scene-shadow"
      />
      {far.map(({ seat, index, occupied }) => (
        <g key={`far-${index}`}>
          {isoChairLegs(seat, 'legs')}
          {isoBackrest(seat, 'back')}
          {isoSeat(seat, 'seat')}
          {occupied && isoPerson(seat, lookFor(seed, index), 'person')}
        </g>
      ))}
      {isoTable(layout)}
      {indexed
        .filter(({ occupied }) => occupied)
        .map(({ seat, index }) => {
          const spot = plateSpot(seat);
          return isoPlate(spot.x, spot.y, 0.14, `plate-${index}`);
        })}
      {far.filter(({ occupied }) => occupied).map(({ seat, index }) => isoHands(seat, lookFor(seed, index), `hands-${index}`))}
      {isoCenter(center)}
      {near.map(({ seat, index, occupied }) => (
        <g key={`near-${index}`}>
          {isoChairLegs(seat, 'legs')}
          {isoSeat(seat, 'seat')}
          {occupied && isoPerson(seat, lookFor(seed, index), 'person')}
          {isoBackrest(seat, 'back')}
        </g>
      ))}
    </svg>
  );
}

/** Table, chairs and seated guests — top view or 3D. */
export const TableIllustration = memo(function TableIllustration(props: TableIllustrationProps) {
  const scene = buildScene(props);
  return (
    <div className={cn('pointer-events-none select-none', props.className)} data-view={props.view} data-seated={scene.seated}>
      {props.view === 'iso' ? <IsoView scene={scene} /> : <PlanView scene={scene} />}
    </div>
  );
});
