import type { ReactNode } from 'react';
import { Card, CardHeader } from '@/components/common/Card';

export function SettingsSection({
  title,
  description,
  icon,
  actions,
  children,
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card as="section" aria-label={title} className="@container">
      <CardHeader title={title} description={description} icon={icon} actions={actions} />
      {children}
    </Card>
  );
}

/**
 * A labelled row inside a settings section: label + hint beside the control
 * when the section is wide, stacked above it when the section is narrow.
 */
export function SettingRow({ label, hint, children }: { label: ReactNode; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-t border-border py-4 first:border-t-0 first:pt-0 @2xl:flex-row @2xl:items-center @2xl:justify-between">
      <div className="min-w-0 @2xl:max-w-md">
        <p className="font-semibold">{label}</p>
        {hint && <p className="text-sm text-fg-muted">{hint}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}
