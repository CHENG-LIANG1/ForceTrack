import { useSortable } from '@dnd-kit/sortable';
import { CalendarDays } from 'lucide-react';
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import type { Member } from '@/domain/member';
import type { Task } from '@/domain/task';
import { cn } from '@/lib/utils';

interface TaskCardProps {
  task: Task;
  member: Member | null;
  onOpen(trigger: HTMLElement): void;
}

interface TaskCardContentProps {
  task: Task;
  member: Member | null;
}

function memberInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('');
}

function formatCalendarDate(value: string, locale: string): string {
  const [year, month, day] = value.split('-').map(Number);
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
  }).format(new Date(year, month - 1, day));
}

function TaskCardContent({ task, member }: TaskCardContentProps) {
  const { t, i18n } = useTranslation();

  return (
    <>
      <span className="task-card-heading">
        <span className="task-card-key">{task.key}</span>
        <span
          className={cn(
            'task-card-work-type',
            `task-card-work-type-${task.workType}`,
          )}
          data-testid="task-card-work-type"
        >
          {t(`task.workType.${task.workType}`)}
        </span>
      </span>
      <strong className="task-card-title">{task.title}</strong>
      <span className="task-card-meta">
        <span className={cn('task-priority', `task-priority-${task.priority}`)}>
          {t(`task.priority.${task.priority}`)}
        </span>
        {task.dueDate ? (
          <span className="task-due-date">
            <CalendarDays size={13} aria-hidden="true" />
            {formatCalendarDate(
              task.dueDate,
              i18n.resolvedLanguage ?? i18n.language,
            )}
          </span>
        ) : null}
        <span
          className="task-assignee"
          title={member?.name ?? t('task.unassigned')}
          aria-label={member?.name ?? t('task.unassigned')}
        >
          {member ? memberInitials(member.name) : '–'}
        </span>
      </span>
    </>
  );
}

/** Makes the entire task card both the editor trigger and an accessible drag handle. */
export function TaskCard({ task, member, onOpen }: TaskCardProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, data: { status: task.status } });
  const style: CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
      : undefined,
    transition,
  };

  return (
    <li ref={setNodeRef} style={style} className="task-card-slot">
      <Button
        {...attributes}
        {...listeners}
        type="button"
        variant="unstyled"
        className={cn('task-card', isDragging && 'task-card-dragging')}
        data-testid={`task-card-${task.id}`}
        aria-label={t('task.actions.editLabel', {
          key: task.key,
          title: task.title,
        })}
        onClick={(event) => {
          if (isDragging) return;
          onOpen(event.currentTarget);
        }}
      >
        <TaskCardContent task={task} member={member} />
      </Button>
    </li>
  );
}

export function TaskCardOverlay({ task, member }: TaskCardContentProps) {
  return (
    <div className="task-card task-card-overlay" aria-hidden="true">
      <TaskCardContent task={task} member={member} />
    </div>
  );
}
