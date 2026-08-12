import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Sprint } from '@/domain/sprint';

const BACKLOG_TARGET = '__backlog__';

interface CompleteSprintDialogProps {
  open: boolean;
  sprint: Sprint | null;
  plannedSprints: readonly Sprint[];
  incompleteCount: number;
  onOpenChange(open: boolean): void;
  onConfirm(sprintId: string, targetSprintId: string | null): Promise<void>;
}

export function CompleteSprintDialog({
  open,
  sprint,
  plannedSprints,
  incompleteCount,
  onOpenChange,
  onConfirm,
}: CompleteSprintDialogProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState<string>('');
  const targetRequired = incompleteCount > 0;

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setTarget('');
        onOpenChange(next);
      }}
    >
      <AlertDialogContent>
        <AlertDialogTitle>{t('sprint.completeTitle')}</AlertDialogTitle>
        <AlertDialogDescription>
          {t('sprint.completeDescription', {
            name: sprint?.name,
            count: incompleteCount,
          })}
        </AlertDialogDescription>
        {targetRequired ? (
          <div className="form-field form-field-wide">
            <label htmlFor="complete-sprint-target">
              {t('sprint.fields.incompleteTarget')} *
            </label>
            <Select value={target} onValueChange={setTarget}>
              <SelectTrigger id="complete-sprint-target">
                <SelectValue placeholder={t('sprint.selectTarget')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={BACKLOG_TARGET}>
                  {t('backlog.backlog')}
                </SelectItem>
                {plannedSprints.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="confirmation-actions">
          <AlertDialogCancel asChild>
            <Button variant="outline" size="dialog">
              {t('task.actions.cancel')}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              size="dialog"
              disabled={saving || !sprint || (targetRequired && !target)}
              onClick={(event) => {
                if (!sprint) return;
                event.preventDefault();
                setSaving(true);
                const targetSprintId =
                  !targetRequired || target === BACKLOG_TARGET ? null : target;
                void onConfirm(sprint.id, targetSprintId)
                  .then(() => {
                    setTarget('');
                    onOpenChange(false);
                  })
                  .finally(() => setSaving(false));
              }}
            >
              {saving
                ? t('task.actions.saving')
                : t('sprint.actions.confirmComplete')}
            </Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
