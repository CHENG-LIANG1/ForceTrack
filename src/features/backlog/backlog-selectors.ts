import type { Sprint } from '@/domain/sprint';
import type { Task, TaskSnapshotV2 } from '@/domain/task';
import {
  selectFilteredTasks,
  type SharedTaskFilters,
} from '@/features/filters/task-selectors';

export interface BacklogSectionModel {
  sprint: Sprint | null;
  tasks: Task[];
}

export function selectPlanningSprints(
  snapshot: Pick<TaskSnapshotV2, 'sprints'>,
): Sprint[] {
  return snapshot.sprints
    .filter((sprint) => sprint.status !== 'completed')
    .sort((left, right) => {
      if (left.status === 'active' && right.status !== 'active') return -1;
      if (right.status === 'active' && left.status !== 'active') return 1;
      return left.position - right.position;
    });
}

export function selectTasksForPlanningSection(
  tasks: readonly Task[],
  sprintId: string | null,
): Task[] {
  return tasks
    .filter((task) => task.sprintId === sprintId)
    .sort(
      (left, right) =>
        left.rank - right.rank || left.id.localeCompare(right.id),
    );
}

export function selectBacklogSections(
  snapshot: Pick<TaskSnapshotV2, 'tasks' | 'sprints'>,
  filters: SharedTaskFilters = {},
): BacklogSectionModel[] {
  const visibleTasks = selectFilteredTasks(snapshot.tasks, filters);
  return [
    ...selectPlanningSprints(snapshot).map((sprint) => ({
      sprint,
      tasks: selectTasksForPlanningSection(visibleTasks, sprint.id),
    })),
    {
      sprint: null,
      tasks: selectTasksForPlanningSection(visibleTasks, null),
    },
  ];
}
