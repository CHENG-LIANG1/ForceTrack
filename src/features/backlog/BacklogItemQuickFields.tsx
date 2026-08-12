/** Keeps high-frequency planning edits inline while reusing the shared shadcn controls. */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DatePicker } from '@/components/ui/date-picker';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type Task,
  type TaskFields,
  type TaskPriority,
  type TaskStatus,
} from '@/domain/task';
import { cn } from '@/lib/utils';

type QuickTaskPatch = Pick<TaskFields, 'status' | 'dueDate' | 'priority'>;
type QuickTaskField = keyof QuickTaskPatch;

interface BacklogItemQuickFieldsProps {
  task: Task;
  onUpdate(patch: Partial<QuickTaskPatch>): Promise<void>;
}

export function BacklogItemQuickFields({
  task,
  onUpdate,
}: BacklogItemQuickFieldsProps) {
  const { t, i18n } = useTranslation();
  const [pendingField, setPendingField] = useState<QuickTaskField | null>(null);
  const [failed, setFailed] = useState(false);

  /** Serializes each field update so the row exposes clear saving and error states. */
  const commit = async (
    field: QuickTaskField,
    patch: Partial<QuickTaskPatch>,
  ) => {
    setPendingField(field);
    setFailed(false);
    try {
      await onUpdate(patch);
    } catch {
      setFailed(true);
    } finally {
      setPendingField(null);
    }
  };

  return (
    <div
      className="backlog-quick-fields"
      aria-busy={pendingField !== null}
      data-testid={`backlog-quick-fields-${task.key}`}
    >
      <Select
        value={task.status}
        disabled={pendingField !== null}
        onValueChange={(value) =>
          void commit('status', { status: value as TaskStatus })
        }
      >
        <SelectTrigger
          className={cn(
            'backlog-inline-control backlog-inline-status',
            `status-${task.status}`,
          )}
          aria-label={t('backlog.quick.statusLabel', { key: task.key })}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TASK_STATUSES.map((status) => (
            <SelectItem key={status} value={status}>
              {t(`task.status.${status}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <DatePicker
        id={`backlog-due-date-${task.id}`}
        name={`backlog-due-date-${task.id}`}
        className="backlog-inline-control backlog-inline-date"
        ariaLabel={t('backlog.quick.dueDateLabel', { key: task.key })}
        value={task.dueDate}
        minDate={task.startDate}
        compact
        disabled={pendingField !== null}
        locale={i18n.resolvedLanguage ?? i18n.language}
        placeholder={t('backlog.quick.dueDate')}
        clearLabel={t('task.actions.clearDate')}
        onChange={(dueDate) => void commit('dueDate', { dueDate })}
      />

      <Select
        value={task.priority}
        disabled={pendingField !== null}
        onValueChange={(value) =>
          void commit('priority', { priority: value as TaskPriority })
        }
      >
        <SelectTrigger
          className={cn(
            'backlog-inline-control backlog-inline-priority',
            `priority-${task.priority}`,
          )}
          aria-label={t('backlog.quick.priorityLabel', { key: task.key })}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {TASK_PRIORITIES.map((priority) => (
            <SelectItem key={priority} value={priority}>
              {t(`task.priority.${priority}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {failed ? (
        <span className="visually-hidden" role="alert">
          {t('backlog.quick.updateFailed', { key: task.key })}
        </span>
      ) : null}
    </div>
  );
}
