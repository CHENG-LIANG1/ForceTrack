import { X } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  SprintLifecycleError,
  validateSprintStartFields,
  type Sprint,
  type SprintLifecycleIssue,
  type SprintStartFields,
} from '@/domain/sprint';

interface StartSprintDialogProps {
  open: boolean;
  sprint: Sprint | null;
  onOpenChange(open: boolean): void;
  onSave(sprintId: string, fields: SprintStartFields): Promise<void>;
}

const EMPTY_DATES: SprintStartFields = {
  startDate: null,
  endDate: null,
};

export function StartSprintDialog({
  open,
  sprint,
  onOpenChange,
  onSave,
}: StartSprintDialogProps) {
  const { t, i18n } = useTranslation();
  const [draft, setDraft] = useState<SprintStartFields>({
    startDate: sprint?.startDate ?? EMPTY_DATES.startDate,
    endDate: sprint?.endDate ?? EMPTY_DATES.endDate,
  });
  const [error, setError] = useState<SprintLifecycleIssue | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setError(null);
    onOpenChange(false);
  };
  const invalidDates =
    error === 'dates_required' ||
    error === 'invalid_date' ||
    error === 'invalid_range';

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent>
        <div className="task-dialog-heading">
          <div>
            <DialogTitle>{t('sprint.startTitle')}</DialogTitle>
            <DialogDescription>
              {t('sprint.startDescription', { name: sprint?.name })}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button
              className="icon-button"
              variant="unstyled"
              type="button"
              aria-label={t('task.actions.close')}
            >
              <X size={18} />
            </Button>
          </DialogClose>
        </div>

        <form
          className="task-form"
          onSubmit={(event) => {
            event.preventDefault();
            if (!sprint) return;
            const issue = validateSprintStartFields(draft);
            setError(issue);
            if (issue) return;
            setSaving(true);
            void onSave(sprint.id, draft)
              .then(close)
              .catch((caught: unknown) => {
                setError(
                  caught instanceof SprintLifecycleError
                    ? caught.issue
                    : 'invalid_status',
                );
              })
              .finally(() => setSaving(false));
          }}
        >
          <div className="task-form-grid">
            <div className="form-field">
              <label htmlFor="sprint-start-required">
                {t('sprint.fields.startDate')} *
              </label>
              <DatePicker
                id="sprint-start-required"
                name="sprintStartDate"
                value={draft.startDate}
                locale={i18n.resolvedLanguage ?? i18n.language}
                placeholder={t('task.datePlaceholder')}
                clearLabel={t('task.actions.clearDate')}
                invalid={invalidDates}
                describedBy={error ? 'sprint-start-error' : undefined}
                onChange={(value) => {
                  setDraft((current) => ({ ...current, startDate: value }));
                  setError(null);
                }}
              />
            </div>
            <div className="form-field">
              <label htmlFor="sprint-end-required">
                {t('sprint.fields.endDate')} *
              </label>
              <DatePicker
                id="sprint-end-required"
                name="sprintEndDate"
                value={draft.endDate}
                locale={i18n.resolvedLanguage ?? i18n.language}
                placeholder={t('task.datePlaceholder')}
                clearLabel={t('task.actions.clearDate')}
                invalid={invalidDates}
                describedBy={error ? 'sprint-start-error' : undefined}
                onChange={(value) => {
                  setDraft((current) => ({ ...current, endDate: value }));
                  setError(null);
                }}
              />
            </div>
          </div>
          {error ? (
            <p className="field-error" id="sprint-start-error" role="alert">
              {t(`sprint.validation.${error}`)}
            </p>
          ) : null}
          <div className="task-form-actions">
            <span />
            <div>
              <Button
                type="button"
                variant="outline"
                size="dialog"
                onClick={close}
              >
                {t('task.actions.cancel')}
              </Button>
              <Button type="submit" size="dialog" disabled={saving}>
                {saving ? t('task.actions.saving') : t('sprint.actions.start')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
