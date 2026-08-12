import {
  type PropsWithChildren,
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';

import { TaskContext } from '@/app/task-context';
import {
  createTaskAction,
  completeSprintAction,
  createMemberAction,
  createSprintAction,
  deleteSprintAction,
  moveTaskAction,
  rankBacklogTaskAction,
  startSprintAction,
  type TaskAction,
  updateSprintAction,
  updateTaskAction,
} from '@/domain/actions';
import { taskReducer } from '@/domain/task-reducer';
import {
  browserDomainDependencies,
  type CreateTaskInput,
  type DomainDependencies,
  type TaskStatus,
  type TaskSnapshotV2,
  type UpdateTaskInput,
} from '@/domain/task';
import type { MemberFields } from '@/domain/member';
import type { SprintFields, SprintStartFields } from '@/domain/sprint';
import { LocalTaskRepository } from '@/infrastructure/local-task-repository';
import type { TaskRepository } from '@/infrastructure/repositories';
import { createBrowserSeedSnapshot } from '@/infrastructure/seed-data';

interface TaskProviderProps extends PropsWithChildren {
  repository?: TaskRepository;
  dependencies?: DomainDependencies;
}

const EMPTY_SNAPSHOT: TaskSnapshotV2 = {
  schemaVersion: 2,
  nextTaskNumber: 1,
  tasks: [],
  members: [],
  sprints: [],
};

/** Owns the single task snapshot and serializes every mutation through its repository. */
export function TaskProvider({
  children,
  repository,
  dependencies = browserDomainDependencies,
}: TaskProviderProps) {
  const taskRepository = useMemo(
    () => repository ?? new LocalTaskRepository(),
    [repository],
  );
  const [snapshot, dispatch] = useReducer(taskReducer, EMPTY_SNAPSHOT);
  const snapshotRef = useRef(snapshot);
  const saveQueueRef = useRef(Promise.resolve());
  const loadStartedRef = useRef(false);
  const [isReady, setIsReady] = useState(false);
  const [loadWasRecovered, setLoadWasRecovered] = useState(false);
  const [persistenceFailed, setPersistenceFailed] = useState(false);

  useEffect(() => {
    if (loadStartedRef.current) return;
    loadStartedRef.current = true;

    void taskRepository
      .load()
      .then((result) => {
        snapshotRef.current = result.snapshot;
        dispatch({ type: 'hydrate', payload: result.snapshot });
        setLoadWasRecovered(result.kind === 'recovered');
      })
      .catch(() => {
        // Storage access can fail independently of parsing; keep the full app usable in memory.
        const fallbackSnapshot = createBrowserSeedSnapshot();
        snapshotRef.current = fallbackSnapshot;
        dispatch({ type: 'hydrate', payload: fallbackSnapshot });
        setPersistenceFailed(true);
      })
      .finally(() => setIsReady(true));
  }, [taskRepository]);

  const commit = useCallback(
    async (action: TaskAction) => {
      const nextSnapshot = taskReducer(snapshotRef.current, action);
      snapshotRef.current = nextSnapshot;
      dispatch(action);

      const save = saveQueueRef.current
        .catch(() => undefined)
        .then(() => taskRepository.save(nextSnapshot));
      saveQueueRef.current = save;

      try {
        await save;
        setPersistenceFailed(false);
      } catch {
        setPersistenceFailed(true);
      }
    },
    [taskRepository],
  );

  const create = useCallback(
    async (input: CreateTaskInput) => {
      await commit(createTaskAction(snapshotRef.current, input, dependencies));
    },
    [commit, dependencies],
  );

  const update = useCallback(
    async (taskId: string, input: UpdateTaskInput) => {
      const action = updateTaskAction(
        snapshotRef.current,
        taskId,
        input,
        dependencies,
      );
      if (action) await commit(action);
    },
    [commit, dependencies],
  );

  const remove = useCallback(
    async (taskId: string) => {
      await commit({ type: 'task/deleted', payload: { taskId } });
    },
    [commit],
  );

  const move = useCallback(
    async (taskId: string, toStatus: TaskStatus, toIndex: number) => {
      await commit(moveTaskAction(taskId, toStatus, toIndex, dependencies));
    },
    [commit, dependencies],
  );

  const createSprint = useCallback(
    async (fields: SprintFields) => {
      await commit(
        createSprintAction(snapshotRef.current, fields, dependencies),
      );
    },
    [commit, dependencies],
  );

  const updateSprint = useCallback(
    async (sprintId: string, fields: SprintFields) => {
      const action = updateSprintAction(snapshotRef.current, sprintId, fields);
      if (action) await commit(action);
    },
    [commit],
  );

  const startSprint = useCallback(
    async (sprintId: string, fields: SprintStartFields) => {
      const action = startSprintAction(
        snapshotRef.current,
        sprintId,
        fields,
        dependencies,
      );
      if (action) await commit(action);
    },
    [commit, dependencies],
  );

  const completeSprint = useCallback(
    async (sprintId: string, targetSprintId: string | null = null) => {
      const action = completeSprintAction(
        snapshotRef.current,
        sprintId,
        targetSprintId,
        dependencies,
      );
      if (action) await commit(action);
    },
    [commit, dependencies],
  );

  const deleteSprint = useCallback(
    async (sprintId: string, targetSprintId?: string | null) => {
      const action = deleteSprintAction(
        snapshotRef.current,
        sprintId,
        targetSprintId,
      );
      if (action) await commit(action);
    },
    [commit],
  );

  const createMember = useCallback(
    async (fields: MemberFields) => {
      await commit(
        createMemberAction(snapshotRef.current, fields, dependencies),
      );
    },
    [commit, dependencies],
  );

  const rankBacklogTask = useCallback(
    async (taskId: string, sprintId: string | null, toIndex: number) => {
      await commit(
        rankBacklogTaskAction(taskId, sprintId, toIndex, dependencies),
      );
    },
    [commit, dependencies],
  );

  const value = useMemo(
    () => ({
      snapshot: isReady ? snapshot : null,
      isReady,
      loadWasRecovered,
      persistenceFailed,
      createTask: create,
      updateTask: update,
      deleteTask: remove,
      moveTask: move,
      createSprint,
      updateSprint,
      startSprint,
      completeSprint,
      deleteSprint,
      createMember,
      rankBacklogTask,
    }),
    [
      create,
      createMember,
      createSprint,
      deleteSprint,
      completeSprint,
      isReady,
      loadWasRecovered,
      move,
      rankBacklogTask,
      persistenceFailed,
      remove,
      snapshot,
      startSprint,
      update,
      updateSprint,
    ],
  );

  return <TaskContext value={value}>{children}</TaskContext>;
}
