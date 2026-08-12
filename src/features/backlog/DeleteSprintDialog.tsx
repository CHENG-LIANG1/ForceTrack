// Confirms planned Sprint deletion while making the automatic task destination explicit.
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
import type { Sprint } from '@/domain/sprint';

interface DeleteSprintDialogProps {
  open: boolean;
  sprint: Sprint | null;
  targetSprint: Sprint | null;
  onOpenChange(open: boolean): void;
  onConfirm(sprintId: string, targetSprintId: string | null): Promise<void>;
}

export function DeleteSprintDialog({
  open,
  sprint,
  targetSprint,
  onOpenChange,
  onConfirm,
}: DeleteSprintDialogProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>{t('sprint.deleteTitle')}</AlertDialogTitle>
        <AlertDialogDescription>
          {t('sprint.deleteDescription', {
            name: sprint?.name,
            target: targetSprint?.name ?? t('backlog.backlog'),
          })}
        </AlertDialogDescription>
        <div className="confirmation-actions">
          <AlertDialogCancel asChild>
            <Button variant="outline" size="dialog">
              {t('task.actions.cancel')}
            </Button>
          </AlertDialogCancel>
          <AlertDialogAction asChild>
            <Button
              size="dialog"
              disabled={saving || !sprint}
              onClick={(event) => {
                if (!sprint) return;
                event.preventDefault();
                setSaving(true);
                void onConfirm(sprint.id, targetSprint?.id ?? null)
                  .then(() => onOpenChange(false))
                  .finally(() => setSaving(false));
              }}
            >
              {saving
                ? t('task.actions.saving')
                : t('sprint.actions.confirmDelete')}
            </Button>
          </AlertDialogAction>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
