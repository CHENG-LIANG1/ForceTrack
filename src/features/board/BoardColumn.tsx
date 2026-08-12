import { useDroppable } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus } from 'lucide-react';
import { Fragment, type CSSProperties, useLayoutEffect, useRef } from 'react';
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
  dropPreviewIndex: number | null;
  dropPreviewHeight: number | null;
  onCreate(status: TaskStatus, trigger: HTMLElement): void;
  onOpenTask(taskId: string, trigger: HTMLElement): void;
}

const BOARD_CARD_SHIFT_DURATION_MS = 280;

function BoardDropPlaceholder({ height }: { height: number | null }) {
  return (
    <li
      className="board-task-drop-placeholder"
      style={height ? ({ height } satisfies CSSProperties) : undefined}
      data-testid="board-task-drop-placeholder"
      aria-hidden="true"
    />
  );
}

export function BoardColumn({
  status,
  tasks,
  members,
  isDropTarget,
  dropPreviewIndex,
  dropPreviewHeight,
  onCreate,
  onOpenTask,
}: BoardColumnProps) {
  const { t } = useTranslation();
  const columnRef = useRef<HTMLElement | null>(null);
  const previousCardTopsRef = useRef(new Map<string, number>());
  const previousPreviewIndexRef = useRef<number | null>(null);
  const { setNodeRef } = useDroppable({
    id: boardColumnId(status),
    data: { status },
  });
  const statusLabel = t(`task.status.${status}`);
  const taskOrderKey = tasks.map((task) => task.id).join(':');

  useLayoutEffect(() => {
    const column = columnRef.current;
    if (!column) return;

    const cards = Array.from(
      column.querySelectorAll<HTMLElement>('[data-task-card-id]'),
    );
    const nextCardTops = new Map(
      cards.map((card) => [
        card.dataset.taskCardId ?? '',
        card.getBoundingClientRect().top,
      ]),
    );
    const shouldAnimate =
      dropPreviewIndex !== null || previousPreviewIndexRef.current !== null;

    if (
      shouldAnimate &&
      !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    ) {
      cards.forEach((card) => {
        const taskId = card.dataset.taskCardId ?? '';
        const previousTop = previousCardTopsRef.current.get(taskId);
        const nextTop = nextCardTops.get(taskId);
        if (previousTop === undefined || nextTop === undefined) return;

        const offset = previousTop - nextTop;
        if (Math.abs(offset) < 1) return;
        card.getAnimations().forEach((animation) => animation.cancel());
        card.animate(
          [
            { transform: `translateY(${offset}px)` },
            { transform: 'translateY(0)' },
          ],
          {
            duration: BOARD_CARD_SHIFT_DURATION_MS,
            easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          },
        );
      });
    }

    previousCardTopsRef.current = nextCardTops;
    previousPreviewIndexRef.current = dropPreviewIndex;
  }, [dropPreviewIndex, taskOrderKey]);

  return (
    <section
      ref={(node) => {
        columnRef.current = node;
        setNodeRef(node);
      }}
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
            {tasks.map((task, index) => (
              <Fragment key={task.id}>
                {dropPreviewIndex === index ? (
                  <BoardDropPlaceholder height={dropPreviewHeight} />
                ) : null}
                <TaskCard
                  task={task}
                  member={
                    members.find((member) => member.id === task.assigneeId) ??
                    null
                  }
                  onOpen={(trigger) => onOpenTask(task.id, trigger)}
                />
              </Fragment>
            ))}
            {dropPreviewIndex === tasks.length ? (
              <BoardDropPlaceholder height={dropPreviewHeight} />
            ) : null}
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
