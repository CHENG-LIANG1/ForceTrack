/** Shared Summary presentation constants keep render order and compact sizing centralized. */
import type { AssigneeFilterValue } from '@/features/filters/task-selectors';
import type { TaskStatus } from '@/domain/task';
import type { SummaryFilters } from '@/features/summary/summary-selectors';

export const EMPTY_SUMMARY_FILTERS = Object.freeze({}) satisfies SummaryFilters;

export const SUMMARY_METRIC_KEYS = [
  'created',
  'updated',
  'completed',
  'dueSoon',
] as const;

export const SUMMARY_FILTER_ARRAY_KEYS = [
  'assigneeIds',
  'workTypes',
  'statuses',
  'parentIds',
  'priorities',
] as const satisfies readonly (keyof SummaryFilters)[];

export const UNASSIGNED_ASSIGNEE_FILTER_VALUE =
  'unassigned' satisfies AssigneeFilterValue;

export const SUMMARY_FILTER_ICON_SIZES = {
  action: 14,
  heading: 16,
} as const;

export const SUMMARY_STATUS_COLOR_TOKENS = {
  todo: 'var(--status-todo)',
  in_progress: 'var(--status-in-progress)',
  in_review: 'var(--status-in-review)',
  done: 'var(--status-done)',
} as const satisfies Record<TaskStatus, string>;
