/**
 * Jira-shaped, page-local filters for Summary.
 * The panel only emits selector inputs so every downstream module shares one task set.
 */
import { Filter, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { DatePicker } from '@/components/ui/date-picker';
import type { Member } from '@/domain/member';
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TASK_TYPES,
  type Task,
} from '@/domain/task';
import {
  SUMMARY_FILTER_ARRAY_KEYS,
  SUMMARY_FILTER_ICON_SIZES,
  UNASSIGNED_ASSIGNEE_FILTER_VALUE,
} from '@/features/summary/summary-constants';
import type { SummaryFilters } from '@/features/summary/summary-selectors';

interface SummaryFilterPanelProps {
  filters: SummaryFilters;
  members: readonly Member[];
  tasks: readonly Task[];
  onChange(filters: SummaryFilters): void;
  onClear(): void;
}

function toggledValue<T extends string>(
  values: readonly T[] | undefined,
  value: T,
): T[] {
  return values?.includes(value)
    ? values.filter((candidate) => candidate !== value)
    : [...(values ?? []), value];
}

function activeDimensionCount(filters: SummaryFilters): number {
  const arrayDimensionCount = SUMMARY_FILTER_ARRAY_KEYS.filter(
    (key) => filters[key]?.length,
  ).length;
  return (
    arrayDimensionCount + Number(Boolean(filters.dateFrom || filters.dateTo))
  );
}

export function SummaryFilterPanel({
  filters,
  members,
  tasks,
  onChange,
  onClear,
}: SummaryFilterPanelProps) {
  const { t, i18n } = useTranslation();
  const epics = tasks.filter((task) => task.workType === 'epic');
  const activeCount = activeDimensionCount(filters);
  const locale = i18n.resolvedLanguage ?? i18n.language;

  return (
    <section
      className="summary-filter-panel"
      aria-labelledby="summary-filter-title"
    >
      <div className="summary-filter-heading">
        <div>
          <Filter size={SUMMARY_FILTER_ICON_SIZES.heading} aria-hidden="true" />
          <strong id="summary-filter-title">
            {t('summary.filters.title')}
          </strong>
          <span>{t('summary.filters.active', { count: activeCount })}</span>
        </div>
        <Button
          type="button"
          className="summary-filter-clear"
          variant="outline"
          disabled={activeCount === 0}
          onClick={onClear}
        >
          <RotateCcw
            size={SUMMARY_FILTER_ICON_SIZES.action}
            aria-hidden="true"
          />
          {t('summary.filters.clear')}
        </Button>
      </div>

      <div className="summary-filter-grid">
        <fieldset className="summary-filter-dates">
          <legend>{t('summary.filters.dateRange')}</legend>
          <div className="summary-filter-field-body summary-filter-date-options">
            <label>
              <span>{t('summary.filters.from')}</span>
              <DatePicker
                id="summary-date-from"
                name="summary-date-from"
                value={filters.dateFrom ?? null}
                locale={locale}
                placeholder={t('summary.filters.anyDate')}
                clearLabel={t('summary.filters.clearDate')}
                onChange={(dateFrom) => onChange({ ...filters, dateFrom })}
              />
            </label>
            <label>
              <span>{t('summary.filters.to')}</span>
              <DatePicker
                id="summary-date-to"
                name="summary-date-to"
                value={filters.dateTo ?? null}
                locale={locale}
                placeholder={t('summary.filters.anyDate')}
                clearLabel={t('summary.filters.clearDate')}
                onChange={(dateTo) => onChange({ ...filters, dateTo })}
              />
            </label>
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('task.fields.assignee')}</legend>
          <div className="summary-filter-field-body summary-filter-options">
            {[
              {
                id: UNASSIGNED_ASSIGNEE_FILTER_VALUE,
                name: t('summary.unassigned'),
              },
              ...members.map((member) => ({
                id: member.id,
                name: member.name,
              })),
            ].map((option) => (
              <label key={option.id}>
                <Checkbox
                  checked={filters.assigneeIds?.includes(option.id) ?? false}
                  onCheckedChange={() =>
                    onChange({
                      ...filters,
                      assigneeIds: toggledValue(filters.assigneeIds, option.id),
                    })
                  }
                />
                <span>{option.name}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('task.fields.workType')}</legend>
          <div className="summary-filter-field-body summary-filter-options">
            {TASK_TYPES.map((workType) => (
              <label key={workType}>
                <Checkbox
                  checked={filters.workTypes?.includes(workType) ?? false}
                  onCheckedChange={() =>
                    onChange({
                      ...filters,
                      workTypes: toggledValue(filters.workTypes, workType),
                    })
                  }
                />
                <span>{t(`task.workType.${workType}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('task.fields.status')}</legend>
          <div className="summary-filter-field-body summary-filter-options">
            {TASK_STATUSES.map((status) => (
              <label key={status}>
                <Checkbox
                  checked={filters.statuses?.includes(status) ?? false}
                  onCheckedChange={() =>
                    onChange({
                      ...filters,
                      statuses: toggledValue(filters.statuses, status),
                    })
                  }
                />
                <span>{t(`task.status.${status}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('summary.filters.parent')}</legend>
          <div className="summary-filter-field-body summary-filter-options summary-filter-epics">
            {epics.length ? (
              epics.map((epic) => (
                <label key={epic.id}>
                  <Checkbox
                    checked={filters.parentIds?.includes(epic.id) ?? false}
                    onCheckedChange={() =>
                      onChange({
                        ...filters,
                        parentIds: toggledValue(filters.parentIds, epic.id),
                      })
                    }
                  />
                  <span>
                    {epic.key} · {epic.title}
                  </span>
                </label>
              ))
            ) : (
              <span className="summary-filter-empty">
                {t('summary.filters.noEpics')}
              </span>
            )}
          </div>
        </fieldset>

        <fieldset>
          <legend>{t('task.fields.priority')}</legend>
          <div className="summary-filter-field-body summary-filter-options">
            {TASK_PRIORITIES.map((priority) => (
              <label key={priority}>
                <Checkbox
                  checked={filters.priorities?.includes(priority) ?? false}
                  onCheckedChange={() =>
                    onChange({
                      ...filters,
                      priorities: toggledValue(filters.priorities, priority),
                    })
                  }
                />
                <span>{t(`task.priority.${priority}`)}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>
    </section>
  );
}
