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

interface CompleteSprintDialogProps {
  open: boolean;
  sprint: Sprint | null;
  incompleteCount: number;
  onOpenChange(open: boolean): void;
  onConfirm(sprintId: string): Promise<void>;
}

export function CompleteSprintDialog({
  open,
  sprint,
  incompleteCount,
  onOpenChange,
  onConfirm,
}: CompleteSprintDialogProps) {
  const { t } = useTranslation();
  const [saving, setSaving] = useState(false);

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogTitle>{t('sprint.completeTitle')}</AlertDialogTitle>
        <AlertDialogDescription>
          {t('sprint.completeDescription', {
            name: sprint?.name,
            count: incompleteCount,
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
                void onConfirm(sprint.id)
                  .then(() => onOpenChange(false))
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
