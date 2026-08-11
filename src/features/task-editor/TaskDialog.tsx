import { X } from 'lucide-react';
import { type RefObject, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Member } from '@/domain/member';
import type { Sprint } from '@/domain/sprint';
import type { Task, TaskFields, TaskStatus } from '@/domain/task';
import { TaskForm } from '@/features/task-editor/TaskForm';

interface TaskDialogProps {
  open: boolean;
  task: Task | null;
  tasks: readonly Task[];
  sprints: readonly Sprint[];
  initialStatus?: TaskStatus;
  initialSprintId?: string | null;
  members: readonly Member[];
  returnFocusRef?: RefObject<HTMLElement | null>;
  onOpenChange(open: boolean): void;
  onSave(fields: TaskFields): Promise<void>;
  onDelete?(): Promise<void>;
}

/** The shadcn dialog layer preserves focus while nested confirmations guard destructive exits. */
export function TaskDialog({
  open,
  task,
  tasks,
  sprints,
  initialStatus,
  initialSprintId,
  members,
  returnFocusRef,
  onOpenChange,
  onSave,
  onDelete,
}: TaskDialogProps) {
  const { t } = useTranslation();
  const dirtyRef = useRef(false);
  const [discardOpen, setDiscardOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const closeWithoutGuard = useCallback(() => {
    dirtyRef.current = false;
    onOpenChange(false);
  }, [onOpenChange]);

  const requestClose = useCallback(() => {
    if (dirtyRef.current) {
      setDiscardOpen(true);
    } else {
      onOpenChange(false);
    }
  }, [onOpenChange]);

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) onOpenChange(true);
    else requestClose();
  };

  const handleSave = async (fields: TaskFields, createAnother: boolean) => {
    await onSave(fields);
    if (!createAnother) closeWithoutGuard();
    else dirtyRef.current = false;
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    await onDelete();
    setDeleteOpen(false);
    closeWithoutGuard();
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          onCloseAutoFocus={(event) => {
            if (!returnFocusRef?.current) return;
            event.preventDefault();
            returnFocusRef.current.focus();
          }}
        >
          <div className="task-dialog-heading">
            <div>
              <DialogTitle>
                {task
                  ? t('task.dialog.editTitle')
                  : t('task.dialog.createTitle')}
              </DialogTitle>
              <DialogDescription>
                {task
                  ? t('task.dialog.editDescription')
                  : t('task.dialog.createDescription')}
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

          <TaskForm
            key={task?.id ?? 'new-task'}
            task={task}
            tasks={tasks}
            sprints={sprints}
            initialStatus={initialStatus}
            initialSprintId={initialSprintId}
            members={members}
            onSubmit={handleSave}
            onCancel={requestClose}
            onDelete={onDelete ? () => setDeleteOpen(true) : undefined}
            onDirtyChange={(dirty) => {
              dirtyRef.current = dirty;
            }}
          />
        </DialogContent>
      </Dialog>

      <AlertDialog open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('task.discard.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('task.discard.description')}
          </AlertDialogDescription>
          <div className="confirmation-actions">
            <AlertDialogCancel asChild>
              <Button variant="outline" size="dialog">
                {t('task.actions.keepEditing')}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="dialog" onClick={closeWithoutGuard}>
                {t('task.actions.discard')}
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogTitle>{t('task.delete.title')}</AlertDialogTitle>
          <AlertDialogDescription>
            {t('task.delete.description', { title: task?.title })}
          </AlertDialogDescription>
          <div className="confirmation-actions">
            <AlertDialogCancel asChild>
              <Button variant="outline" size="dialog">
                {t('task.actions.cancel')}
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                className="danger-primary-button"
                size="dialog"
                onClick={handleDelete}
              >
                {t('task.actions.confirmDelete')}
              </Button>
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
