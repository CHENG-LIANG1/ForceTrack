import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';

import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        outline:
          'border border-control-border bg-surface text-foreground hover:bg-surface-hover',
        unstyled: '',
      },
      size: {
        default: 'h-9 px-4 py-2',
        dialog: 'h-9 min-w-[88px] rounded-lg px-3 text-xs',
        lg: 'h-11 px-5 text-[13px]',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  },
);

export interface ButtonProps
  extends
    ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

export function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: ButtonProps) {
  const Comp = asChild ? Slot : 'button';
  const resolvedClassName =
    variant === 'unstyled'
      ? cn(
          'disabled:pointer-events-none disabled:opacity-50 focus-visible:outline-none',
          className,
        )
      : cn(buttonVariants({ variant, size, className }));

  return <Comp className={resolvedClassName} {...props} />;
}
