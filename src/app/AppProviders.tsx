import { type PropsWithChildren, useMemo } from 'react';
import { I18nextProvider } from 'react-i18next';
import { BrowserRouter } from 'react-router';

import { PreferencesProvider } from '@/app/PreferencesProvider';
import { WorkspaceProvider } from '@/app/WorkspaceProvider';
import type { DomainDependencies } from '@/domain/task';
import type {
  PreferencesRepository,
  TaskRepository,
  WorkspaceRepository,
} from '@/infrastructure/repositories';
import { createI18n } from '@/i18n';

interface AppProvidersProps extends PropsWithChildren {
  preferencesRepository?: PreferencesRepository;
  taskRepository?: TaskRepository;
  workspaceRepository?: WorkspaceRepository;
  taskDependencies?: DomainDependencies;
}

/** Composes global browser routing, translations, and persisted user preferences. */
export function AppProviders({
  children,
  preferencesRepository,
  taskRepository,
  workspaceRepository,
  taskDependencies,
}: AppProvidersProps) {
  const i18nInstance = useMemo(() => createI18n(), []);

  return (
    <I18nextProvider i18n={i18nInstance}>
      <PreferencesProvider
        i18nInstance={i18nInstance}
        repository={preferencesRepository}
      >
        <BrowserRouter>
          <WorkspaceProvider
            repository={workspaceRepository}
            legacyTaskRepository={taskRepository}
            dependencies={taskDependencies}
          >
            {children}
          </WorkspaceProvider>
        </BrowserRouter>
      </PreferencesProvider>
    </I18nextProvider>
  );
}
