import { isCalendarDate, type DomainDependencies } from '@/domain/task';

export const SPRINT_STATUSES = ['planned', 'active', 'completed'] as const;
export type SprintStatus = (typeof SPRINT_STATUSES)[number];

export interface Sprint {
  id: string;
  name: string;
  goal: string;
  startDate: string | null;
  endDate: string | null;
  status: SprintStatus;
  position: number;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
}

export interface SprintFields {
  name: string;
  goal: string;
  startDate: string | null;
  endDate: string | null;
}

export type SprintStartFields = SprintFields;

export type SprintLifecycleIssue =
  | 'name_required'
  | 'name_too_long'
  | 'goal_too_long'
  | 'dates_required'
  | 'invalid_date'
  | 'invalid_range'
  | 'invalid_status'
  | 'active_exists'
  | 'empty_sprint'
  | 'invalid_target';

export class SprintLifecycleError extends Error {
  constructor(readonly issue: SprintLifecycleIssue) {
    super(`Invalid sprint lifecycle transition: ${issue}`);
    this.name = 'SprintLifecycleError';
  }
}

export function validateSprintFields(fields: SprintFields): string | null {
  if (!fields.name.trim()) return 'name_required';
  if (fields.name.trim().length > 80) return 'name_too_long';
  if (fields.goal.length > 500) return 'goal_too_long';
  if (fields.startDate && !isCalendarDate(fields.startDate)) {
    return 'invalid_date';
  }
  if (fields.endDate && !isCalendarDate(fields.endDate)) {
    return 'invalid_date';
  }
  if (fields.startDate && fields.endDate && fields.endDate < fields.startDate) {
    return 'invalid_range';
  }
  return null;
}

export function validateSprintStartFields(
  fields: SprintStartFields,
): SprintLifecycleIssue | null {
  const fieldIssue = validateSprintFields(fields);
  if (fieldIssue) return fieldIssue as SprintLifecycleIssue;
  if (!fields.startDate || !fields.endDate) return 'dates_required';
  if (!isCalendarDate(fields.startDate) || !isCalendarDate(fields.endDate)) {
    return 'invalid_date';
  }
  if (fields.endDate < fields.startDate) return 'invalid_range';
  return null;
}

export function createSprint(
  fields: SprintFields,
  dependencies: DomainDependencies,
  position = 0,
): Sprint {
  const issue = validateSprintFields(fields);
  if (issue) throw new Error(`Invalid sprint: ${issue}`);
  return {
    id: dependencies.createId(),
    name: fields.name.trim(),
    goal: fields.goal.trim(),
    startDate: fields.startDate,
    endDate: fields.endDate,
    status: 'planned',
    position,
    createdAt: dependencies.now(),
    startedAt: null,
    completedAt: null,
  };
}

export function startSprint(
  sprint: Sprint,
  fields: SprintStartFields,
  sprints: readonly Sprint[],
  taskCount = 1,
  startedAt?: string,
): Sprint {
  if (sprint.status !== 'planned') {
    throw new SprintLifecycleError('invalid_status');
  }
  if (
    sprints.some(
      (candidate) =>
        candidate.id !== sprint.id && candidate.status === 'active',
    )
  ) {
    throw new SprintLifecycleError('active_exists');
  }
  if (taskCount < 1) throw new SprintLifecycleError('empty_sprint');
  const issue = validateSprintStartFields(fields);
  if (issue) throw new SprintLifecycleError(issue);

  return {
    ...sprint,
    name: fields.name.trim(),
    goal: fields.goal.trim(),
    startDate: fields.startDate,
    endDate: fields.endDate,
    status: 'active',
    startedAt: startedAt ?? sprint.startedAt,
  };
}

export function completeSprint(sprint: Sprint, completedAt?: string): Sprint {
  if (sprint.status !== 'active') {
    throw new SprintLifecycleError('invalid_status');
  }
  return { ...sprint, status: 'completed', completedAt: completedAt ?? null };
}

export function updateSprint(sprint: Sprint, fields: SprintFields): Sprint {
  if (sprint.status === 'completed') {
    throw new SprintLifecycleError('invalid_status');
  }
  const issue = validateSprintFields(fields);
  if (issue) throw new Error(`Invalid sprint: ${issue}`);
  return {
    ...sprint,
    name: fields.name.trim(),
    goal: fields.goal.trim(),
    startDate: fields.startDate,
    endDate: fields.endDate,
  };
}
