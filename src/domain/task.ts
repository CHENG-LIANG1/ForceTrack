import type { Member, MemberV1 } from '@/domain/member';
import type { Sprint } from '@/domain/sprint';

export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'in_review',
  'done',
] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;
export const TASK_TYPES = ['task', 'story', 'bug', 'epic'] as const;
export const ACTIVE_SPRINT_ID = 'sprint-1';
export const FORCETRACK_PROJECT_KEY = 'FT';

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];
export type TaskType = (typeof TASK_TYPES)[number];

/** Exact task shape persisted by T0-T4. Kept only for V1 migration. */
export interface TaskV1 {
  id: string;
  key: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface Task extends TaskV1 {
  workType: TaskType;
  reporterId: string | null;
  parentId: string | null;
  labels: string[];
  sprintId: string | null;
  storyPoints: number | null;
  rank: number;
}

export interface TaskSnapshotV1 {
  schemaVersion: 1;
  nextTaskNumber: number;
  tasks: TaskV1[];
  members: MemberV1[];
}

export interface TaskSnapshotV2 {
  schemaVersion: 2;
  nextTaskNumber: number;
  tasks: Task[];
  members: Member[];
  sprints: Sprint[];
}

export interface TaskFields {
  title: string;
  description: string;
  workType: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  reporterId: string | null;
  parentId: string | null;
  labels: string[];
  sprintId: string | null;
  storyPoints: number | null;
  startDate: string | null;
  dueDate: string | null;
}

export type CreateTaskInput = TaskFields;
export type UpdateTaskInput = TaskFields;

export type TaskField =
  | 'title'
  | 'description'
  | 'assigneeId'
  | 'reporterId'
  | 'parentId'
  | 'labels'
  | 'sprintId'
  | 'storyPoints'
  | 'startDate'
  | 'dueDate';

export interface TaskValidationIssue {
  field: TaskField;
  code:
    | 'required'
    | 'too_long'
    | 'invalid_date'
    | 'invalid_date_range'
    | 'unknown_assignee'
    | 'unknown_reporter'
    | 'unknown_sprint'
    | 'invalid_parent'
    | 'too_many_labels'
    | 'invalid_story_points';
}

export interface DomainDependencies {
  createId: () => string;
  now: () => string;
}

export const browserDomainDependencies: DomainDependencies = {
  createId: () => globalThis.crypto.randomUUID(),
  now: () => new Date().toISOString(),
};

export class TaskValidationError extends Error {
  readonly issues: TaskValidationIssue[];

  constructor(issues: TaskValidationIssue[]) {
    super('Task data is invalid');
    this.name = 'TaskValidationError';
    this.issues = issues;
  }
}

export function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export function validateTaskFields(
  fields: TaskFields,
  members?: readonly Member[],
  tasks?: readonly Task[],
  currentTaskId?: string,
  sprints?: readonly Sprint[],
): TaskValidationIssue[] {
  const issues: TaskValidationIssue[] = [];
  const normalizedTitle = fields.title.trim();

  if (normalizedTitle.length === 0) {
    issues.push({ field: 'title', code: 'required' });
  } else if (normalizedTitle.length > 100) {
    issues.push({ field: 'title', code: 'too_long' });
  }

  if (fields.description.length > 2_000) {
    issues.push({ field: 'description', code: 'too_long' });
  }

  if (
    fields.labels.length > 10 ||
    fields.labels.some((label) => label.length === 0 || label.length > 50)
  ) {
    issues.push({ field: 'labels', code: 'too_many_labels' });
  }

  if (
    fields.storyPoints !== null &&
    (!Number.isInteger(fields.storyPoints) ||
      fields.storyPoints < 0 ||
      fields.storyPoints > 100)
  ) {
    issues.push({ field: 'storyPoints', code: 'invalid_story_points' });
  }

  if (fields.startDate !== null && !isCalendarDate(fields.startDate)) {
    issues.push({ field: 'startDate', code: 'invalid_date' });
  }
  if (fields.dueDate !== null && !isCalendarDate(fields.dueDate)) {
    issues.push({ field: 'dueDate', code: 'invalid_date' });
  }
  if (
    fields.startDate !== null &&
    fields.dueDate !== null &&
    isCalendarDate(fields.startDate) &&
    isCalendarDate(fields.dueDate) &&
    fields.dueDate < fields.startDate
  ) {
    issues.push({ field: 'dueDate', code: 'invalid_date_range' });
  }

  if (
    members !== undefined &&
    fields.assigneeId !== null &&
    !members.some((member) => member.id === fields.assigneeId)
  ) {
    issues.push({ field: 'assigneeId', code: 'unknown_assignee' });
  }

  if (
    members !== undefined &&
    fields.reporterId !== null &&
    !members.some((member) => member.id === fields.reporterId)
  ) {
    issues.push({ field: 'reporterId', code: 'unknown_reporter' });
  }

  if (fields.parentId !== null && tasks !== undefined) {
    const parent = tasks.find((task) => task.id === fields.parentId);
    if (!parent || parent.workType !== 'epic' || parent.id === currentTaskId) {
      issues.push({ field: 'parentId', code: 'invalid_parent' });
    }
  }

  if (
    sprints !== undefined &&
    fields.sprintId !== null &&
    !sprints.some(
      (sprint) =>
        sprint.id === fields.sprintId && sprint.status !== 'completed',
    )
  ) {
    issues.push({ field: 'sprintId', code: 'unknown_sprint' });
  }

  return issues;
}

function normalizedFields(fields: TaskFields): TaskFields {
  return {
    ...fields,
    title: fields.title.trim(),
    labels: [
      ...new Set(fields.labels.map((label) => label.trim()).filter(Boolean)),
    ],
    parentId: fields.workType === 'epic' ? null : fields.parentId,
  };
}

export function taskToFields(task: Task): TaskFields {
  const {
    title,
    description,
    workType,
    status,
    priority,
    assigneeId,
    reporterId,
    parentId,
    labels,
    sprintId,
    storyPoints,
    startDate,
    dueDate,
  } = task;
  return {
    title,
    description,
    workType,
    status,
    priority,
    assigneeId,
    reporterId,
    parentId,
    labels: [...labels],
    sprintId,
    storyPoints,
    startDate,
    dueDate,
  };
}

export function createTask(
  snapshot: TaskSnapshotV2,
  input: CreateTaskInput,
  dependencies: DomainDependencies = browserDomainDependencies,
  projectKey = FORCETRACK_PROJECT_KEY,
): Task {
  const issues = validateTaskFields(
    input,
    snapshot.members,
    snapshot.tasks,
    undefined,
    snapshot.sprints,
  );
  if (issues.length > 0) throw new TaskValidationError(issues);

  const timestamp = dependencies.now();
  const fields = normalizedFields(input);

  return {
    id: dependencies.createId(),
    key: `${projectKey}-${snapshot.nextTaskNumber}`,
    ...fields,
    position: snapshot.tasks.filter((task) => task.status === fields.status)
      .length,
    rank: snapshot.tasks.filter((task) => task.sprintId === fields.sprintId)
      .length,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

export function updateTask(
  currentTask: Task,
  input: UpdateTaskInput,
  members: readonly Member[],
  dependencies: Pick<DomainDependencies, 'now'> = browserDomainDependencies,
  tasks?: readonly Task[],
  sprints?: readonly Sprint[],
): Task {
  const issues = validateTaskFields(
    input,
    members,
    tasks,
    currentTask.id,
    sprints,
  );
  if (issues.length > 0) throw new TaskValidationError(issues);

  return {
    ...currentTask,
    ...normalizedFields(input),
    id: currentTask.id,
    key: currentTask.key,
    createdAt: currentTask.createdAt,
    updatedAt: dependencies.now(),
  };
}
