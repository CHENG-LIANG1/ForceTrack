import {
  createTaskAction,
  moveTaskAction,
  updateTaskAction,
} from '@/domain/actions';
import {
  LATER_NOW,
  makeDependencies,
  makeSnapshot,
  makeTaskFields,
} from '@/test/fixtures';

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
