import { createContext, useContext } from 'react';

interface OnboardingContextValue {
  startOnboarding(): void;
}

export const OnboardingContext = createContext<OnboardingContextValue | null>(
  null,
);

/** Exposes the replay action without coupling header controls to Joyride internals. */
export function useOnboarding(): OnboardingContextValue {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error('useOnboarding must be used within OnboardingProvider.');
  }
  return context;
}
