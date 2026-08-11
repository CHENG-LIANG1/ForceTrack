import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Plus, Search, UserPlus } from 'lucide-react';
import { type CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { useTasks } from '@/app/task-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { Sprint } from '@/domain/sprint';
import type { Task } from '@/domain/task';
import {
  backlogSectionId,
  createBacklogKeyboardCoordinates,
  resolveBacklogDropTarget,
} from '@/features/backlog/backlog-dnd';
import {
  selectPlanningSprints,
  selectTasksForPlanningSection,
} from '@/features/backlog/backlog-selectors';
import { selectFilteredTasks } from '@/features/filters/task-selectors';
import { TaskDialog } from '@/features/task-editor/TaskDialog';
import { useTaskEditor } from '@/features/task-editor/useTaskEditor';
import { MemberDialog } from '@/features/backlog/MemberDialog';
import { CompleteSprintDialog } from '@/features/backlog/CompleteSprintDialog';
import { SprintDialog } from '@/features/backlog/SprintDialog';
import { StartSprintDialog } from '@/features/backlog/StartSprintDialog';
import { cn } from '@/lib/utils';

interface BacklogSectionProps {
  title: string;
  hint: string;
  empty: string;
  tasks: readonly Task[];
  sprint: Sprint | null;
  isDropTarget: boolean;
  activeSprintExists: boolean;
  onCreate(trigger: HTMLElement): void;
  onOpenTask(taskId: string, trigger: HTMLElement): void;
  onStartSprint(sprint: Sprint): void;
  onCompleteSprint(sprint: Sprint): void;
}

interface BacklogItemProps {
  task: Task;
  onOpenTask(taskId: string, trigger: HTMLElement): void;
}

function BacklogItemContent({ task }: { task: Task }) {
  const { t } = useTranslation();

  return (
    <>
      <span className={`work-type-mark work-type-${task.workType}`}>
        {t(`task.workType.${task.workType}`).slice(0, 1)}
      </span>
      <span className="backlog-item-summary">
        <strong>{task.title}</strong>
        <small>{task.key}</small>
      </span>
      <span className={`status-lozenge status-${task.status}`}>
        {t(`task.status.${task.status}`)}
      </span>
      <span className={`priority-text priority-${task.priority}`}>
        {t(`task.priority.${task.priority}`)}
      </span>
      {task.storyPoints !== null ? (
        <span className="story-points" title={t('task.fields.storyPoints')}>
          {task.storyPoints}
        </span>
      ) : null}
    </>
  );
}

/** Makes the whole backlog row the editor trigger and accessible drag handle. */
function BacklogItem({ task, onOpenTask }: BacklogItemProps) {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: task.id,
    data: { type: 'backlog-item', sprintId: task.sprintId },
  });
  const style: CSSProperties = {
    transform: transform
      ? `translate3d(${transform.x}px, ${transform.y}px, 0) scaleX(${transform.scaleX}) scaleY(${transform.scaleY})`
      : undefined,
    transition,
  };

  return (
    <li ref={setNodeRef} style={style}>
      <Button
        {...attributes}
        {...listeners}
        className={cn(
          'backlog-item-main',
          isDragging && 'backlog-item-dragging',
        )}
        variant="unstyled"
        type="button"
        data-testid={`backlog-item-${task.key}`}
        aria-label={t('task.actions.editLabel', {
          key: task.key,
          title: task.title,
        })}
        onClick={(event) => {
          if (isDragging) return;
          onOpenTask(task.id, event.currentTarget);
        }}
      >
        <BacklogItemContent task={task} />
      </Button>
    </li>
  );
}

function BacklogSection({
  title,
  hint,
  empty,
  tasks,
  sprint,
  isDropTarget,
  activeSprintExists,
  onCreate,
  onOpenTask,
  onStartSprint,
  onCompleteSprint,
}: BacklogSectionProps) {
  const { t } = useTranslation();
  const sprintId = sprint?.id ?? null;
  const { setNodeRef } = useDroppable({
    id: backlogSectionId(sprintId),
    data: { type: 'backlog-section', sprintId },
  });

  return (
    <section
      ref={setNodeRef}
      className={cn(
        'backlog-section',
        isDropTarget && 'backlog-section-drop-target',
      )}
      data-testid={backlogSectionId(sprintId)}
    >
      <header className="backlog-section-header">
        <div>
          <h2>{title}</h2>
          <p>{hint}</p>
        </div>
        <div className="backlog-section-meta">
          <span>{t('backlog.itemCount', { count: tasks.length })}</span>
          {sprint?.status === 'planned' ? (
            <Button
              className="sprint-lifecycle-button"
              variant="outline"
              type="button"
              disabled={activeSprintExists}
              title={
                activeSprintExists
                  ? t('sprint.validation.active_exists')
                  : undefined
              }
              onClick={() => onStartSprint(sprint)}
            >
              {t('sprint.actions.start')}
            </Button>
          ) : null}
          {sprint?.status === 'active' ? (
            <Button
              className="sprint-lifecycle-button"
              variant="outline"
              type="button"
              onClick={() => onCompleteSprint(sprint)}
            >
              {t('sprint.actions.complete')}
            </Button>
          ) : null}
        </div>
      </header>

      {tasks.length ? (
        <SortableContext
          items={tasks.map((task) => task.id)}
          strategy={verticalListSortingStrategy}
        >
          <ul className="backlog-list">
            {tasks.map((task) => (
              <BacklogItem key={task.id} task={task} onOpenTask={onOpenTask} />
            ))}
          </ul>
        </SortableContext>
      ) : (
        <p className="backlog-empty">{empty}</p>
      )}

      <Button
        className="backlog-add-button"
        variant="unstyled"
        type="button"
        onClick={(event) => onCreate(event.currentTarget)}
      >
        <Plus size={15} />
        {t('backlog.add')}
      </Button>
    </section>
  );
}

export function BacklogPage() {
  const { t } = useTranslation();
  const {
    snapshot,
    isReady,
    createTask,
    updateTask,
    deleteTask,
    createSprint,
    startSprint,
    completeSprint,
    createMember,
    rankBacklogTask,
  } = useTasks();
  const [query, setQuery] = useState('');
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);
  const [memberDialogOpen, setMemberDialogOpen] = useState(false);
  const [startingSprintId, setStartingSprintId] = useState<string | null>(null);
  const [completingSprintId, setCompletingSprintId] = useState<string | null>(
    null,
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [overSectionId, setOverSectionId] = useState<string | null>(null);
  const planningSectionSprintIds = useMemo(
    () => [
      ...(snapshot?.sprints
        .filter((sprint) => sprint.status !== 'completed')
        .map((sprint) => sprint.id) ?? []),
      null,
    ],
    [snapshot?.sprints],
  );
  const keyboardCoordinates = useMemo(
    () => createBacklogKeyboardCoordinates(planningSectionSprintIds),
    [planningSectionSprintIds],
  );
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: keyboardCoordinates,
    }),
  );
  const { editor, setEditor, triggerRef, openCreate, openTask } =
    useTaskEditor();
  const selectedTask =
    snapshot?.tasks.find((task) => task.id === editor.taskId) ?? null;
  const matchingTasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!snapshot) return [];
    return selectFilteredTasks(snapshot.tasks, { query: normalized });
  }, [query, snapshot]);
  const backlogTasks = selectTasksForPlanningSection(matchingTasks, null);
  const activeTask =
    snapshot?.tasks.find((task) => task.id === activeTaskId) ?? null;
  const activeSprintExists =
    snapshot?.sprints.some((sprint) => sprint.status === 'active') ?? false;
  const startingSprint =
    snapshot?.sprints.find((sprint) => sprint.id === startingSprintId) ?? null;
  const completingSprint =
    snapshot?.sprints.find((sprint) => sprint.id === completingSprintId) ??
    null;
  const incompleteCompletingSprintTasks =
    snapshot?.tasks.filter(
      (task) => task.sprintId === completingSprintId && task.status !== 'done',
    ).length ?? 0;

  const resolveTarget = (overId: string | null) =>
    snapshot && overId
      ? resolveBacklogDropTarget(snapshot.tasks, overId)
      : null;

  const resetDragState = () => {
    setActiveTaskId(null);
    setOverSectionId(null);
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTaskId(String(active.id));
  };

  const handleDragOver = ({ over }: DragOverEvent) => {
    const target = resolveTarget(over ? String(over.id) : null);
    setOverSectionId(target ? backlogSectionId(target.sprintId) : null);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    if (!snapshot || !over) {
      resetDragState();
      return;
    }
    const task = snapshot.tasks.find(
      (candidate) => candidate.id === String(active.id),
    );
    const target = resolveTarget(String(over.id));
    resetDragState();
    if (!task || !target) return;
    const fullTargetTasks = selectTasksForPlanningSection(
      snapshot.tasks.filter((candidate) => candidate.id !== task.id),
      target.sprintId,
    );
    const overTaskIndex = fullTargetTasks.findIndex(
      (candidate) => candidate.id === String(over.id),
    );
    const toIndex = overTaskIndex >= 0 ? overTaskIndex : fullTargetTasks.length;
    void rankBacklogTask(task.id, target.sprintId, toIndex);
  };

  const targetName = (sprintId: string | null) =>
    sprintId === null
      ? t('backlog.backlog')
      : (snapshot?.sprints.find((sprint) => sprint.id === sprintId)?.name ??
        t('backlog.backlog'));

  const announcements: Announcements = {
    onDragStart: ({ active }) => {
      const task = snapshot?.tasks.find(
        (candidate) => candidate.id === String(active.id),
      );
      return task
        ? t('backlog.dnd.pickedUp', { title: task.title })
        : undefined;
    },
    onDragOver: ({ active, over }) => {
      const task = snapshot?.tasks.find(
        (candidate) => candidate.id === String(active.id),
      );
      const target = resolveTarget(over ? String(over.id) : null);
      return task && target
        ? t('backlog.dnd.over', {
            title: task.title,
            target: targetName(target.sprintId),
          })
        : undefined;
    },
    onDragEnd: ({ active, over }) => {
      const task = snapshot?.tasks.find(
        (candidate) => candidate.id === String(active.id),
      );
      const target = resolveTarget(over ? String(over.id) : null);
      return task && target
        ? t('backlog.dnd.dropped', {
            title: task.title,
            target: targetName(target.sprintId),
          })
        : t('backlog.dnd.cancelled');
    },
    onDragCancel: () => t('backlog.dnd.cancelled'),
  };

  return (
    <section className="workspace-page" aria-labelledby="backlog-title">
      <div className="board-heading-row">
        <div className="page-heading compact-page-heading">
          <p className="page-kicker">ForceTrack / Backlog</p>
          <h1 id="backlog-title">{t('backlog.title')}</h1>
          <p>{t('backlog.description')}</p>
        </div>
        <div className="flex flex-wrap justify-end gap-2">
          <Button
            variant="outline"
            size="lg"
            disabled={!isReady}
            onClick={() => setMemberDialogOpen(true)}
          >
            <UserPlus size={16} />
            {t('member.actions.add')}
          </Button>
          <Button
            variant="outline"
            size="lg"
            disabled={!isReady}
            onClick={() => setSprintDialogOpen(true)}
          >
            <Plus size={16} />
            {t('sprint.actions.create')}
          </Button>
          <Button
            size="lg"
            disabled={!isReady}
            onClick={(event) => openCreate(event.currentTarget, 'todo', null)}
          >
            <Plus size={16} />
            {t('task.actions.create')}
          </Button>
        </div>
      </div>

      <label className="work-search">
        <Search size={16} aria-hidden="true" />
        <span className="visually-hidden">{t('backlog.search')}</span>
        <Input
          className="work-search-input"
          type="search"
          value={query}
          placeholder={t('backlog.search')}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>

      {snapshot ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          accessibility={{
            announcements,
            screenReaderInstructions: {
              draggable: t('backlog.dnd.instructions'),
            },
          }}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={resetDragState}
        >
          <div className="backlog-stack">
            {selectPlanningSprints(snapshot).map((sprint) => (
              <BacklogSection
                key={sprint.id}
                title={sprint.name}
                hint={
                  sprint.status === 'active'
                    ? t('backlog.activeSprintHint')
                    : sprint.goal || t('backlog.plannedSprintHint')
                }
                empty={t('backlog.emptySprint')}
                tasks={selectTasksForPlanningSection(matchingTasks, sprint.id)}
                sprint={sprint}
                isDropTarget={
                  activeTaskId !== null &&
                  overSectionId === backlogSectionId(sprint.id)
                }
                activeSprintExists={activeSprintExists}
                onCreate={(trigger) => openCreate(trigger, 'todo', sprint.id)}
                onOpenTask={openTask}
                onStartSprint={(target) => setStartingSprintId(target.id)}
                onCompleteSprint={(target) => setCompletingSprintId(target.id)}
              />
            ))}
            <BacklogSection
              title={t('backlog.backlog')}
              hint={t('backlog.backlogHint')}
              empty={t('backlog.emptyBacklog')}
              tasks={backlogTasks}
              sprint={null}
              isDropTarget={
                activeTaskId !== null &&
                overSectionId === backlogSectionId(null)
              }
              activeSprintExists={activeSprintExists}
              onCreate={(trigger) => openCreate(trigger, 'todo', null)}
              onOpenTask={openTask}
              onStartSprint={() => undefined}
              onCompleteSprint={() => undefined}
            />
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="backlog-item-main backlog-item-overlay">
                <BacklogItemContent task={activeTask} />
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      ) : null}

      {snapshot ? (
        <TaskDialog
          open={editor.open}
          task={selectedTask}
          tasks={snapshot.tasks}
          sprints={snapshot.sprints}
          initialStatus={editor.createStatus}
          initialSprintId={editor.createSprintId}
          members={snapshot.members}
          returnFocusRef={triggerRef}
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

      <SprintDialog
        open={sprintDialogOpen}
        onOpenChange={setSprintDialogOpen}
        onSave={createSprint}
      />
      <StartSprintDialog
        key={startingSprint?.id ?? 'start-sprint-closed'}
        open={startingSprint !== null}
        sprint={startingSprint}
        onOpenChange={(open) => {
          if (!open) setStartingSprintId(null);
        }}
        onSave={startSprint}
      />
      <CompleteSprintDialog
        open={completingSprint !== null}
        sprint={completingSprint}
        incompleteCount={incompleteCompletingSprintTasks}
        onOpenChange={(open) => {
          if (!open) setCompletingSprintId(null);
        }}
        onConfirm={completeSprint}
      />
      <MemberDialog
        open={memberDialogOpen}
        onOpenChange={setMemberDialogOpen}
        onSave={createMember}
      />
    </section>
  );
}
