import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import type { Member } from '@/domain/member';
import type { Task, TaskStatus } from '@/domain/task';
import { boardColumnId } from '@/features/board/board-dnd';
import { TaskCard } from '@/features/board/TaskCard';
import { cn } from '@/lib/utils';

interface BoardColumnProps {
  status: TaskStatus;
  tasks: readonly Task[];
  members: readonly Member[];
  isDropTarget: boolean;
  onCreate(status: TaskStatus, trigger: HTMLElement): void;
  onOpenTask(taskId: string, trigger: HTMLElement): void;
}

export function BoardColumn({
  status,
  tasks,
  members,
  isDropTarget,
  onCreate,
  onOpenTask,
}: BoardColumnProps) {
  const { t } = useTranslation();
  const { setNodeRef } = useDroppable({
    id: boardColumnId(status),
    data: { status },
  });
  const statusLabel = t(`task.status.${status}`);

  return (
    <section
      ref={setNodeRef}
      className={cn('board-column', isDropTarget && 'board-column-over')}
      data-status={status}
      data-testid={`board-column-${status}`}
      aria-labelledby={`board-column-${status}-title`}
    >
      <header className="board-column-header">
        <div>
          <span className="board-column-status-dot" aria-hidden="true" />
          <h2 id={`board-column-${status}-title`}>{statusLabel}</h2>
        </div>
        <span
          className="board-column-count"
          aria-label={t('board.columnCount', {
            status: statusLabel,
            count: tasks.length,
          })}
        >
          {tasks.length}
        </span>
      </header>

      <SortableContext
        items={tasks.map((task) => task.id)}
        strategy={verticalListSortingStrategy}
      >
        {tasks.length > 0 ? (
          <ul className="board-task-list">
            {tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                member={
                  members.find((member) => member.id === task.assigneeId) ??
                  null
                }
                onOpen={(trigger) => onOpenTask(task.id, trigger)}
              />
            ))}
          </ul>
        ) : (
          <div className="board-column-empty">
            <p>{t('board.emptyColumn')}</p>
            <Button
              variant="outline"
              onClick={(event) => onCreate(status, event.currentTarget)}
              aria-label={t('board.createInColumn', { status: statusLabel })}
            >
              <Plus size={14} />
              {t('board.addTask')}
            </Button>
          </div>
        )}
      </SortableContext>
    </section>
  );
}
