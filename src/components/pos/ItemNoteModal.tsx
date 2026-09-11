import { Check } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/common/Button';
import { Modal } from '@/components/common/Modal';
import { Textarea } from '@/components/common/Textarea';
import { APP_CONFIG } from '@/config/app.config';
import { NOTE_PRESETS } from '@/data/notePresets';
import { useFormatters } from '@/hooks/useFormatters';
import { message } from '@/i18n/keys';
import { usePosStore } from '@/store/posStore';
import { toast } from '@/store/uiStore';
import type { OrderItem } from '@/types';
import { cn } from '@/utils/cn';

function ItemNoteForm({ line, onClose }: { line: OrderItem; onClose: () => void }) {
  const { t } = useTranslation();
  const format = useFormatters();
  const setItemNote = usePosStore((state) => state.setItemNote);
  const [tags, setTags] = useState<string[]>(line.noteTags ?? []);
  const [custom, setCustom] = useState(line.customNote ?? '');
  const maxLength = APP_CONFIG.order.maxNoteLength;

  const toggle = (id: string) =>
    setTags((previous) => (previous.includes(id) ? previous.filter((tag) => tag !== id) : [...previous, id]));

  const save = () => {
    setItemNote(line.id, tags, custom);
    toast.success(message('toast.noteSaved'));
    onClose();
  };

  const clear = () => {
    setItemNote(line.id, [], '');
    onClose();
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={t('notes.title')}
      description={t('notes.subtitle', { name: format.text(line.name) })}
      size="md"
      footer={
        <>
          {line.note && (
            <Button variant="danger-soft" onClick={clear} className="me-auto">
              {t('notes.clear')}
            </Button>
          )}
          <Button variant="secondary" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button variant="primary" onClick={save}>
            {t('notes.save')}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <div>
          <p className="mb-2 text-sm font-semibold">{t('notes.presets')}</p>
          <div role="group" aria-label={t('notes.presets')} className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {NOTE_PRESETS.map((preset) => {
              const selected = tags.includes(preset.id);
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => toggle(preset.id)}
                  className={cn(
                    'flex min-h-touch items-center gap-2 rounded-control border px-3 text-start text-sm font-semibold transition-colors',
                    selected
                      ? 'border-primary bg-primary/15 text-primary-text'
                      : 'border-border bg-surface-2 text-fg hover:bg-surface-3',
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-md border',
                      selected ? 'border-primary bg-primary text-primary-fg' : 'border-border-strong',
                    )}
                  >
                    {selected && <Check className="size-3.5" />}
                  </span>
                  {format.text(preset.label)}
                </button>
              );
            })}
          </div>
        </div>
        <Textarea
          label={t('notes.custom')}
          placeholder={t('notes.customPlaceholder')}
          value={custom}
          maxLength={maxLength}
          onChange={(event) => setCustom(event.target.value)}
          hint={`${format.number(custom.length)} / ${format.number(maxLength)}`}
          rows={2}
        />
      </div>
    </Modal>
  );
}

/** Kitchen instructions for one cart line (printed on the KOT). */
export function ItemNoteModal({ lineId, onClose }: { lineId: string; onClose: () => void }) {
  const line = usePosStore((state) => state.draft.items.find((item) => item.id === lineId));

  useEffect(() => {
    if (!line) onClose();
  }, [line, onClose]);

  return line ? <ItemNoteForm line={line} onClose={onClose} /> : null;
}
