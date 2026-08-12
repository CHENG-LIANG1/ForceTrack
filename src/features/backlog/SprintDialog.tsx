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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  validateSprintFields,
  type Sprint,
  type SprintFields,
} from '@/domain/sprint';

interface SprintDialogProps {
  open: boolean;
  sprint?: Sprint | null;
  onOpenChange(open: boolean): void;
  onSave(fields: SprintFields): Promise<void>;
  onDelete?(sprint: Sprint): void;
}

const EMPTY_SPRINT: SprintFields = {
  name: '',
  goal: '',
  startDate: null,
  endDate: null,
};

export function SprintDialog({
  open,
  sprint = null,
  onOpenChange,
  onSave,
  onDelete,
}: SprintDialogProps) {
  const { t, i18n } = useTranslation();
  const initialDraft: SprintFields = sprint
    ? {
        name: sprint.name,
        goal: sprint.goal,
        startDate: sprint.startDate,
        endDate: sprint.endDate,
      }
    : EMPTY_SPRINT;
  const [draft, setDraft] = useState<SprintFields>(initialDraft);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setDraft(initialDraft);
    setError(null);
    onOpenChange(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => (next ? onOpenChange(true) : close())}
    >
      <DialogContent>
        <div className="task-dialog-heading">
          <div>
            <DialogTitle>
              {t(sprint ? 'sprint.editTitle' : 'sprint.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {t(
                sprint ? 'sprint.editDescription' : 'sprint.createDescription',
              )}
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
            const issue = validateSprintFields(draft);
            setError(issue);
            if (issue) return;
            setSaving(true);
            void onSave(draft)
              .then(close)
              .finally(() => setSaving(false));
          }}
        >
          <div className="form-field form-field-wide">
            <label htmlFor="sprint-name">{t('sprint.fields.name')} *</label>
            <Input
              id="sprint-name"
              autoFocus
              value={draft.name}
              maxLength={81}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
            />
          </div>
          <div className="form-field form-field-wide">
            <label htmlFor="sprint-goal">{t('sprint.fields.goal')}</label>
            <Textarea
              id="sprint-goal"
              value={draft.goal}
              maxLength={501}
              rows={3}
              onChange={(event) =>
                setDraft((current) => ({
                  ...current,
                  goal: event.target.value,
                }))
              }
            />
          </div>
          <div className="task-form-grid">
            <div className="form-field">
              <label htmlFor="sprint-start">
                {t('sprint.fields.startDate')}
              </label>
              <DatePicker
                id="sprint-start"
                name="sprintStartDate"
                value={draft.startDate}
                locale={i18n.resolvedLanguage ?? i18n.language}
                placeholder={t('task.datePlaceholder')}
                clearLabel={t('task.actions.clearDate')}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, startDate: value }))
                }
              />
            </div>
            <div className="form-field">
              <label htmlFor="sprint-end">{t('sprint.fields.endDate')}</label>
              <DatePicker
                id="sprint-end"
                name="sprintEndDate"
                value={draft.endDate}
                locale={i18n.resolvedLanguage ?? i18n.language}
                placeholder={t('task.datePlaceholder')}
                clearLabel={t('task.actions.clearDate')}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, endDate: value }))
                }
              />
            </div>
          </div>
          {error ? (
            <p className="field-error" role="alert">
              {t(`sprint.validation.${error}`)}
            </p>
          ) : null}
          <div className="task-form-actions">
            {sprint?.status === 'planned' && onDelete ? (
              <Button
                type="button"
                variant="outline"
                size="dialog"
                className="danger-button"
                onClick={() => {
                  close();
                  onDelete(sprint);
                }}
              >
                {t('sprint.actions.delete')}
              </Button>
            ) : (
              <span />
            )}
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
                {saving
                  ? t('task.actions.saving')
                  : t(sprint ? 'sprint.actions.save' : 'sprint.actions.create')}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
