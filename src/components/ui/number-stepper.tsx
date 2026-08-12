/** Shared integer stepper keeps numeric controls consistent with the shadcn UI layer. */
import { Minus, Plus } from 'lucide-react';
import type { ComponentProps, KeyboardEvent } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface NumberStepperProps extends Omit<
  ComponentProps<'input'>,
  'defaultValue' | 'max' | 'min' | 'onChange' | 'step' | 'type' | 'value'
> {
  value: number | null;
  min?: number;
  max?: number;
  step?: number;
  decrementLabel: string;
  incrementLabel: string;
  onValueChange(value: number | null): void;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

/** Uses text input semantics to avoid browser-native spinner chrome while preserving spinbutton access. */
export function NumberStepper({
  value,
  min = Number.MIN_SAFE_INTEGER,
  max = Number.MAX_SAFE_INTEGER,
  step = 1,
  decrementLabel,
  incrementLabel,
  onValueChange,
  disabled,
  readOnly,
  className,
  onKeyDown,
  ...props
}: NumberStepperProps) {
  const changeBy = (direction: -1 | 1) => {
    const emptyStart = min > 0 ? min : 0;
    const nextValue =
      value === null
        ? direction === 1
          ? emptyStart + step
          : emptyStart
        : value + direction * step;
    onValueChange(clamp(nextValue, min, max));
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    onKeyDown?.(event);
    if (event.defaultPrevented || disabled || readOnly) return;

    if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      event.preventDefault();
      changeBy(event.key === 'ArrowUp' ? 1 : -1);
    } else if (event.key === 'Home' && Number.isFinite(min)) {
      event.preventDefault();
      onValueChange(min);
    } else if (event.key === 'End' && Number.isFinite(max)) {
      event.preventDefault();
      onValueChange(max);
    }
  };

  const controlsDisabled = disabled || readOnly;
  const invalid =
    props['aria-invalid'] === true || props['aria-invalid'] === 'true';

  return (
    <div
      className="ui-number-stepper"
      data-disabled={controlsDisabled || undefined}
      data-invalid={invalid || undefined}
    >
      <Button
        type="button"
        variant="unstyled"
        className="ui-number-stepper-button"
        aria-label={decrementLabel}
        disabled={controlsDisabled || value === null || value <= min}
        onClick={() => changeBy(-1)}
      >
        <Minus aria-hidden="true" />
      </Button>
      <Input
        {...props}
        type="text"
        role="spinbutton"
        inputMode="numeric"
        pattern="[0-9]*"
        className={className}
        value={value ?? ''}
        aria-valuemin={Number.isFinite(min) ? min : undefined}
        aria-valuemax={Number.isFinite(max) ? max : undefined}
        aria-valuenow={value ?? undefined}
        disabled={disabled}
        readOnly={readOnly}
        onKeyDown={handleKeyDown}
        onChange={(event) => {
          const nextValue = event.target.value.trim();
          if (nextValue === '') {
            onValueChange(null);
          } else if (/^\d+$/.test(nextValue)) {
            onValueChange(clamp(Number(nextValue), min, max));
          }
        }}
      />
      <Button
        type="button"
        variant="unstyled"
        className="ui-number-stepper-button"
        aria-label={incrementLabel}
        disabled={controlsDisabled || (value !== null && value >= max)}
        onClick={() => changeBy(1)}
      >
        <Plus aria-hidden="true" />
      </Button>
    </div>
  );
}
