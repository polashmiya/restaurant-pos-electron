import { UtensilsCrossed } from 'lucide-react';
import { cn } from '@/utils/cn';

export function AppLogo({ size = 'md', className }: { size?: 'md' | 'lg'; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        'grid shrink-0 place-items-center rounded-xl bg-primary text-primary-fg shadow-sm',
        size === 'lg' ? 'size-16 rounded-2xl [&>svg]:size-8' : 'size-10 [&>svg]:size-5',
        className,
      )}
    >
      <UtensilsCrossed />
    </span>
  );
}
