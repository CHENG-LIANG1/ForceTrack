/** Verifies Timeline calendar-day boundaries independently from browser layout. */
import {
  MAX_TIMELINE_DAYS,
  selectTimelineData,
} from '@/features/timeline/timeline-selectors';
import { makeTask } from '@/test/fixtures';

describe('timeline selectors', () => {
  const today = '2026-03-08';

  it('uses the 21-day baseline and separates unscheduled work', () => {
    const undated = makeTask({ startDate: null, dueDate: null });
    const data = selectTimelineData([undated], today);

    expect(data.startDate).toBe('2026-03-01');
    expect(data.endDate).toBe('2026-03-21');
    expect(data.days).toHaveLength(21);
    expect(data.scheduled).toEqual([]);
    expect(data.unscheduled).toEqual([undated]);
  });

  it('renders dual dates as a span and a single date as one calendar day', () => {
    const data = selectTimelineData(
      [
        makeTask({
          id: 'span',
          startDate: '2026-03-07',
          dueDate: '2026-03-09',
        }),
        makeTask({
          id: 'single',
          startDate: null,
          dueDate: '2026-03-10',
        }),
      ],
      today,
    );

    expect(data.scheduled[0]).toMatchObject({ startIndex: 6, duration: 3 });
    expect(data.scheduled[1]).toMatchObject({ startIndex: 9, duration: 1 });
  });

  it('extends with two-day padding across month and year boundaries', () => {
    const data = selectTimelineData(
      [
        makeTask({
          startDate: '2025-12-30',
          dueDate: '2026-01-02',
        }),
      ],
      '2026-01-10',
    );

    expect(data.startDate).toBe('2025-12-28');
    expect(data.endDate).toBe('2026-01-23');
    expect(data.scheduled[0].duration).toBe(4);
  });

  it('keeps consecutive date-only cells adjacent across a DST transition', () => {
    const data = selectTimelineData(
      [
        makeTask({
          startDate: '2026-03-07',
          dueDate: '2026-03-09',
        }),
      ],
      today,
    );

    expect(
      data.days.indexOf('2026-03-08') - data.days.indexOf('2026-03-07'),
    ).toBe(1);
    expect(
      data.days.indexOf('2026-03-09') - data.days.indexOf('2026-03-08'),
    ).toBe(1);
    expect(data.scheduled[0].duration).toBe(3);
  });

  it('marks overdue work and clips anomalous ranges to 366 days', () => {
    const data = selectTimelineData(
      [
        makeTask({
          id: 'old',
          status: 'in_progress',
          startDate: '2020-01-01',
          dueDate: '2026-03-07',
        }),
        makeTask({
          id: 'future',
          startDate: '2027-12-01',
          dueDate: '2027-12-02',
        }),
      ],
      today,
    );

    expect(data.rangeClipped).toBe(true);
    expect(data.days).toHaveLength(MAX_TIMELINE_DAYS);
    expect(data.days).toContain(today);
    expect(data.scheduled[0]).toMatchObject({
      overdue: true,
      outOfRange: true,
    });
    expect(data.scheduled[1]).toMatchObject({
      visibleStartDate: null,
      outOfRange: true,
    });
  });
});
