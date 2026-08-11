import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { ComponentProps } from 'react';

import { useDialogPortalContainer } from '@/components/ui/dialog-portal-context';
import { cn } from '@/lib/utils';

export function Popover(props: ComponentProps<typeof PopoverPrimitive.Root>) {
  return <PopoverPrimitive.Root {...props} />;
}

export function PopoverTrigger(
  props: ComponentProps<typeof PopoverPrimitive.Trigger>,
) {
  return <PopoverPrimitive.Trigger {...props} />;
}

export function PopoverAnchor(
  props: ComponentProps<typeof PopoverPrimitive.Anchor>,
) {
  return <PopoverPrimitive.Anchor {...props} />;
}

export function PopoverContent({
  className,
  align = 'center',
  sideOffset = 4,
  ...props
}: ComponentProps<typeof PopoverPrimitive.Content>) {
  const dialogPortalContainer = useDialogPortalContainer();

  return (
    <PopoverPrimitive.Portal container={dialogPortalContainer ?? undefined}>
      <PopoverPrimitive.Content
        align={align}
        sideOffset={sideOffset}
        className={cn('z-50 outline-none', className)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
}
