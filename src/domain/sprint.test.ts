import {
  completeSprint,
  createSprint,
  SprintLifecycleError,
  startSprint,
  updateSprint,
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
    expect(validateSprintStartFields({ startDate: null, endDate: null })).toBe(
      'dates_required',
    );
    expect(
      validateSprintStartFields({
        startDate: '2026-08-20',
        endDate: '2026-08-19',
      }),
    ).toBe('invalid_range');
  });

  it('starts a planned sprint with dates when no sprint is active', () => {
    expect(
      startSprint(
        plannedSprint,
        { startDate: '2026-08-12', endDate: '2026-08-25' },
        [plannedSprint],
        1,
        FIXED_NOW,
      ),
    ).toMatchObject({
      status: 'active',
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
        { startDate: '2026-08-12', endDate: '2026-08-25' },
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
        { startDate: '2026-08-12', endDate: '2026-08-25' },
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
});
