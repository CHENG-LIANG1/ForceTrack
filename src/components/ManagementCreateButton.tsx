/** Keeps create actions identical across list-management dialogs. */
import { Plus } from 'lucide-react';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ManagementCreateButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function ManagementCreateButton({
  children,
  className,
  ...props
}: ManagementCreateButtonProps) {
  return (
    <Button
      variant="unstyled"
      className={cn('management-create-button', className)}
      {...props}
    >
      <Plus size={14} aria-hidden="true" />
      {children}
    </Button>
  );
}
