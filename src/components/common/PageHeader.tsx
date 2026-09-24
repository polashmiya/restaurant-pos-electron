import type { ReactNode } from 'react';

export interface PageHeaderProps {
  title: ReactNode;
  /** Line(s) under the title: subtitle, date range, shift details… */
  description?: ReactNode;
  /** Controls at the end of the title row (buttons, view switches). */
  actions?: ReactNode;
  /** Extra rows under the title row (filters). */
  children?: ReactNode;
}

/** The header bar every page starts with (title, description, actions, filters). */
export function PageHeader({ title, description, actions, children }: PageHeaderProps) {
  return (
    <div className="space-y-3 border-b border-border bg-surface px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h1 className="text-xl font-bold sm:text-2xl">{title}</h1>
          {description && <div className="text-sm text-fg-muted sm:text-base">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
