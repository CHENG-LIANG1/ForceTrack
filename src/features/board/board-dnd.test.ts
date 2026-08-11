import {
  boardColumnId,
  orderedTasksForStatus,
  resolveBoardDropTarget,
} from '@/features/board/board-dnd';
import { taskReducer } from '@/domain/task-reducer';
import { LATER_NOW, makeSnapshot, makeTask } from '@/test/fixtures';

const tasks = [
  makeTask({ id: 'todo-a', key: 'FT-1', status: 'todo', position: 0 }),
  makeTask({ id: 'todo-b', key: 'FT-2', status: 'todo', position: 1 }),
  makeTask({
    id: 'progress-a',
    key: 'FT-3',
    status: 'in_progress',
    position: 0,
  }),
];

describe('Board drag-and-drop mapping', () => {
  it('maps a card target to its status and ordered insertion index', () => {
    expect(resolveBoardDropTarget(tasks, 'todo-b')).toEqual({
      status: 'todo',
      index: 1,
    });
    expect(resolveBoardDropTarget(tasks, 'progress-a')).toEqual({
      status: 'in_progress',
      index: 0,
    });
  });

  it('maps column targets to the end, including an empty column', () => {
    expect(resolveBoardDropTarget(tasks, boardColumnId('todo'))).toEqual({
      status: 'todo',
      index: 2,
    });
    expect(resolveBoardDropTarget(tasks, boardColumnId('done'))).toEqual({
      status: 'done',
      index: 0,
    });
    expect(resolveBoardDropTarget(tasks, 'unknown-target')).toBeNull();
  });

  it('feeds cross-column mappings into the reducer without loss or duplication', () => {
    const target = resolveBoardDropTarget(tasks, 'progress-a');
    expect(target).not.toBeNull();

    const result = taskReducer(makeSnapshot({ nextTaskNumber: 4, tasks }), {
      type: 'task/moved',
      payload: {
        taskId: 'todo-b',
        toStatus: target!.status,
        toIndex: target!.index,
        updatedAt: LATER_NOW,
      },
    });

    expect(result.tasks.map((task) => task.id).sort()).toEqual(
      tasks.map((task) => task.id).sort(),
    );
    expect(
      orderedTasksForStatus(result.tasks, 'in_progress').map((task) => task.id),
    ).toEqual(['todo-b', 'progress-a']);
    expect(orderedTasksForStatus(result.tasks, 'todo')).toEqual([
      expect.objectContaining({ id: 'todo-a', position: 0 }),
    ]);
  });
});
