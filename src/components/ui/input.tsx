import * as React from 'react';

import { cn } from '@/lib/utils';

export function Input({
  className,
  type = 'text',
  ...props
}: React.ComponentProps<'input'>) {
  return <input type={type} className={cn('ui-input', className)} {...props} />;
}
