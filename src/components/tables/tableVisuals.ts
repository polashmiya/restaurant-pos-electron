import { CalendarClock, CircleCheck, Hourglass, Users, type LucideIcon } from 'lucide-react';
import type { BadgeTone } from '@/components/common/Badge';
import type { TableStatus } from '@/types';

interface StatusVisual {
  icon: LucideIcon;
  tone: BadgeTone;
  /** Card border + background (static class names for Tailwind). */
  card: string;
  /** Accent text color. */
  text: string;
}

/**
 * Green = available, red = occupied, yellow = reserved / waiting for bill.
 * Every status also has its own icon and text label (never color alone).
 */
export const TABLE_STATUS_VISUALS: Record<TableStatus, StatusVisual> = {
  available: {
    icon: CircleCheck,
    tone: 'available',
    card: 'border-status-available/50 bg-status-available/5 hover:bg-status-available/10',
    text: 'text-status-available',
  },
  occupied: {
    icon: Users,
    tone: 'occupied',
    card: 'border-status-occupied/60 bg-status-occupied/8 hover:bg-status-occupied/14',
    text: 'text-status-occupied',
  },
  reserved: {
    icon: CalendarClock,
    tone: 'reserved',
    card: 'border-status-reserved/60 bg-status-reserved/8 hover:bg-status-reserved/14',
    text: 'text-status-reserved',
  },
  waiting: {
    icon: Hourglass,
    tone: 'waiting',
    card: 'border-status-waiting/70 border-dashed bg-status-waiting/10 hover:bg-status-waiting/16',
    text: 'text-status-waiting',
  },
};

export const TABLE_STATUSES: TableStatus[] = ['available', 'occupied', 'reserved', 'waiting'];
