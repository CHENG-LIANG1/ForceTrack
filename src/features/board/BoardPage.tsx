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
import { differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import { CalendarDays, ListTodo, Plus } from 'lucide-react';
import { useCallback, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useTasks } from '@/app/task-context';
import { useProjects } from '@/app/project-context';
import { projectRoutes } from '@/app/route-paths';
import { LoadingState } from '@/components/LoadingState';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { TASK_STATUSES, type TaskStatus } from '@/domain/task';
import { CompleteSprintDialog } from '@/features/backlog/CompleteSprintDialog';
import { BoardColumn } from '@/features/board/BoardColumn';
import {
  selectActiveSprint,
  selectActiveSprintTasks,
} from '@/features/board/board-selectors';
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
  const navigate = useNavigate();
  const { currentProject } = useProjects();
  const {
    snapshot,
    isReady,
    createTask,
    updateTask,
    deleteTask,
    moveTask,
    completeSprint,
  } = useTasks();
  const [editor, setEditor] = useState<EditorState>({
    open: false,
    taskId: null,
    createStatus: 'todo',
  });
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
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
  const boardTasks = useMemo(
    () => (snapshot ? selectActiveSprintTasks(snapshot) : []),
    [snapshot],
  );
  const activeSprint = snapshot ? selectActiveSprint(snapshot) : null;
  const plannedSprints =
    snapshot?.sprints.filter((sprint) => sprint.status === 'planned') ?? [];
  const incompleteCount = boardTasks.filter(
    (task) => task.status !== 'done',
  ).length;
  const remainingDays = activeSprint?.endDate
    ? Math.max(
        0,
        differenceInCalendarDays(
          parseISO(activeSprint.endDate),
          startOfDay(new Date()),
        ),
      )
    : null;
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
      return resolveBoardDropTarget(boardTasks, overId)?.status ?? null;
    },
    [boardTasks, snapshot],
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
    const target = resolveBoardDropTarget(boardTasks, String(over.id));
    if (!movingTask || !target) {
      resetDragState();
      return;
    }

    const targetLength = orderedTasksForStatus(
      boardTasks,
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
      <PageHeader
        onboardingTarget="page-board"
        section={t('nav.board')}
        titleId="board-title"
        title={t('board.title')}
        description={t('board.description')}
        actions={
          activeSprint ? (
            <>
              <Button
                variant="outline"
                size="lg"
                onClick={() => setCompleteDialogOpen(true)}
              >
                {t('sprint.actions.complete')}
              </Button>
              <Button
                size="lg"
                onClick={(event) => openCreate('todo', event.currentTarget)}
                disabled={!isReady}
              >
                <Plus size={16} />
                {t('task.actions.create')}
              </Button>
            </>
          ) : null
        }
      />

      {!snapshot ? (
        <LoadingState label={t('board.loading')} />
      ) : !activeSprint ? (
        <div className="board-no-sprint">
          <span aria-hidden="true">
            <ListTodo size={24} />
          </span>
          <h2>{t('board.noSprintTitle')}</h2>
          <p>{t('board.noSprintDescription')}</p>
          <Button
            onClick={() =>
              currentProject &&
              navigate(projectRoutes.backlog(currentProject.id))
            }
          >
            {t('board.openBacklog')}
          </Button>
        </div>
      ) : (
        <>
          <div className="active-sprint-summary">
            <div>
              <span>{t('board.activeSprint')}</span>
              <strong>{activeSprint.name}</strong>
              <p>{activeSprint.goal || t('board.noGoal')}</p>
            </div>
            <div className="active-sprint-dates">
              <CalendarDays size={16} aria-hidden="true" />
              <span>
                {activeSprint.startDate} – {activeSprint.endDate}
              </span>
              {remainingDays !== null ? (
                <strong>
                  {t('board.daysRemaining', { count: remainingDays })}
                </strong>
              ) : null}
            </div>
          </div>
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
                    tasks={orderedTasksForStatus(boardTasks, status)}
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
        </>
      )}

      {snapshot ? (
        <TaskDialog
          open={editor.open}
          task={selectedTask}
          tasks={snapshot.tasks}
          sprints={snapshot.sprints}
          initialStatus={editor.createStatus}
          initialSprintId={
            snapshot.sprints.find((sprint) => sprint.status === 'active')?.id ??
            null
          }
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
      <CompleteSprintDialog
        key={activeSprint?.id ?? 'board-complete-sprint-closed'}
        open={completeDialogOpen && activeSprint !== null}
        sprint={activeSprint}
        plannedSprints={plannedSprints}
        incompleteCount={incompleteCount}
        onOpenChange={setCompleteDialogOpen}
        onConfirm={completeSprint}
      />
    </section>
  );
}
