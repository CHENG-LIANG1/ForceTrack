import {
  createTaskAction,
  completeSprintAction,
  createMemberAction,
  createSprintAction,
  deleteSprintAction,
  rankBacklogTaskAction,
  startSprintAction,
  updateSprintAction,
  moveTaskAction,
  updateTaskAction,
} from '@/domain/actions';
import {
  LATER_NOW,
  makeDependencies,
  makeSnapshot,
  makeTaskFields,
} from '@/test/fixtures';
import { MemberValidationError } from '@/domain/member';
import { SprintLifecycleError } from '@/domain/sprint';

describe('task action commands', () => {
  it('creates a complete action with injected ID and time', () => {
    const action = createTaskAction(
      makeSnapshot(),
      makeTaskFields({ title: 'Created by command' }),
      makeDependencies(['task-3'], LATER_NOW),
    );

    expect(action).toMatchObject({
      type: 'task/created',
      payload: {
        id: 'task-3',
        key: 'FT-3',
        title: 'Created by command',
        updatedAt: LATER_NOW,
      },
    });
  });

  it('creates deterministic Sprint, backlog-rank, and member actions', () => {
    const snapshot = makeSnapshot();
    expect(
      createSprintAction(
        snapshot,
        { name: 'Sprint 2', goal: '', startDate: null, endDate: null },
        makeDependencies(['sprint-2']),
      ),
    ).toMatchObject({
      type: 'sprint/created',
      payload: { id: 'sprint-2', position: 1, status: 'planned' },
    });
    expect(
      rankBacklogTaskAction('task-1', null, 0, { now: () => LATER_NOW }),
    ).toEqual({
      type: 'backlog/task-ranked',
      payload: {
        taskId: 'task-1',
        sprintId: null,
        toIndex: 0,
        updatedAt: LATER_NOW,
      },
    });
    expect(
      createMemberAction(
        snapshot,
        { name: 'Grace', email: 'GRACE@example.com' },
        makeDependencies(['member-grace']),
      ),
    ).toMatchObject({
      type: 'member/created',
      payload: {
        id: 'member-grace',
        email: 'grace@example.com',
        createdAt: expect.any(String),
      },
    });
  });

  it('rejects invalid member and sprint lifecycle commands before reducer dispatch', () => {
    const snapshot = makeSnapshot();
    expect(() =>
      createMemberAction(
        snapshot,
        { name: 'Duplicate', email: 'ADA@EXAMPLE.COM' },
        makeDependencies(),
      ),
    ).toThrow(MemberValidationError);

    const planned = {
      ...snapshot.sprints[0],
      id: 'sprint-2',
      status: 'planned' as const,
      position: 1,
      startDate: null,
      endDate: null,
      startedAt: null,
    };
    const withEmptyPlanned = makeSnapshot({
      sprints: [snapshot.sprints[0], planned],
    });
    expect(() =>
      startSprintAction(
        withEmptyPlanned,
        planned.id,
        {
          name: planned.name,
          goal: planned.goal,
          startDate: '2026-08-12',
          endDate: '2026-08-25',
        },
        makeDependencies(),
      ),
    ).toThrowError(new SprintLifecycleError('active_exists'));
    expect(() =>
      completeSprintAction(
        snapshot,
        snapshot.sprints[0].id,
        'missing',
        makeDependencies(),
      ),
    ).toThrowError(new SprintLifecycleError('invalid_target'));
  });

  it('defaults planned-sprint deletion to the next future sprint', () => {
    const active = makeSnapshot().sprints[0];
    const first = {
      ...active,
      id: 'planned-1',
      status: 'planned' as const,
      position: 1,
      startedAt: null,
      startDate: null,
      endDate: null,
    };
    const second = { ...first, id: 'planned-2', position: 2 };
    expect(
      deleteSprintAction(
        makeSnapshot({ sprints: [active, first, second] }),
        first.id,
      ),
    ).toEqual({
      type: 'sprint/deleted',
      payload: { sprintId: first.id, taskTargetSprintId: second.id },
    });
  });

  it('allows editing planned and active sprints but rejects completed edits and deletes', () => {
    const snapshot = makeSnapshot();
    expect(
      updateSprintAction(snapshot, snapshot.sprints[0].id, {
        name: 'Renamed active sprint',
        goal: 'Updated goal',
        startDate: '2026-08-08',
        endDate: '2026-08-22',
      }),
    ).toMatchObject({
      type: 'sprint/updated',
      payload: { name: 'Renamed active sprint', status: 'active' },
    });
    expect(() => deleteSprintAction(snapshot, snapshot.sprints[0].id)).toThrow(
      SprintLifecycleError,
    );

    const completed = {
      ...snapshot.sprints[0],
      status: 'completed' as const,
      completedAt: LATER_NOW,
    };
    const completedSnapshot = makeSnapshot({ sprints: [completed] });
    expect(() =>
      updateSprintAction(completedSnapshot, completed.id, {
        name: 'Forbidden',
        goal: '',
        startDate: completed.startDate,
        endDate: completed.endDate,
      }),
    ).toThrow(SprintLifecycleError);
    expect(() => deleteSprintAction(completedSnapshot, completed.id)).toThrow(
      SprintLifecycleError,
    );
  });

  it('creates an update action for an existing task', () => {
    const action = updateTaskAction(
      makeSnapshot(),
      'task-1',
      makeTaskFields({ title: 'Updated by command' }),
      { now: () => LATER_NOW },
    );

    expect(action).toMatchObject({
      type: 'task/updated',
      payload: {
        id: 'task-1',
        title: 'Updated by command',
        updatedAt: LATER_NOW,
      },
    });
  });

  it('returns null instead of inventing an update for a missing task', () => {
    expect(
      updateTaskAction(
        makeSnapshot(),
        'missing',
        makeTaskFields(),
        makeDependencies(),
      ),
    ).toBeNull();
  });

  it('injects the move time into the reducer payload', () => {
    expect(
      moveTaskAction('task-1', 'done', 0, { now: () => LATER_NOW }),
    ).toEqual({
      type: 'task/moved',
      payload: {
        taskId: 'task-1',
        toStatus: 'done',
        toIndex: 0,
        updatedAt: LATER_NOW,
      },
    });
  });
});
