import { taskReducer } from '@/domain/task-reducer';
import type { Task, TaskSnapshotV1, TaskStatus } from '@/domain/task';
import { FIXED_NOW, LATER_NOW, makeSnapshot, makeTask } from '@/test/fixtures';

function positions(
  snapshot: TaskSnapshotV1,
  status: TaskStatus,
): Array<[string, number]> {
  return snapshot.tasks
    .filter((task) => task.status === status)
    .sort((left, right) => left.position - right.position)
    .map((task) => [task.id, task.position]);
}

function expectSnapshotInvariants(snapshot: TaskSnapshotV1): void {
  expect(new Set(snapshot.tasks.map((task) => task.id)).size).toBe(
    snapshot.tasks.length,
  );
  for (const status of ['todo', 'in_progress', 'in_review', 'done'] as const) {
    expect(positions(snapshot, status).map(([, position]) => position)).toEqual(
      positions(snapshot, status).map((_, index) => index),
    );
  }
}

const mixedTasks: Task[] = [
  makeTask({ id: 'todo-a', key: 'FT-1', status: 'todo', position: 0 }),
  makeTask({ id: 'todo-b', key: 'FT-2', status: 'todo', position: 1 }),
  makeTask({ id: 'todo-c', key: 'FT-3', status: 'todo', position: 2 }),
  makeTask({
    id: 'review-a',
    key: 'FT-4',
    status: 'in_review',
    position: 0,
  }),
];

describe('taskReducer', () => {
  it('hydrates immutably, removes duplicate IDs, and normalizes positions', () => {
    const payload = makeSnapshot({
      tasks: [
        makeTask({ position: 9 }),
        makeTask({ id: 'task-2', key: 'FT-2', position: 4 }),
        makeTask({ id: 'task-1', key: 'FT-9', position: 2 }),
      ],
    });

    const result = taskReducer(makeSnapshot({ tasks: [] }), {
      type: 'hydrate',
      payload,
    });

    expect(result).not.toBe(payload);
    expect(positions(result, 'todo')).toEqual([
      ['task-2', 0],
      ['task-1', 1],
    ]);
    expectSnapshotInvariants(result);
  });

  it('creates at the requested order, advances numbering, and rejects duplicate IDs', () => {
    const state = makeSnapshot();
    const created = makeTask({
      id: 'task-3',
      key: 'FT-3',
      position: 2,
      createdAt: LATER_NOW,
      updatedAt: LATER_NOW,
    });
    const result = taskReducer(state, {
      type: 'task/created',
      payload: created,
    });

    expect(result.nextTaskNumber).toBe(4);
    expect(positions(result, 'todo')).toEqual([
      ['task-1', 0],
      ['task-2', 1],
      ['task-3', 2],
    ]);
    expect(
      taskReducer(result, { type: 'task/created', payload: created }),
    ).toBe(result);
    expectSnapshotInvariants(result);
  });

  it('updates editable data while preserving identity and column position', () => {
    const state = makeSnapshot();
    const result = taskReducer(state, {
      type: 'task/updated',
      payload: {
        ...state.tasks[0]!,
        id: 'task-1',
        key: 'FT-999',
        createdAt: LATER_NOW,
        title: 'Edited',
        position: 99,
        updatedAt: LATER_NOW,
      },
    });

    expect(result.tasks[0]).toMatchObject({
      id: 'task-1',
      key: 'FT-1',
      createdAt: FIXED_NOW,
      title: 'Edited',
      position: 0,
      updatedAt: LATER_NOW,
    });
    expectSnapshotInvariants(result);
  });

  it('moves an edited task to the end when its status changes', () => {
    const state = makeSnapshot({ nextTaskNumber: 5, tasks: mixedTasks });
    const result = taskReducer(state, {
      type: 'task/updated',
      payload: {
        ...mixedTasks[1]!,
        title: 'Moved through editor',
        status: 'in_review',
        updatedAt: LATER_NOW,
      },
    });

    expect(positions(result, 'todo')).toEqual([
      ['todo-a', 0],
      ['todo-c', 1],
    ]);
    expect(positions(result, 'in_review')).toEqual([
      ['review-a', 0],
      ['todo-b', 1],
    ]);
    expect(result.tasks.find((task) => task.id === 'todo-b')).toMatchObject({
      title: 'Moved through editor',
      updatedAt: LATER_NOW,
    });
    expectSnapshotInvariants(result);
  });

  it('deletes only the target and closes the position gap', () => {
    const state = makeSnapshot({ nextTaskNumber: 5, tasks: mixedTasks });
    const result = taskReducer(state, {
      type: 'task/deleted',
      payload: { taskId: 'todo-b' },
    });

    expect(result.tasks).toHaveLength(3);
    expect(positions(result, 'todo')).toEqual([
      ['todo-a', 0],
      ['todo-c', 1],
    ]);
    expectSnapshotInvariants(result);
  });

  it('moves across columns without losing or duplicating tasks', () => {
    const state = makeSnapshot({ nextTaskNumber: 5, tasks: mixedTasks });
    const result = taskReducer(state, {
      type: 'task/moved',
      payload: {
        taskId: 'todo-b',
        toStatus: 'in_review',
        toIndex: 0,
        updatedAt: LATER_NOW,
      },
    });

    expect(positions(result, 'todo')).toEqual([
      ['todo-a', 0],
      ['todo-c', 1],
    ]);
    expect(positions(result, 'in_review')).toEqual([
      ['todo-b', 0],
      ['review-a', 1],
    ]);
    expect(result.tasks.find((task) => task.id === 'todo-b')).toMatchObject({
      status: 'in_review',
      updatedAt: LATER_NOW,
    });
    expectSnapshotInvariants(result);
  });

  it.each([
    { label: 'first', toIndex: 0, order: ['todo-c', 'todo-a', 'todo-b'] },
    { label: 'middle', toIndex: 1, order: ['todo-a', 'todo-c', 'todo-b'] },
    { label: 'end', toIndex: 99, order: ['todo-a', 'todo-b', 'todo-c'] },
  ])('reorders to the $label position in one column', ({ toIndex, order }) => {
    const state = makeSnapshot({ nextTaskNumber: 5, tasks: mixedTasks });
    const result = taskReducer(state, {
      type: 'task/moved',
      payload: {
        taskId: 'todo-c',
        toStatus: 'todo',
        toIndex,
        updatedAt: LATER_NOW,
      },
    });

    expect(positions(result, 'todo').map(([id]) => id)).toEqual(order);
    expectSnapshotInvariants(result);
  });

  it('allows moving into an empty column and ignores unknown task IDs', () => {
    const state = makeSnapshot({
      nextTaskNumber: 4,
      tasks: mixedTasks.slice(0, 3),
    });
    const moved = taskReducer(state, {
      type: 'task/moved',
      payload: {
        taskId: 'todo-a',
        toStatus: 'done',
        toIndex: 7,
        updatedAt: LATER_NOW,
      },
    });

    expect(positions(moved, 'done')).toEqual([['todo-a', 0]]);
    expectSnapshotInvariants(moved);
    expect(
      taskReducer(moved, {
        type: 'task/moved',
        payload: {
          taskId: 'missing',
          toStatus: 'done',
          toIndex: 0,
          updatedAt: LATER_NOW,
        },
      }),
    ).toBe(moved);
  });
});
