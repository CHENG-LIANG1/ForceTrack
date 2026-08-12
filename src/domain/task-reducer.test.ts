import { taskReducer } from '@/domain/task-reducer';
import { startSprint, type Sprint } from '@/domain/sprint';
import type { Task, TaskSnapshotV2, TaskStatus } from '@/domain/task';
import { FIXED_NOW, LATER_NOW, makeSnapshot, makeTask } from '@/test/fixtures';

function positions(
  snapshot: TaskSnapshotV2,
  status: TaskStatus,
): Array<[string, number]> {
  return snapshot.tasks
    .filter((task) => task.status === status)
    .sort((left, right) => left.position - right.position)
    .map((task) => [task.id, task.position]);
}

function expectSnapshotInvariants(snapshot: TaskSnapshotV2): void {
  expect(new Set(snapshot.tasks.map((task) => task.id)).size).toBe(
    snapshot.tasks.length,
  );
  for (const status of ['todo', 'in_progress', 'in_review', 'done'] as const) {
    expect(positions(snapshot, status).map(([, position]) => position)).toEqual(
      positions(snapshot, status).map((_, index) => index),
    );
  }
  for (const sprintId of new Set(snapshot.tasks.map((task) => task.sprintId))) {
    const ranks = snapshot.tasks
      .filter((task) => task.sprintId === sprintId)
      .sort((left, right) => left.rank - right.rank)
      .map((task) => task.rank);
    expect(ranks).toEqual(ranks.map((_, index) => index));
  }
}

const mixedTasks: Task[] = [
  makeTask({ id: 'todo-a', key: 'FT-1', status: 'todo', position: 0, rank: 0 }),
  makeTask({ id: 'todo-b', key: 'FT-2', status: 'todo', position: 1, rank: 1 }),
  makeTask({ id: 'todo-c', key: 'FT-3', status: 'todo', position: 2, rank: 2 }),
  makeTask({
    id: 'review-a',
    key: 'FT-4',
    status: 'in_review',
    position: 0,
    rank: 3,
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
      rank: 2,
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

  it('starts a planned sprint and completes it by returning unfinished work to backlog', () => {
    const planned: Sprint = {
      id: 'sprint-2',
      name: 'Sprint 2',
      goal: '',
      startDate: null,
      endDate: null,
      status: 'planned',
      position: 0,
      createdAt: FIXED_NOW,
      startedAt: null,
      completedAt: null,
    };
    const state = makeSnapshot({
      sprints: [planned],
      tasks: [
        makeTask({ id: 'open', sprintId: planned.id, status: 'todo' }),
        makeTask({
          id: 'done',
          key: 'FT-2',
          sprintId: planned.id,
          status: 'done',
          rank: 1,
        }),
      ],
    });
    const startedSprint = startSprint(
      planned,
      {
        name: planned.name,
        goal: planned.goal,
        startDate: '2026-08-12',
        endDate: '2026-08-25',
      },
      state.sprints,
      2,
      FIXED_NOW,
    );
    const started = taskReducer(state, {
      type: 'sprint/started',
      payload: { sprintId: planned.id, sprint: startedSprint },
    });
    expect(started.sprints[0]).toMatchObject({
      status: 'active',
      startDate: '2026-08-12',
      endDate: '2026-08-25',
    });

    const completed = taskReducer(started, {
      type: 'sprint/completed',
      payload: {
        sprintId: planned.id,
        completedAt: LATER_NOW,
        incompleteTargetSprintId: null,
      },
    });
    expect(completed.sprints[0].status).toBe('completed');
    expect(completed.tasks.find((task) => task.id === 'open')?.sprintId).toBe(
      null,
    );
    expect(completed.tasks.find((task) => task.id === 'done')?.sprintId).toBe(
      planned.id,
    );
    expect(completed.sprints[0].completedAt).toBe(LATER_NOW);
    expectSnapshotInvariants(completed);
  });

  it('reorders within a planning section and moves across sections without changing status', () => {
    const planned = {
      ...makeSnapshot().sprints[0],
      id: 'sprint-2',
      status: 'planned' as const,
      position: 1,
      startedAt: null,
      completedAt: null,
    };
    const tasks = [
      makeTask({ id: 'a', key: 'FT-1', rank: 0 }),
      makeTask({ id: 'b', key: 'FT-2', position: 1, rank: 1 }),
      makeTask({
        id: 'c',
        key: 'FT-3',
        position: 2,
        rank: 0,
        sprintId: planned.id,
      }),
    ];
    const state = makeSnapshot({
      nextTaskNumber: 4,
      tasks,
      sprints: [...makeSnapshot().sprints, planned],
    });

    const reordered = taskReducer(state, {
      type: 'backlog/task-ranked',
      payload: {
        taskId: 'b',
        sprintId: 'sprint-1',
        toIndex: 0,
        updatedAt: LATER_NOW,
      },
    });
    expect(
      reordered.tasks
        .filter((task) => task.sprintId === 'sprint-1')
        .sort((left, right) => left.rank - right.rank)
        .map((task) => task.id),
    ).toEqual(['b', 'a']);

    const moved = taskReducer(reordered, {
      type: 'backlog/task-ranked',
      payload: {
        taskId: 'a',
        sprintId: planned.id,
        toIndex: 1,
        updatedAt: LATER_NOW,
      },
    });
    expect(moved.tasks.find((task) => task.id === 'a')).toMatchObject({
      sprintId: planned.id,
      rank: 1,
      status: 'todo',
    });
    expectSnapshotInvariants(moved);
  });

  it('completes a sprint atomically into a planned target and keeps done work behind', () => {
    const active = makeSnapshot().sprints[0];
    const planned = {
      ...active,
      id: 'sprint-2',
      status: 'planned' as const,
      position: 1,
      startDate: null,
      endDate: null,
      startedAt: null,
    };
    const state = makeSnapshot({
      nextTaskNumber: 4,
      sprints: [active, planned],
      tasks: [
        makeTask({ id: 'open', key: 'FT-1', rank: 0 }),
        makeTask({ id: 'done', key: 'FT-2', status: 'done', rank: 1 }),
        makeTask({
          id: 'target',
          key: 'FT-3',
          sprintId: planned.id,
          position: 1,
          rank: 0,
        }),
      ],
    });
    const before = structuredClone(state);
    const result = taskReducer(state, {
      type: 'sprint/completed',
      payload: {
        sprintId: active.id,
        completedAt: LATER_NOW,
        incompleteTargetSprintId: planned.id,
      },
    });

    expect(state).toEqual(before);
    expect(result.tasks.find((task) => task.id === 'done')?.sprintId).toBe(
      active.id,
    );
    expect(result.tasks.find((task) => task.id === 'open')).toMatchObject({
      sprintId: planned.id,
      rank: 1,
    });
    expectSnapshotInvariants(result);
  });

  it('deletes only a planned sprint and moves its tasks to the requested target', () => {
    const active = makeSnapshot().sprints[0];
    const planned = {
      ...active,
      id: 'planned',
      status: 'planned' as const,
      position: 1,
      startDate: null,
      endDate: null,
      startedAt: null,
    };
    const state = makeSnapshot({
      sprints: [active, planned],
      nextTaskNumber: 3,
      tasks: [
        makeTask({ id: 'active', key: 'FT-1', rank: 0 }),
        makeTask({
          id: 'planned-task',
          key: 'FT-2',
          position: 1,
          rank: 0,
          sprintId: planned.id,
        }),
      ],
    });
    const result = taskReducer(state, {
      type: 'sprint/deleted',
      payload: { sprintId: planned.id, taskTargetSprintId: null },
    });
    expect(result.sprints.map((sprint) => sprint.id)).toEqual([active.id]);
    expect(
      result.tasks.find((task) => task.id === 'planned-task'),
    ).toMatchObject({
      sprintId: null,
      rank: 0,
      status: 'todo',
    });
    expectSnapshotInvariants(result);
    expect(
      taskReducer(state, {
        type: 'sprint/deleted',
        payload: { sprintId: active.id, taskTargetSprintId: null },
      }),
    ).toBe(state);
  });
});
