import { CalendarDays, X } from 'lucide-react';
import { useState } from 'react';
import { DayPicker } from 'react-day-picker';
import { enUS, zhCN } from 'date-fns/locale';

import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DatePickerProps {
  id: string;
  name: string;
  value: string | null;
  locale: string;
  placeholder: string;
  clearLabel: string;
  ariaLabel?: string;
  className?: string;
  minDate?: string | null;
  compact?: boolean;
  disabled?: boolean;
  invalid?: boolean;
  describedBy?: string;
  onChange(value: string | null): void;
}

function parseCalendarDate(value: string | null): Date | undefined {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day
    ? parsed
    : undefined;
}

function serializeCalendarDate(value: Date): string {
  const year = String(value.getFullYear());
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatDisplayDate(
  value: Date,
  locale: string,
  compact: boolean,
): string {
  return new Intl.DateTimeFormat(locale, {
    year: compact ? undefined : 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(value);
}

/** A themed calendar popover that avoids browser-specific native date controls. */
export function DatePicker({
  id,
  name,
  value,
  locale,
  placeholder,
  clearLabel,
  ariaLabel,
  className,
  minDate = null,
  compact = false,
  disabled = false,
  invalid = false,
  describedBy,
  onChange,
}: DatePickerProps) {
  const selected = parseCalendarDate(value);
  const earliestDate = parseCalendarDate(minDate);
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState(selected ?? new Date());

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        if (nextOpen && selected) setMonth(selected);
        setOpen(nextOpen);
      }}
    >
      <PopoverTrigger asChild>
        <Button
          variant="unstyled"
          className={cn(
            'ui-date-trigger',
            !selected && 'ui-control-placeholder',
            className,
          )}
          id={id}
          name={name}
          type="button"
          aria-invalid={invalid}
          aria-describedby={describedBy}
          aria-label={ariaLabel}
          disabled={disabled}
        >
          <span>
            {selected
              ? formatDisplayDate(selected, locale, compact)
              : placeholder}
          </span>
          <CalendarDays size={16} aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="ui-date-popover"
        sideOffset={6}
        collisionPadding={16}
        align="start"
      >
        <DayPicker
          mode="single"
          month={month}
          onMonthChange={setMonth}
          selected={selected}
          disabled={earliestDate ? { before: earliestDate } : undefined}
          locale={locale.startsWith('zh') ? zhCN : enUS}
          onSelect={(date) => {
            if (!date) return;
            onChange(serializeCalendarDate(date));
            setOpen(false);
          }}
        />
        {selected ? (
          <Button
            className="ui-date-clear"
            type="button"
            variant="outline"
            onClick={() => {
              onChange(null);
              setOpen(false);
            }}
          >
            <X size={14} aria-hidden="true" />
            {clearLabel}
          </Button>
        ) : null}
      </PopoverContent>
    </Popover>
  );
}
