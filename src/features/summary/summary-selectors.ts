import type { Member } from '@/domain/member';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  type Task,
  type TaskPriority,
  type TaskSnapshotV2,
  type TaskStatus,
  type TaskType,
} from '@/domain/task';
import {
  selectFilteredTasks,
  type SharedTaskFilters,
} from '@/features/filters/task-selectors';

export type SummaryFilters = Omit<SharedTaskFilters, 'query'>;

export interface CountAndPercent {
  count: number;
  percent: number;
}

export interface SummaryData {
  tasks: Task[];
  overview: {
    created: number;
    updated: number;
    completed: number;
    dueSoon: number;
  };
  status: Record<TaskStatus, CountAndPercent>;
  priorities: Record<TaskPriority, CountAndPercent>;
  workTypes: Record<TaskType, CountAndPercent>;
  recentActivity: Task[];
  workload: Array<{
    assigneeId: string | null;
    member: Member | null;
    count: number;
  }>;
  epicProgress: Array<{
    epic: Task;
    total: number;
    byStatus: Record<TaskStatus, number>;
  }>;
}

const DAY_MS = 86_400_000;

function countAndPercent(count: number, total: number): CountAndPercent {
  return { count, percent: total === 0 ? 0 : (count / total) * 100 };
}

function localCalendarDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function inPastDays(value: string, now: Date, days: number): boolean {
  const timestamp = new Date(value).getTime();
  return (
    timestamp >= now.getTime() - days * DAY_MS && timestamp <= now.getTime()
  );
}

function countByValue<T extends string>(
  values: readonly T[],
  tasks: readonly Task[],
  valueForTask: (task: Task) => T,
): Record<T, CountAndPercent> {
  return Object.fromEntries(
    values.map((value) => {
      const count = tasks.filter((task) => valueForTask(task) === value).length;
      return [value, countAndPercent(count, tasks.length)];
    }),
  ) as Record<T, CountAndPercent>;
}

export function selectSummaryData(
  snapshot: Pick<TaskSnapshotV2, 'tasks' | 'members'>,
  filters: SummaryFilters = {},
  now: Date = new Date(),
): SummaryData {
  const tasks = selectFilteredTasks(snapshot.tasks, filters);
  const today = localCalendarDate(now);
  const dueEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7);
  const dueEndDate = localCalendarDate(dueEnd);
  const statusTasks = tasks.filter(
    (task) => task.status !== 'done' || inPastDays(task.updatedAt, now, 14),
  );
  const status = Object.fromEntries(
    TASK_STATUSES.map((value) => {
      const count = statusTasks.filter((task) => task.status === value).length;
      return [value, countAndPercent(count, statusTasks.length)];
    }),
  ) as Record<TaskStatus, CountAndPercent>;
  const incompleteTasks = tasks.filter((task) => task.status !== 'done');
  const workload: SummaryData['workload'] = snapshot.members.map((member) => ({
    assigneeId: member.id,
    member,
    count: incompleteTasks.filter((task) => task.assigneeId === member.id)
      .length,
  }));
  workload.push({
    assigneeId: null,
    member: null,
    count: incompleteTasks.filter((task) => task.assigneeId === null).length,
  });

  return {
    tasks,
    overview: {
      created: tasks.filter((task) => inPastDays(task.createdAt, now, 7))
        .length,
      updated: tasks.filter((task) => inPastDays(task.updatedAt, now, 7))
        .length,
      completed: tasks.filter(
        (task) => task.status === 'done' && inPastDays(task.updatedAt, now, 7),
      ).length,
      dueSoon: tasks.filter(
        (task) =>
          task.dueDate !== null &&
          task.dueDate >= today &&
          task.dueDate <= dueEndDate,
      ).length,
    },
    status,
    priorities: countByValue(TASK_PRIORITIES, tasks, (task) => task.priority),
    workTypes: countByValue(TASK_TYPES, tasks, (task) => task.workType),
    recentActivity: [...tasks]
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
      .slice(0, 6),
    workload,
    epicProgress: tasks
      .filter((task) => task.workType === 'epic')
      .map((epic) => {
        const children = tasks.filter((task) => task.parentId === epic.id);
        return {
          epic,
          total: children.length,
          byStatus: Object.fromEntries(
            TASK_STATUSES.map((status) => [
              status,
              children.filter((task) => task.status === status).length,
            ]),
          ) as Record<TaskStatus, number>,
        };
      }),
  };
}
