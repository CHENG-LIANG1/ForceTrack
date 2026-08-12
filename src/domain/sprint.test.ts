import {
  completeSprint,
  createSprint,
  SprintLifecycleError,
  startSprint,
  updateSprint,
  validateSprintFields,
  validateSprintStartFields,
  type Sprint,
} from '@/domain/sprint';
import { FIXED_NOW, makeDependencies } from '@/test/fixtures';

const plannedSprint: Sprint = {
  id: 'sprint-2',
  name: 'Sprint 2',
  goal: '',
  startDate: null,
  endDate: null,
  status: 'planned',
  position: 1,
  createdAt: FIXED_NOW,
  startedAt: null,
  completedAt: null,
};

describe('sprint lifecycle', () => {
  it('allows creating a planned sprint without dates', () => {
    expect(
      createSprint(
        { name: 'Sprint 2', goal: '', startDate: null, endDate: null },
        makeDependencies(['sprint-2']),
      ),
    ).toMatchObject({
      id: 'sprint-2',
      status: 'planned',
      startDate: null,
      endDate: null,
      position: 0,
      startedAt: null,
      completedAt: null,
    });
  });

  it('requires both dates and a valid range when starting', () => {
    expect(
      validateSprintStartFields({
        name: plannedSprint.name,
        goal: plannedSprint.goal,
        startDate: null,
        endDate: null,
      }),
    ).toBe('dates_required');
    expect(
      validateSprintStartFields({
        name: plannedSprint.name,
        goal: plannedSprint.goal,
        startDate: '2026-08-20',
        endDate: '2026-08-19',
      }),
    ).toBe('invalid_range');
  });

  it.each([
    [
      'name_required',
      { name: '   ', goal: '', startDate: null, endDate: null },
    ],
    [
      'name_too_long',
      { name: 'x'.repeat(81), goal: '', startDate: null, endDate: null },
    ],
    [
      'goal_too_long',
      { name: 'Sprint', goal: 'x'.repeat(501), startDate: null, endDate: null },
    ],
    [
      'invalid_date',
      {
        name: 'Sprint',
        goal: '',
        startDate: '2026-02-30',
        endDate: null,
      },
    ],
    [
      'invalid_date',
      {
        name: 'Sprint',
        goal: '',
        startDate: null,
        endDate: '2026-02-30',
      },
    ],
    [
      'invalid_range',
      {
        name: 'Sprint',
        goal: '',
        startDate: '2026-08-20',
        endDate: '2026-08-19',
      },
    ],
  ] as const)('reports %s for invalid sprint fields', (issue, fields) => {
    expect(validateSprintFields(fields)).toBe(issue);
  });

  it('starts a planned sprint with dates when no sprint is active', () => {
    expect(
      startSprint(
        plannedSprint,
        {
          name: 'Renamed during start',
          goal: 'Ship the lifecycle',
          startDate: '2026-08-12',
          endDate: '2026-08-25',
        },
        [plannedSprint],
        1,
        FIXED_NOW,
      ),
    ).toMatchObject({
      status: 'active',
      name: 'Renamed during start',
      goal: 'Ship the lifecycle',
      startDate: '2026-08-12',
      endDate: '2026-08-25',
      startedAt: FIXED_NOW,
    });
  });

  it('rejects starting another sprint while one is active', () => {
    const active = {
      ...plannedSprint,
      id: 'sprint-1',
      status: 'active',
    } as const;
    expect(() =>
      startSprint(
        plannedSprint,
        {
          name: plannedSprint.name,
          goal: plannedSprint.goal,
          startDate: '2026-08-12',
          endDate: '2026-08-25',
        },
        [active, plannedSprint],
      ),
    ).toThrowError(new SprintLifecycleError('active_exists'));
  });

  it('only completes an active sprint', () => {
    expect(
      completeSprint({ ...plannedSprint, status: 'active' }, FIXED_NOW),
    ).toMatchObject({ status: 'completed', completedAt: FIXED_NOW });
    expect(() => completeSprint(plannedSprint)).toThrowError(
      new SprintLifecycleError('invalid_status'),
    );
  });

  it('rejects starting an empty sprint and editing a completed sprint', () => {
    expect(() =>
      startSprint(
        plannedSprint,
        {
          name: plannedSprint.name,
          goal: plannedSprint.goal,
          startDate: '2026-08-12',
          endDate: '2026-08-25',
        },
        [plannedSprint],
        0,
        FIXED_NOW,
      ),
    ).toThrowError(new SprintLifecycleError('empty_sprint'));
    expect(() =>
      updateSprint(
        { ...plannedSprint, status: 'completed', completedAt: FIXED_NOW },
        { name: 'No', goal: '', startDate: null, endDate: null },
      ),
    ).toThrowError(new SprintLifecycleError('invalid_status'));
  });

  it('rejects starting a non-planned sprint and invalid start fields', () => {
    const fields = {
      name: plannedSprint.name,
      goal: plannedSprint.goal,
      startDate: '2026-08-12',
      endDate: '2026-08-25',
    };
    expect(() =>
      startSprint({ ...plannedSprint, status: 'active' }, fields, [
        plannedSprint,
      ]),
    ).toThrowError(new SprintLifecycleError('invalid_status'));
    expect(() =>
      startSprint(plannedSprint, { ...fields, name: ' ' }, [plannedSprint]),
    ).toThrowError(new SprintLifecycleError('name_required'));
  });

  it('uses safe timestamp fallbacks and updates valid sprint fields', () => {
    const started = startSprint(
      plannedSprint,
      {
        name: ' Updated during start ',
        goal: ' Goal ',
        startDate: '2026-08-12',
        endDate: '2026-08-25',
      },
      [plannedSprint],
    );
    expect(started).toMatchObject({
      name: 'Updated during start',
      goal: 'Goal',
      startedAt: null,
    });
    expect(completeSprint({ ...started, status: 'active' })).toMatchObject({
      completedAt: null,
    });
    expect(
      updateSprint(plannedSprint, {
        name: ' Updated ',
        goal: ' Goal ',
        startDate: null,
        endDate: null,
      }),
    ).toMatchObject({ name: 'Updated', goal: 'Goal' });
    expect(() =>
      createSprint(
        { name: '', goal: '', startDate: null, endDate: null },
        makeDependencies(),
      ),
    ).toThrow('Invalid sprint: name_required');
  });
});
