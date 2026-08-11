import {
  closestCorners,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Plus } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '@/app/task-context';
import { Button } from '@/components/ui/button';
import { TASK_STATUSES, type TaskStatus } from '@/domain/task';
import { BoardColumn } from '@/features/board/BoardColumn';
import {
  boardKeyboardCoordinates,
  orderedTasksForStatus,
  resolveBoardDropTarget,
} from '@/features/board/board-dnd';
import { TaskCardOverlay } from '@/features/board/TaskCard';
import { TaskDialog } from '@/features/task-editor/TaskDialog';

interface EditorState {
  open: boolean;
  taskId: string | null;
  createStatus: TaskStatus;
}

export function BoardPage() {
  const { t } = useTranslation();
  const {
    snapshot,
    isReady,
    loadWasRecovered,
    persistenceFailed,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
  } = useTasks();
  const [editor, setEditor] = useState<EditorState>({
    open: false,
    taskId: null,
    createStatus: 'todo',
  });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [overStatus, setOverStatus] = useState<TaskStatus | null>(null);
  const editorTriggerRef = useRef<HTMLElement | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: boardKeyboardCoordinates,
    }),
  );
  const selectedTask =
    snapshot?.tasks.find((task) => task.id === editor.taskId) ?? null;
  const activeTask =
    snapshot?.tasks.find((task) => task.id === activeTaskId) ?? null;
  const activeMember =
    snapshot?.members.find((member) => member.id === activeTask?.assigneeId) ??
    null;

  const openCreate = (status: TaskStatus, trigger: HTMLElement) => {
    editorTriggerRef.current = trigger;
    setEditor({ open: true, taskId: null, createStatus: status });
  };

  const openTask = (taskId: string, trigger: HTMLElement) => {
    editorTriggerRef.current = trigger;
    setEditor({ open: true, taskId, createStatus: 'todo' });
  };

  const targetStatus = useCallback(
    (overId: string | null): TaskStatus | null => {
      if (!snapshot || !overId) return null;
      return resolveBoardDropTarget(snapshot.tasks, overId)?.status ?? null;
    },
    [snapshot],
  );

  const announcements: Announcements = useMemo(
    () => ({
      onDragStart: ({ active }) => {
        const task = snapshot?.tasks.find(
          (candidate) => candidate.id === String(active.id),
        );
        return task
          ? t('board.dnd.pickedUp', { title: task.title })
          : undefined;
      },
      onDragOver: ({ active, over }) => {
        const task = snapshot?.tasks.find(
          (candidate) => candidate.id === String(active.id),
        );
        const status = targetStatus(over ? String(over.id) : null);
        return task && status
          ? t('board.dnd.over', {
              title: task.title,
              status: t(`task.status.${status}`),
            })
          : undefined;
      },
      onDragEnd: ({ active, over }) => {
        const task = snapshot?.tasks.find(
          (candidate) => candidate.id === String(active.id),
        );
        const status = targetStatus(over ? String(over.id) : null);
        return task && status
          ? t('board.dnd.dropped', {
              title: task.title,
              status: t(`task.status.${status}`),
            })
          : t('board.dnd.cancelled');
      },
      onDragCancel: () => t('board.dnd.cancelled'),
    }),
    [snapshot, t, targetStatus],
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTaskId(String(active.id));
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    setOverStatus(targetStatus(over ? String(over.id) : null));
  };

  const resetDragState = () => {
    setActiveTaskId(null);
    setOverStatus(null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!snapshot || !over) {
      resetDragState();
      return;
    }

    const taskId = String(active.id);
    const movingTask = snapshot.tasks.find((task) => task.id === taskId);
    const target = resolveBoardDropTarget(snapshot.tasks, String(over.id));
    if (!movingTask || !target) {
      resetDragState();
      return;
    }

    const targetLength = orderedTasksForStatus(
      snapshot.tasks,
      target.status,
    ).length;
    const maximumIndex =
      targetLength - (movingTask.status === target.status ? 1 : 0);
    const effectiveIndex = Math.min(target.index, Math.max(0, maximumIndex));
    const positionChanged =
      movingTask.status !== target.status ||
      movingTask.position !== effectiveIndex;

    resetDragState();
    if (positionChanged) {
      void moveTask(taskId, target.status, effectiveIndex);
    }
  };

  return (
    <section className="workspace-page" aria-labelledby="board-title">
      <div className="board-heading-row">
        <div className="page-heading">
          <p className="page-kicker">ForceTrack / Board</p>
          <h1 id="board-title">{t('board.title')}</h1>
          <p>{t('board.description')}</p>
        </div>
        <Button
          size="lg"
          onClick={(event) => openCreate('todo', event.currentTarget)}
          disabled={!isReady}
        >
          <Plus size={16} />
          {t('task.actions.create')}
        </Button>
      </div>

      {loadWasRecovered ? (
        <div className="feedback-banner" role="status">
          {t('task.feedback.recovered')}
        </div>
      ) : null}
      {persistenceFailed ? (
        <div className="feedback-banner feedback-banner-danger" role="alert">
          {t('task.feedback.saveFailed')}
        </div>
      ) : null}

      {!snapshot ? (
        <div className="board-loading" aria-busy="true">
          {t('board.loading')}
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable: t('board.dnd.instructions'),
            },
          }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={resetDragState}
        >
          <div className="board-scroll" aria-label={t('board.columnsLabel')}>
            <div className="board-grid">
              {TASK_STATUSES.map((status) => (
                <BoardColumn
                  key={status}
                  status={status}
                  tasks={orderedTasksForStatus(snapshot.tasks, status)}
                  members={snapshot.members}
                  isDropTarget={overStatus === status}
                  onCreate={openCreate}
                  onOpenTask={openTask}
                />
              ))}
            </div>
          </div>

          <DragOverlay>
            {activeTask ? (
              <TaskCardOverlay task={activeTask} member={activeMember} />
            ) : null}
          </DragOverlay>
        </DndContext>
      )}

      {snapshot ? (
        <TaskDialog
          open={editor.open}
          task={selectedTask}
          initialStatus={editor.createStatus}
          members={snapshot.members}
          returnFocusRef={editorTriggerRef}
          onOpenChange={(open) =>
            setEditor((current) => ({ ...current, open }))
          }
          onSave={(fields) =>
            editor.taskId
              ? updateTask(editor.taskId, fields)
              : createTask(fields)
          }
          onDelete={
            editor.taskId
              ? () => deleteTask(editor.taskId as string)
              : undefined
          }
        />
      ) : null}
    </section>
  );
}
