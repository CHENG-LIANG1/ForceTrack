import * as AlertDialog from '@radix-ui/react-alert-dialog';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import { type RefObject, useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import type { Member } from '@/domain/member';
import type { Task, TaskFields, TaskStatus } from '@/domain/task';
import { TaskForm } from '@/features/task-editor/TaskForm';

interface TaskDialogProps {
  open: boolean;
  task: Task | null;
  initialStatus?: TaskStatus;
  members: readonly Member[];
  returnFocusRef?: RefObject<HTMLElement | null>;
  onOpenChange(open: boolean): void;
  onSave(fields: TaskFields): Promise<void>;
  onDelete?(): Promise<void>;
}

/** Radix dialog preserves focus while nested confirmations guard destructive exits. */
export function TaskDialog({
  open,
  task,
  initialStatus,
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

  const handleSave = async (fields: TaskFields) => {
    await onSave(fields);
    closeWithoutGuard();
  };

  const handleDelete = async () => {
    if (!onDelete) return;
    await onDelete();
    setDeleteOpen(false);
    closeWithoutGuard();
  };

  return (
    <>
      <Dialog.Root open={open} onOpenChange={handleOpenChange}>
        <Dialog.Portal>
          <Dialog.Overlay className="dialog-overlay" />
          <Dialog.Content
            className="task-dialog-content"
            onCloseAutoFocus={(event) => {
              if (!returnFocusRef?.current) return;
              event.preventDefault();
              returnFocusRef.current.focus();
            }}
          >
            <div className="task-dialog-heading">
              <div>
                <Dialog.Title>
                  {task
                    ? t('task.dialog.editTitle')
                    : t('task.dialog.createTitle')}
                </Dialog.Title>
                <Dialog.Description>
                  {task
                    ? t('task.dialog.editDescription')
                    : t('task.dialog.createDescription')}
                </Dialog.Description>
              </div>
              <Dialog.Close asChild>
                <button
                  className="icon-button"
                  type="button"
                  aria-label={t('task.actions.close')}
                >
                  <X size={18} />
                </button>
              </Dialog.Close>
            </div>

            <TaskForm
              key={task?.id ?? 'new-task'}
              task={task}
              initialStatus={initialStatus}
              members={members}
              onSubmit={handleSave}
              onCancel={requestClose}
              onDelete={onDelete ? () => setDeleteOpen(true) : undefined}
              onDirtyChange={(dirty) => {
                dirtyRef.current = dirty;
              }}
            />
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>

      <AlertDialog.Root open={discardOpen} onOpenChange={setDiscardOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay dialog-overlay-raised" />
          <AlertDialog.Content className="confirmation-dialog-content">
            <AlertDialog.Title>{t('task.discard.title')}</AlertDialog.Title>
            <AlertDialog.Description>
              {t('task.discard.description')}
            </AlertDialog.Description>
            <div className="confirmation-actions">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">
                  {t('task.actions.keepEditing')}
                </Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button onClick={closeWithoutGuard}>
                  {t('task.actions.discard')}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>

      <AlertDialog.Root open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="dialog-overlay dialog-overlay-raised" />
          <AlertDialog.Content className="confirmation-dialog-content">
            <AlertDialog.Title>{t('task.delete.title')}</AlertDialog.Title>
            <AlertDialog.Description>
              {t('task.delete.description', { title: task?.title })}
            </AlertDialog.Description>
            <div className="confirmation-actions">
              <AlertDialog.Cancel asChild>
                <Button variant="outline">{t('task.actions.cancel')}</Button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <Button
                  className="danger-primary-button"
                  onClick={handleDelete}
                >
                  {t('task.actions.confirmDelete')}
                </Button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}
