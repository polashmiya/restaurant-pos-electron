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
    <div className="space-y-3 border-b border-border bg-surface px-6 py-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{title}</h1>
          {description && <div className="text-fg-muted">{description}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </div>
  );
}
