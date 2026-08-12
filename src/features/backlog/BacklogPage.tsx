import {
  closestCenter,
  DndContext,
  DragOverlay,
  KeyboardSensor,
  pointerWithin,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type Announcements,
  type CollisionDetection,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { Pencil, Plus, Search } from 'lucide-react';
import { type CSSProperties, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { useTasks } from '@/app/task-context';
import { useProjects } from '@/app/project-context';
import { projectRoutes } from '@/app/route-paths';
import { LoadingState } from '@/components/LoadingState';
import { PageHeader } from '@/components/PageHeader';
import { UserAvatar } from '@/components/UserAvatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Member } from '@/domain/member';
import type { Sprint } from '@/domain/sprint';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  taskToFields,
  type Task,
  type TaskFields,
  type TaskPriority,
  type TaskStatus,
  type TaskType,
} from '@/domain/task';
import {
  backlogSectionId,
  createBacklogKeyboardCoordinates,
  type BacklogDropEdge,
  resolveBacklogDropTarget,
  resolveBacklogMoveTarget,
} from '@/features/backlog/backlog-dnd';
import { BacklogItemQuickFields } from '@/features/backlog/BacklogItemQuickFields';
import {
  selectPlanningSprints,
  selectTasksForPlanningSection,
} from '@/features/backlog/backlog-selectors';
import { selectFilteredTasks } from '@/features/filters/task-selectors';
import { TaskDialog } from '@/features/task-editor/TaskDialog';
import { useTaskEditor } from '@/features/task-editor/useTaskEditor';
import { CompleteSprintDialog } from '@/features/backlog/CompleteSprintDialog';
import { DeleteSprintDialog } from '@/features/backlog/DeleteSprintDialog';
import { SprintDialog } from '@/features/backlog/SprintDialog';
import { StartSprintDialog } from '@/features/backlog/StartSprintDialog';
import { cn } from '@/lib/utils';

const ALL_FILTER_VALUE = '__all__';

interface BacklogSectionProps {
  title: string;
  hint: string;
  empty: string;
  tasks: readonly Task[];
  allTasks: readonly Task[];
  members: readonly Member[];
  sprint: Sprint | null;
  isDropTarget: boolean;
  rowDropTarget: { taskId: string; edge: BacklogDropEdge } | null;
  activeSprintExists: boolean;
  onCreate(trigger: HTMLElement): void;
  onOpenTask(taskId: string, trigger: HTMLElement): void;
  onQuickUpdate(
    task: Task,
    patch: Partial<Pick<TaskFields, 'status' | 'dueDate' | 'priority'>>,
  ): Promise<void>;
  onStartSprint(sprint: Sprint): void;
  onCompleteSprint(sprint: Sprint): void;
  onEditSprint(sprint: Sprint): void;
}

interface BacklogItemProps {
  task: Task;
  member: Member | null;
  dropEdge: BacklogDropEdge | null;
  onOpenTask(taskId: string, trigger: HTMLElement): void;
  onQuickUpdate(
    task: Task,
    patch: Partial<Pick<TaskFields, 'status' | 'dueDate' | 'priority'>>,
  ): Promise<void>;
}

function BacklogItemIdentity({ task }: { task: Task }) {
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
    </>
  );
}

function BacklogItemContent({
  task,
  member,
}: {
  task: Task;
  member: Member | null;
}) {
  const { t } = useTranslation();

  return (
    <>
      <BacklogItemIdentity task={task} />
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
      <UserAvatar
        member={member}
        className="backlog-assignee"
        initialsLength={1}
        fallbackLabel={t('task.unassigned')}
      />
    </>
  );
}

/** Makes the whole backlog row the editor trigger and accessible drag handle. */
function BacklogItem({
  task,
  member,
  dropEdge,
  onOpenTask,
  onQuickUpdate,
}: BacklogItemProps) {
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
    <li
      ref={setNodeRef}
      style={style}
      className={cn(
        dropEdge === 'before' && 'backlog-row-drop-before',
        dropEdge === 'after' && 'backlog-row-drop-after',
      )}
    >
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
        <BacklogItemIdentity task={task} />
        {task.storyPoints !== null ? (
          <span className="story-points" title={t('task.fields.storyPoints')}>
            {task.storyPoints}
          </span>
        ) : (
          <span aria-hidden="true" />
        )}
        <UserAvatar
          member={member}
          className="backlog-assignee"
          initialsLength={1}
          fallbackLabel={t('task.unassigned')}
        />
      </Button>
      <BacklogItemQuickFields
        task={task}
        onUpdate={(patch) => onQuickUpdate(task, patch)}
      />
    </li>
  );
}

function BacklogSection({
  title,
  hint,
  empty,
  tasks,
  allTasks,
  members,
  sprint,
  isDropTarget,
  rowDropTarget,
  activeSprintExists,
  onCreate,
  onOpenTask,
  onQuickUpdate,
  onStartSprint,
  onCompleteSprint,
  onEditSprint,
}: BacklogSectionProps) {
  const { t } = useTranslation();
  const sprintId = sprint?.id ?? null;
  const { setNodeRef } = useDroppable({
    id: backlogSectionId(sprintId),
    data: { type: 'backlog-section', sprintId },
  });
  const storyPoints = allTasks.reduce(
    (total, task) => total + (task.storyPoints ?? 0),
    0,
  );
  const assignees = members.filter((member) =>
    allTasks.some((task) => task.assigneeId === member.id),
  );
  const sprintSchedule = sprint
    ? sprint.startDate && sprint.endDate
      ? t('backlog.schedule.range', {
          start: sprint.startDate,
          end: sprint.endDate,
        })
      : sprint.startDate
        ? t('backlog.schedule.starts', { date: sprint.startDate })
        : sprint.endDate
          ? t('backlog.schedule.ends', { date: sprint.endDate })
          : t('backlog.schedule.unscheduled')
    : null;

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
        <div className="backlog-section-heading">
          <h2>{title}</h2>
          {sprint ? (
            <div className="backlog-sprint-details">
              <span className={`sprint-status sprint-status-${sprint.status}`}>
                {t(`sprint.status.${sprint.status}`)}
              </span>
              <span>{sprint.goal || t('backlog.noSprintGoal')}</span>
              <span>{sprintSchedule}</span>
            </div>
          ) : (
            <p>{hint}</p>
          )}
        </div>
        <div className="backlog-section-meta">
          <span>{t('backlog.itemCount', { count: allTasks.length })}</span>
          <span>{t('backlog.pointCount', { count: storyPoints })}</span>
          {assignees.length ? (
            <span
              className="backlog-assignee-summary"
              aria-label={t('backlog.assignees')}
            >
              {assignees.slice(0, 3).map((member) => (
                <UserAvatar
                  key={member.id}
                  member={member}
                  initialsLength={1}
                />
              ))}
              {assignees.length > 3 ? (
                <small>+{assignees.length - 3}</small>
              ) : null}
            </span>
          ) : null}
          {sprint ? (
            <Button
              className="sprint-icon-button"
              variant="unstyled"
              type="button"
              aria-label={t('sprint.actions.editLabel', { name: sprint.name })}
              onClick={() => onEditSprint(sprint)}
            >
              <Pencil size={14} />
            </Button>
          ) : null}
          {sprint?.status === 'planned' ? (
            <Button
              className="sprint-lifecycle-button"
              variant="outline"
              type="button"
              disabled={activeSprintExists || allTasks.length === 0}
              title={
                activeSprintExists
                  ? t('sprint.validation.active_exists')
                  : allTasks.length === 0
                    ? t('sprint.validation.empty_sprint')
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
              <BacklogItem
                key={task.id}
                task={task}
                member={
                  members.find((member) => member.id === task.assigneeId) ??
                  null
                }
                dropEdge={
                  rowDropTarget?.taskId === task.id ? rowDropTarget.edge : null
                }
                onOpenTask={onOpenTask}
                onQuickUpdate={onQuickUpdate}
              />
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
  const navigate = useNavigate();
  const {
    snapshot,
    isReady,
    createTask,
    updateTask,
    deleteTask,
    createSprint,
    updateSprint,
    startSprint,
    completeSprint,
    deleteSprint,
    rankBacklogTask,
  } = useTasks();
  const [query, setQuery] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState(ALL_FILTER_VALUE);
  const [workTypeFilter, setWorkTypeFilter] = useState<
    TaskType | typeof ALL_FILTER_VALUE
  >(ALL_FILTER_VALUE);
  const [statusFilter, setStatusFilter] = useState<
    TaskStatus | typeof ALL_FILTER_VALUE
  >(ALL_FILTER_VALUE);
  const [priorityFilter, setPriorityFilter] = useState<
    TaskPriority | typeof ALL_FILTER_VALUE
  >(ALL_FILTER_VALUE);
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false);
  const [editingSprintId, setEditingSprintId] = useState<string | null>(null);
  const [deletingSprintId, setDeletingSprintId] = useState<string | null>(null);
  const { currentProject } = useProjects();
  const [startingSprintId, setStartingSprintId] = useState<string | null>(null);
  const [completingSprintId, setCompletingSprintId] = useState<string | null>(
    null,
  );
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [overSectionId, setOverSectionId] = useState<string | null>(null);
  const [rowDropTarget, setRowDropTarget] = useState<{
    taskId: string;
    edge: BacklogDropEdge;
  } | null>(null);
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
  const collisionDetection = useMemo<CollisionDetection>(() => {
    const taskIds = new Set(snapshot?.tasks.map((task) => task.id) ?? []);
    return (args) => {
      const pointerCollisions = pointerWithin(args);
      // The sortable source can remain under the pointer while translated; ignore it so
      // the destination section or sibling row owns the final drop target.
      const rowCollisions = pointerCollisions.filter(
        ({ id }) =>
          taskIds.has(String(id)) && String(id) !== String(args.active.id),
      );
      if (rowCollisions.length > 0) return rowCollisions;
      return pointerCollisions.length > 0
        ? pointerCollisions
        : closestCenter(args);
    };
  }, [snapshot?.tasks]);
  const { editor, setEditor, triggerRef, openCreate, openTask } =
    useTaskEditor();
  const selectedTask =
    snapshot?.tasks.find((task) => task.id === editor.taskId) ?? null;
  const matchingTasks = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase();
    if (!snapshot) return [];
    return selectFilteredTasks(snapshot.tasks, {
      query: normalized,
      assigneeIds:
        assigneeFilter === ALL_FILTER_VALUE ? undefined : [assigneeFilter],
      workTypes:
        workTypeFilter === ALL_FILTER_VALUE ? undefined : [workTypeFilter],
      statuses: statusFilter === ALL_FILTER_VALUE ? undefined : [statusFilter],
      priorities:
        priorityFilter === ALL_FILTER_VALUE ? undefined : [priorityFilter],
    });
  }, [
    assigneeFilter,
    priorityFilter,
    query,
    snapshot,
    statusFilter,
    workTypeFilter,
  ]);
  const backlogTasks = selectTasksForPlanningSection(matchingTasks, null);
  const hasActiveFilters = Boolean(
    query.trim() ||
    assigneeFilter !== ALL_FILTER_VALUE ||
    workTypeFilter !== ALL_FILTER_VALUE ||
    statusFilter !== ALL_FILTER_VALUE ||
    priorityFilter !== ALL_FILTER_VALUE,
  );
  const activeTask =
    snapshot?.tasks.find((task) => task.id === activeTaskId) ?? null;
  const activeSprintExists =
    snapshot?.sprints.some((sprint) => sprint.status === 'active') ?? false;
  const startingSprint =
    snapshot?.sprints.find((sprint) => sprint.id === startingSprintId) ?? null;
  const completingSprint =
    snapshot?.sprints.find((sprint) => sprint.id === completingSprintId) ??
    null;
  const editingSprint =
    snapshot?.sprints.find((sprint) => sprint.id === editingSprintId) ?? null;
  const deletingSprint =
    snapshot?.sprints.find((sprint) => sprint.id === deletingSprintId) ?? null;
  const deleteTargetSprint = deletingSprint
    ? (snapshot?.sprints
        .filter(
          (sprint) =>
            sprint.status === 'planned' &&
            sprint.position > deletingSprint.position,
        )
        .sort((left, right) => left.position - right.position)[0] ?? null)
    : null;
  const plannedSprints =
    snapshot?.sprints.filter((sprint) => sprint.status === 'planned') ?? [];
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
    setRowDropTarget(null);
  };

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveTaskId(String(active.id));
  };

  const dropEdgeForEvent = ({
    active,
    delta,
    over,
  }: DragOverEvent | DragEndEvent) => {
    if (!over) return 'before' as const;
    const activeRect = active.rect.current.translated;
    const initialRect = active.rect.current.initial;
    const activeCenter = activeRect
      ? activeRect.top + activeRect.height / 2
      : initialRect
        ? initialRect.top + delta.y + initialRect.height / 2
        : over.rect.top + over.rect.height / 2;
    return activeCenter > over.rect.top + over.rect.height / 2
      ? ('after' as const)
      : ('before' as const);
  };

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;
    const target = resolveTarget(over ? String(over.id) : null);
    const overTask = snapshot?.tasks.find(
      (task) => task.id === String(over?.id),
    );
    if (overTask) {
      setOverSectionId(null);
      setRowDropTarget({
        taskId: overTask.id,
        edge: dropEdgeForEvent(event),
      });
      return;
    }
    setRowDropTarget(null);
    setOverSectionId(target ? backlogSectionId(target.sprintId) : null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!snapshot || !over) {
      resetDragState();
      return;
    }
    const task = snapshot.tasks.find(
      (candidate) => candidate.id === String(active.id),
    );
    if (!task) {
      resetDragState();
      return;
    }
    const target = resolveBacklogMoveTarget(
      snapshot.tasks,
      task.id,
      String(over.id),
      snapshot.tasks.some((candidate) => candidate.id === String(over.id))
        ? dropEdgeForEvent(event)
        : 'before',
    );
    resetDragState();
    if (!target) return;
    if (task.sprintId === target.sprintId && task.rank === target.toIndex) {
      return;
    }
    void rankBacklogTask(task.id, target.sprintId, target.toIndex);
  };

  const handleQuickUpdate = (
    task: Task,
    patch: Partial<Pick<TaskFields, 'status' | 'dueDate' | 'priority'>>,
  ) => updateTask(task.id, { ...taskToFields(task), ...patch });

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
      <PageHeader
        onboardingTarget="page-backlog"
        section={t('nav.backlog')}
        titleId="backlog-title"
        title={t('backlog.title')}
        description={t('backlog.description')}
        actions={
          <>
            <Button
              variant="outline"
              size="page"
              disabled={!isReady}
              onClick={() => setSprintDialogOpen(true)}
            >
              <Plus size={14} aria-hidden="true" />
              {t('sprint.actions.create')}
            </Button>
            <Button
              size="page"
              disabled={!isReady}
              onClick={(event) => openCreate(event.currentTarget, 'todo', null)}
            >
              <Plus size={14} aria-hidden="true" />
              {t('task.actions.create')}
            </Button>
          </>
        }
      />

      {!snapshot ? (
        <LoadingState label={t('task.list.loading')} />
      ) : (
        <div className="backlog-filter-bar">
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
          <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
            <SelectTrigger aria-label={t('task.fields.assignee')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>
                {t('backlog.filters.allAssignees')}
              </SelectItem>
              <SelectItem value="unassigned">{t('task.unassigned')}</SelectItem>
              {snapshot?.members.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={workTypeFilter}
            onValueChange={(value) =>
              setWorkTypeFilter(value as TaskType | typeof ALL_FILTER_VALUE)
            }
          >
            <SelectTrigger aria-label={t('task.fields.workType')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>
                {t('backlog.filters.allTypes')}
              </SelectItem>
              {TASK_TYPES.map((type) => (
                <SelectItem key={type} value={type}>
                  {t(`task.workType.${type}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={statusFilter}
            onValueChange={(value) =>
              setStatusFilter(value as TaskStatus | typeof ALL_FILTER_VALUE)
            }
          >
            <SelectTrigger aria-label={t('task.fields.status')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>
                {t('backlog.filters.allStatuses')}
              </SelectItem>
              {TASK_STATUSES.map((status) => (
                <SelectItem key={status} value={status}>
                  {t(`task.status.${status}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={priorityFilter}
            onValueChange={(value) =>
              setPriorityFilter(value as TaskPriority | typeof ALL_FILTER_VALUE)
            }
          >
            <SelectTrigger aria-label={t('task.fields.priority')}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_FILTER_VALUE}>
                {t('backlog.filters.allPriorities')}
              </SelectItem>
              {TASK_PRIORITIES.map((priority) => (
                <SelectItem key={priority} value={priority}>
                  {t(`task.priority.${priority}`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {snapshot && hasActiveFilters && matchingTasks.length === 0 ? (
        <p className="filter-empty-state" role="status">
          {t('backlog.noFilterResults')}
        </p>
      ) : null}

      {snapshot ? (
        <DndContext
          sensors={sensors}
          collisionDetection={collisionDetection}
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
                allTasks={selectTasksForPlanningSection(
                  snapshot.tasks,
                  sprint.id,
                )}
                members={snapshot.members}
                sprint={sprint}
                isDropTarget={
                  activeTaskId !== null &&
                  overSectionId === backlogSectionId(sprint.id)
                }
                rowDropTarget={rowDropTarget}
                activeSprintExists={activeSprintExists}
                onCreate={(trigger) => openCreate(trigger, 'todo', sprint.id)}
                onOpenTask={openTask}
                onQuickUpdate={handleQuickUpdate}
                onStartSprint={(target) => setStartingSprintId(target.id)}
                onCompleteSprint={(target) => setCompletingSprintId(target.id)}
                onEditSprint={(target) => setEditingSprintId(target.id)}
              />
            ))}
            <BacklogSection
              title={t('backlog.backlog')}
              hint={t('backlog.backlogHint')}
              empty={t('backlog.emptyBacklog')}
              tasks={backlogTasks}
              allTasks={selectTasksForPlanningSection(snapshot.tasks, null)}
              members={snapshot.members}
              sprint={null}
              isDropTarget={
                activeTaskId !== null &&
                overSectionId === backlogSectionId(null)
              }
              rowDropTarget={rowDropTarget}
              activeSprintExists={activeSprintExists}
              onCreate={(trigger) => openCreate(trigger, 'todo', null)}
              onOpenTask={openTask}
              onQuickUpdate={handleQuickUpdate}
              onStartSprint={() => undefined}
              onCompleteSprint={() => undefined}
              onEditSprint={() => undefined}
            />
          </div>

          <DragOverlay>
            {activeTask ? (
              <div className="backlog-item-main backlog-item-overlay">
                <BacklogItemContent
                  task={activeTask}
                  member={
                    snapshot.members.find(
                      (member) => member.id === activeTask.assigneeId,
                    ) ?? null
                  }
                />
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
        key="create-sprint"
        open={sprintDialogOpen}
        onOpenChange={setSprintDialogOpen}
        onSave={createSprint}
      />
      <SprintDialog
        key={editingSprint?.id ?? 'edit-sprint-closed'}
        open={editingSprint !== null}
        sprint={editingSprint}
        onOpenChange={(open) => {
          if (!open) setEditingSprintId(null);
        }}
        onSave={(fields) =>
          editingSprint
            ? updateSprint(editingSprint.id, fields)
            : Promise.resolve()
        }
        onDelete={
          editingSprint?.status === 'planned'
            ? (sprint) => setDeletingSprintId(sprint.id)
            : undefined
        }
      />
      <StartSprintDialog
        key={startingSprint?.id ?? 'start-sprint-closed'}
        open={startingSprint !== null}
        sprint={startingSprint}
        onOpenChange={(open) => {
          if (!open) setStartingSprintId(null);
        }}
        onSave={async (sprintId, fields) => {
          await startSprint(sprintId, fields);
          if (currentProject) navigate(projectRoutes.board(currentProject.id));
        }}
      />
      <CompleteSprintDialog
        key={completingSprint?.id ?? 'complete-sprint-closed'}
        open={completingSprint !== null}
        sprint={completingSprint}
        plannedSprints={plannedSprints}
        incompleteCount={incompleteCompletingSprintTasks}
        onOpenChange={(open) => {
          if (!open) setCompletingSprintId(null);
        }}
        onConfirm={completeSprint}
      />
      <DeleteSprintDialog
        key={deletingSprint?.id ?? 'delete-sprint-closed'}
        open={deletingSprint !== null}
        sprint={deletingSprint}
        targetSprint={deleteTargetSprint}
        onOpenChange={(open) => {
          if (!open) setDeletingSprintId(null);
        }}
        onConfirm={deleteSprint}
      />
    </section>
  );
}
