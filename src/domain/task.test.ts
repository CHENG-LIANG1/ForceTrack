import {
  TaskValidationError,
  createTask,
  isCalendarDate,
  updateTask,
  validateTaskFields,
} from '@/domain/task';
import {
  FIXED_NOW,
  LATER_NOW,
  makeDependencies,
  makeSnapshot,
  makeTask,
  makeTaskFields,
  testMembers,
} from '@/test/fixtures';

describe('task domain', () => {
  it('recognizes real calendar dates instead of only matching the format', () => {
    expect(isCalendarDate('2024-02-29')).toBe(true);
    expect(isCalendarDate('2025-02-29')).toBe(false);
    expect(isCalendarDate('2026-13-01')).toBe(false);
    expect(isCalendarDate('08/11/2026')).toBe(false);
  });

  it('creates a task with an injected ID, time, sequential key, and column position', () => {
    const task = createTask(
      makeSnapshot(),
      makeTaskFields({ title: '  Ship Task 1  ', assigneeId: 'member-1' }),
      makeDependencies(['task-3']),
    );

    expect(task).toMatchObject({
      id: 'task-3',
      key: 'FT-3',
      title: 'Ship Task 1',
      position: 2,
      createdAt: FIXED_NOW,
      updatedAt: FIXED_NOW,
    });
  });

  it('updates editable fields and time without changing identity metadata', () => {
    const current = makeTask();
    const updated = updateTask(
      current,
      makeTaskFields({ title: 'Updated', priority: 'high' }),
      testMembers,
      { now: () => LATER_NOW },
    );

    expect(updated).toMatchObject({
      id: current.id,
      key: current.key,
      createdAt: current.createdAt,
      title: 'Updated',
      priority: 'high',
      updatedAt: LATER_NOW,
    });
  });

  it('rejects blank and oversized text, invalid dates, reverse ranges, and unknown members', () => {
    const issues = validateTaskFields(
      makeTaskFields({
        title: '   ',
        description: 'x'.repeat(2_001),
        assigneeId: 'missing',
        startDate: '2026-02-30',
        dueDate: '2026-01-01',
      }),
      testMembers,
    );

    expect(issues).toEqual(
      expect.arrayContaining([
        { field: 'title', code: 'required' },
        { field: 'description', code: 'too_long' },
        { field: 'assigneeId', code: 'unknown_assignee' },
        { field: 'startDate', code: 'invalid_date' },
      ]),
    );
  });

  it('rejects a valid but reversed date range', () => {
    expect(
      validateTaskFields(
        makeTaskFields({
          startDate: '2026-08-12',
          dueDate: '2026-08-11',
        }),
      ),
    ).toContainEqual({ field: 'dueDate', code: 'invalid_date_range' });
  });

  it('throws a structured validation error before creating invalid data', () => {
    expect(() =>
      createTask(
        makeSnapshot(),
        makeTaskFields({ title: '' }),
        makeDependencies(),
      ),
    ).toThrow(TaskValidationError);
  });
});
