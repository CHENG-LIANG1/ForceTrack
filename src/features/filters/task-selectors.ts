import type { Task, TaskPriority, TaskStatus, TaskType } from '@/domain/task';

export type AssigneeFilterValue = string | 'unassigned';

export interface SharedTaskFilters {
  query?: string;
  assigneeIds?: readonly AssigneeFilterValue[];
  workTypes?: readonly TaskType[];
  statuses?: readonly TaskStatus[];
  priorities?: readonly TaskPriority[];
  parentIds?: readonly string[];
  dateFrom?: string | null;
  dateTo?: string | null;
}

function includesOrAll<T>(values: readonly T[] | undefined, value: T): boolean {
  return !values?.length || values.includes(value);
}

function matchesAssignee(
  task: Task,
  assigneeIds: readonly AssigneeFilterValue[] | undefined,
): boolean {
  if (!assigneeIds?.length) return true;
  return task.assigneeId === null
    ? assigneeIds.includes('unassigned')
    : assigneeIds.includes(task.assigneeId);
}

function datePart(value: string): string {
  return value.slice(0, 10);
}

function matchesDateRange(
  task: Task,
  from: string | null | undefined,
  to: string | null | undefined,
): boolean {
  if (!from && !to) return true;
  const dates = [
    datePart(task.createdAt),
    datePart(task.updatedAt),
    task.dueDate,
  ];
  return dates.some(
    (date) => date !== null && (!from || date >= from) && (!to || date <= to),
  );
}

export function taskMatchesFilters(
  task: Task,
  filters: SharedTaskFilters,
): boolean {
  const query = filters.query?.trim().toLocaleLowerCase() ?? '';
  return (
    (!query ||
      task.title.toLocaleLowerCase().includes(query) ||
      task.key.toLocaleLowerCase().includes(query)) &&
    matchesAssignee(task, filters.assigneeIds) &&
    includesOrAll(filters.workTypes, task.workType) &&
    includesOrAll(filters.statuses, task.status) &&
    includesOrAll(filters.priorities, task.priority) &&
    includesOrAll(filters.parentIds, task.parentId ?? '') &&
    matchesDateRange(task, filters.dateFrom, filters.dateTo)
  );
}

/** Returns a new array and never sorts or mutates the source collection. */
export function selectFilteredTasks(
  tasks: readonly Task[],
  filters: SharedTaskFilters,
): Task[] {
  return tasks.filter((task) => taskMatchesFilters(task, filters));
}
