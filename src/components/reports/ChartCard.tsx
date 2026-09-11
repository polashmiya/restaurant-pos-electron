import { ChartColumn, Table2 } from 'lucide-react';
import { useId, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { Card } from '@/components/common/Card';
import { IconButton } from '@/components/common/IconButton';
import { cn } from '@/utils/cn';

/**
 * Report card: title, optional badge and — when a table is given — a toggle
 * between the chart and its accessible table view.
 */
export function ChartCard({
  title,
  description,
  badge,
  table,
  className,
  children,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
  table?: ReactNode;
  className?: string;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const [showTable, setShowTable] = useState(false);
  const headingId = useId();

  return (
    <Card as="section" aria-labelledby={headingId} className={cn('flex min-w-0 flex-col', className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <h2 id={headingId} className="text-base leading-snug font-bold">
            {title}
          </h2>
          {description && <p className="text-sm text-fg-muted">{description}</p>}
        </div>
        {badge}
        {table && (
          <IconButton
            size="sm"
            label={showTable ? t('reports.showChart') : t('reports.showTable')}
            icon={showTable ? <ChartColumn className="size-5" aria-hidden /> : <Table2 className="size-5" aria-hidden />}
            aria-pressed={showTable}
            tooltipSide="bottom-end"
            onClick={() => setShowTable((value) => !value)}
          />
        )}
      </div>
      <div className="min-h-0 flex-1">{showTable && table ? table : children}</div>
    </Card>
  );
}

/** Compact data table used as the table view of a chart. */
export function ReportTable({
  columns,
  rows,
}: {
  columns: readonly { label: string; numeric?: boolean }[];
  rows: readonly (readonly ReactNode[])[];
}) {
  return (
    <div className="max-h-72 overflow-y-auto rounded-control border border-border">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-surface-2">
          <tr>
            {columns.map((column) => (
              <th
                key={column.label}
                scope="col"
                className={cn('px-3 py-2 text-xs font-semibold text-fg-muted', column.numeric ? 'text-end' : 'text-start')}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((cells, rowIndex) => (
            <tr key={rowIndex} className="border-t border-border">
              {cells.map((cell, cellIndex) => (
                <td
                  key={cellIndex}
                  className={cn('px-3 py-1.5', columns[cellIndex]?.numeric ? 'text-end whitespace-nowrap tabular-nums' : 'text-start')}
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
