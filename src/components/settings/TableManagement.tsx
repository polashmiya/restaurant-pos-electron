import { LayoutGrid, Pencil, Plus, Trash, Users } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Badge } from '@/components/common/Badge';
import { Button } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { IconButton } from '@/components/common/IconButton';
import { Input } from '@/components/common/Input';
import { Modal } from '@/components/common/Modal';
import { NumberInput } from '@/components/common/NumberInput';
import { TABLE_STATUS_VISUALS } from '@/components/tables/tableVisuals';
import { useFormatters } from '@/hooks/useFormatters';
import { message } from '@/i18n/keys';
import { attempt } from '@/services/actionRunner';
import { useTableStore } from '@/store/tableStore';
import { confirmAction, toast } from '@/store/uiStore';
import type { DiningTable } from '@/types';
import { getErrorMessageKey } from '@/utils/errors';
import { createId } from '@/utils/id';
import { canDeleteTable } from '@/utils/tableRules';
import { SettingsSection } from './SettingsSection';

function TableFormModal({ table, onClose }: { table?: DiningTable; onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const tables = useTableStore((state) => state.tables);
  const saveTable = useTableStore((state) => state.saveTable);
  const nextNumber = tables.reduce((max, entry) => Math.max(max, entry.number), 0) + 1;
  const [number, setNumber] = useState<number | null>(table?.number ?? nextNumber);
  const [name, setName] = useState(table?.name ?? String(nextNumber).padStart(2, '0'));
  const [capacity, setCapacity] = useState<number | null>(table?.capacity ?? 4);
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  const errors = {
    number: number === null || number < 1 ? t('validation.min', { min: format.number(1) }) : undefined,
    name: !name.trim() ? t('validation.required') : undefined,
    capacity: capacity === null || capacity < 1 || capacity > 50 ? t('validation.invalidNumber') : undefined,
  };

  const submit = async (event?: FormEvent) => {
    event?.preventDefault();
    setSubmitted(true);
    if (errors.number || errors.name || errors.capacity || number === null || capacity === null) return;
    setSaving(true);
    try {
      await saveTable({
        ...(table ?? { status: 'available' as const }),
        id: table?.id ?? createId('table'),
        number: Math.trunc(number),
        name: name.trim(),
        capacity: Math.trunc(capacity),
      } as DiningTable);
      toast.success(message('settings.tables.saved'));
      onClose();
    } catch (error) {
      toast.error(message(getErrorMessageKey(error)));
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={table ? t('settings.tables.edit') : t('settings.tables.add')}
      size="sm"
      dismissible={!saving}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={saving}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={() => void submit()} loading={saving}>
            {t('common.save')}
          </Button>
        </>
      }
    >
      <form onSubmit={(event) => void submit(event)} className="grid grid-cols-2 gap-4">
        <NumberInput label={t('settings.tables.number')} value={number} onValueChange={setNumber} decimals={0} error={submitted ? errors.number : undefined} />
        <Input label={t('settings.tables.name')} value={name} onChange={(event) => setName(event.target.value)} maxLength={12} error={submitted ? errors.name : undefined} data-autofocus />
        <NumberInput label={t('settings.tables.capacity')} value={capacity} onValueChange={setCapacity} decimals={0} error={submitted ? errors.capacity : undefined} />
        <button type="submit" hidden aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}

/** Add, rename, resize or remove dining tables. */
export function TableManagement() {
  const { t } = useTranslation();
  const format = useFormatters();
  const tables = useTableStore((state) => state.tables);
  const deleteTable = useTableStore((state) => state.deleteTable);
  const [editing, setEditing] = useState<{ open: boolean; table?: DiningTable }>({ open: false });

  const remove = async (table: DiningTable) => {
    if (!canDeleteTable(table)) {
      toast.warning(message('settings.tables.inUse'));
      return;
    }
    const confirmed = await confirmAction({
      title: message('settings.tables.deleteTitle'),
      message: message('settings.tables.deleteMessage', { name: table.name }),
      confirmLabel: message('common.delete'),
      tone: 'danger',
    });
    if (confirmed && (await attempt('delete-table', () => deleteTable(table.id)))) toast.success(message('settings.tables.deleted'));
  };

  return (
    <SettingsSection
      title={t('settings.tables.title')}
      description={t('settings.tables.description')}
      icon={<LayoutGrid className="size-5" aria-hidden />}
      actions={
        <Button variant="primary" icon={<Plus className="size-5" aria-hidden />} onClick={() => setEditing({ open: true })}>
          {t('settings.tables.add')}
        </Button>
      }
    >
      {tables.length === 0 ? (
        <EmptyState compact icon={<LayoutGrid aria-hidden />} title={t('tables.noTables')} />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
          {tables.map((table) => {
            const visual = TABLE_STATUS_VISUALS[table.status];
            const StatusIcon = visual.icon;
            return (
              <li key={table.id} className="flex items-center gap-3 rounded-card border border-border px-3 py-2">
                <span className="w-12 text-2xl font-extrabold tabular-nums">{format.digits(table.name)}</span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="flex items-center gap-1 text-sm text-fg-muted">
                    <Users className="size-4" aria-hidden />
                    {t('tables.capacity', { count: table.capacity })} · #{format.number(table.number)}
                  </p>
                  <Badge tone={visual.tone} icon={<StatusIcon className="size-3.5" aria-hidden />}>
                    {t(`tableStatus.${table.status}`)}
                  </Badge>
                </div>
                <IconButton label={t('common.edit')} icon={<Pencil className="size-5" aria-hidden />} onClick={() => setEditing({ open: true, table })} showTooltip={false} />
                <IconButton
                  label={t('common.delete')}
                  icon={<Trash className="size-5" aria-hidden />}
                  variant="danger-soft"
                  onClick={() => void remove(table)}
                  disabled={!canDeleteTable(table)}
                  showTooltip={false}
                />
              </li>
            );
          })}
        </ul>
      )}
      {editing.open && <TableFormModal table={editing.table} onClose={() => setEditing({ open: false })} />}
    </SettingsSection>
  );
}
