/**
 * Pure calendar-day derivation for the read-only Timeline view.
 * Keeping range and clipping rules here prevents UI layout from becoming a second date model.
 */
import { addDays, differenceInCalendarDays } from 'date-fns';

import type { Task } from '@/domain/task';

export const TIMELINE_DAY_WIDTH = 36;
export const MAX_TIMELINE_DAYS = 366;

export interface TimelineTask {
  task: Task;
  startDate: string;
  endDate: string;
  visibleStartDate: string | null;
  visibleEndDate: string | null;
  startIndex: number;
  duration: number;
  overdue: boolean;
  outOfRange: boolean;
}

export interface TimelineData {
  startDate: string;
  endDate: string;
  today: string;
  days: string[];
  scheduled: TimelineTask[];
  unscheduled: Task[];
  rangeClipped: boolean;
}

function parseCalendarDate(value: string): Date {
  const [year, month, day] = value.split('-').map(Number);
  return new Date(year, month - 1, day);
}

export function formatCalendarDate(value: Date): string {
  const year = String(value.getFullYear()).padStart(4, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function addCalendarDays(value: string, days: number): string {
  return formatCalendarDate(addDays(parseCalendarDate(value), days));
}

function calendarDayDifference(left: string, right: string): number {
  return differenceInCalendarDays(
    parseCalendarDate(right),
    parseCalendarDate(left),
  );
}

function minDate(left: string, right: string): string {
  return left < right ? left : right;
}

function maxDate(left: string, right: string): string {
  return left > right ? left : right;
}

/** Applies the 21-day baseline, two-day task padding, and bounded 366-day window. */
export function selectTimelineData(
  tasks: readonly Task[],
  today = formatCalendarDate(new Date()),
): TimelineData {
  const unscheduled = tasks.filter((task) => !task.startDate && !task.dueDate);
  const scheduledTasks = tasks.filter(
    (task) => task.startDate !== null || task.dueDate !== null,
  );
  const taskDates = scheduledTasks.flatMap((task) =>
    [task.startDate, task.dueDate].filter(
      (value): value is string => value !== null,
    ),
  );
  const baseStart = addCalendarDays(today, -7);
  const baseEnd = addCalendarDays(today, 13);
  const earliestTaskDate = taskDates.length ? [...taskDates].sort()[0] : today;
  const latestTaskDate = taskDates.length
    ? ([...taskDates].sort().at(-1) as string)
    : today;
  const requestedStart = minDate(
    baseStart,
    addCalendarDays(earliestTaskDate, -2),
  );
  const requestedEnd = maxDate(baseEnd, addCalendarDays(latestTaskDate, 2));
  const requestedDayCount =
    calendarDayDifference(requestedStart, requestedEnd) + 1;
  const rangeClipped = requestedDayCount > MAX_TIMELINE_DAYS;

  // Preserve Today and the full forward baseline when an anomalous task spans years.
  const oldestAllowedStart = addCalendarDays(
    today,
    -(MAX_TIMELINE_DAYS - 1 - 13),
  );
  const startDate = rangeClipped
    ? maxDate(requestedStart, oldestAllowedStart)
    : requestedStart;
  const endDate = rangeClipped
    ? addCalendarDays(startDate, MAX_TIMELINE_DAYS - 1)
    : requestedEnd;
  const dayCount = calendarDayDifference(startDate, endDate) + 1;

  const scheduled = scheduledTasks.map((task): TimelineTask => {
    const taskStart = task.startDate ?? (task.dueDate as string);
    const taskEnd = task.dueDate ?? (task.startDate as string);
    const visibleStart = maxDate(taskStart, startDate);
    const visibleEnd = minDate(taskEnd, endDate);
    const isVisible = visibleStart <= visibleEnd;

    return {
      task,
      startDate: taskStart,
      endDate: taskEnd,
      visibleStartDate: isVisible ? visibleStart : null,
      visibleEndDate: isVisible ? visibleEnd : null,
      startIndex: isVisible
        ? calendarDayDifference(startDate, visibleStart)
        : 0,
      duration: isVisible
        ? calendarDayDifference(visibleStart, visibleEnd) + 1
        : 0,
      overdue:
        task.dueDate !== null && task.dueDate < today && task.status !== 'done',
      outOfRange: taskStart < startDate || taskEnd > endDate,
    };
  });

  return {
    startDate,
    endDate,
    today,
    days: Array.from({ length: dayCount }, (_, index) =>
      addCalendarDays(startDate, index),
    ),
    scheduled,
    unscheduled,
    rangeClipped,
  };
}
