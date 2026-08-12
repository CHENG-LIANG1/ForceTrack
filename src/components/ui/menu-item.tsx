/**
 * Standardizes icon, label, and trailing-state alignment for compact app menus.
 */
import type { ReactNode } from 'react';

import { Button, type ButtonProps } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface MenuItemProps extends Omit<ButtonProps, 'variant'> {
  leading?: ReactNode;
  trailing?: ReactNode;
}

export function MenuItem({
  children,
  className,
  leading,
  trailing,
  type = 'button',
  ...props
}: MenuItemProps) {
  return (
    <Button
      type={type}
      variant="unstyled"
      className={cn('ui-menu-item', className)}
      {...props}
    >
      <span className="ui-menu-item-leading" aria-hidden="true">
        {leading}
      </span>
      <span className="ui-menu-item-content">{children}</span>
      <span className="ui-menu-item-trailing" aria-hidden="true">
        {trailing}
      </span>
    </Button>
  );
}
