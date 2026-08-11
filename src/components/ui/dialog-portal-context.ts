import { createContext, useContext } from 'react';

export const DialogPortalContainerContext = createContext<HTMLElement | null>(
  null,
);

export function useDialogPortalContainer(): HTMLElement | null {
  return useContext(DialogPortalContainerContext);
}
