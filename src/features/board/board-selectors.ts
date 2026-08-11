import type { Sprint } from '@/domain/sprint';
import type { Task, TaskSnapshotV2 } from '@/domain/task';

export function selectActiveSprint(
  snapshot: Pick<TaskSnapshotV2, 'sprints'>,
): Sprint | null {
  return snapshot.sprints.find((sprint) => sprint.status === 'active') ?? null;
}

export function selectActiveSprintTasks(
  snapshot: Pick<TaskSnapshotV2, 'tasks' | 'sprints'>,
): Task[] {
  const activeSprint = selectActiveSprint(snapshot);
  return activeSprint
    ? snapshot.tasks.filter((task) => task.sprintId === activeSprint.id)
    : [];
}
