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
  type TaskAction,
  updateTaskAction,
} from '@/domain/actions';
import { taskReducer } from '@/domain/task-reducer';
import {
  browserDomainDependencies,
  type CreateTaskInput,
  type DomainDependencies,
  type TaskSnapshotV1,
  type UpdateTaskInput,
} from '@/domain/task';
import { LocalTaskRepository } from '@/infrastructure/local-task-repository';
import type { TaskRepository } from '@/infrastructure/repositories';

interface TaskProviderProps extends PropsWithChildren {
  repository?: TaskRepository;
  dependencies?: DomainDependencies;
}

const EMPTY_SNAPSHOT: TaskSnapshotV1 = {
  schemaVersion: 1,
  nextTaskNumber: 1,
  tasks: [],
  members: [],
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
      .catch(() => setPersistenceFailed(true))
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

  const value = useMemo(
    () => ({
      snapshot: isReady ? snapshot : null,
      isReady,
      loadWasRecovered,
      persistenceFailed,
      createTask: create,
      updateTask: update,
      deleteTask: remove,
    }),
    [
      create,
      isReady,
      loadWasRecovered,
      persistenceFailed,
      remove,
      snapshot,
      update,
    ],
  );

  return <TaskContext value={value}>{children}</TaskContext>;
}
