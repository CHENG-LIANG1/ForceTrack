import type { Member } from '@/domain/member';

export const TASK_STATUSES = [
  'todo',
  'in_progress',
  'in_review',
  'done',
] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high'] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
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

export interface TaskSnapshotV1 {
  schemaVersion: 1;
  nextTaskNumber: number;
  tasks: Task[];
  members: Member[];
}

export interface TaskFields {
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  assigneeId: string | null;
  startDate: string | null;
  dueDate: string | null;
}

export type CreateTaskInput = TaskFields;
export type UpdateTaskInput = TaskFields;

export type TaskField =
  'title' | 'description' | 'assigneeId' | 'startDate' | 'dueDate';

export interface TaskValidationIssue {
  field: TaskField;
  code:
    | 'required'
    | 'too_long'
    | 'invalid_date'
    | 'invalid_date_range'
    | 'unknown_assignee';
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

  return issues;
}

function normalizedFields(fields: TaskFields): TaskFields {
  return { ...fields, title: fields.title.trim() };
}

export function createTask(
  snapshot: TaskSnapshotV1,
  input: CreateTaskInput,
  dependencies: DomainDependencies = browserDomainDependencies,
): Task {
  const issues = validateTaskFields(input, snapshot.members);
  if (issues.length > 0) throw new TaskValidationError(issues);

  const timestamp = dependencies.now();
  const fields = normalizedFields(input);

  return {
    id: dependencies.createId(),
    key: `FT-${snapshot.nextTaskNumber}`,
    ...fields,
    position: snapshot.tasks.filter((task) => task.status === fields.status)
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
): Task {
  const issues = validateTaskFields(input, members);
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
