/** Guides an empty local workspace toward its single useful next action. */
import { FolderPlus, Plus } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';

import { projectRoutes } from '@/app/route-paths';
import { EmptyState } from '@/components/EmptyState';
import { Button } from '@/components/ui/button';
import { ProjectManagementDialog } from '@/features/projects/ProjectManagementDialog';

export function EmptyWorkspacePage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [createOpen, setCreateOpen] = useState(false);

  return (
    <section
      className="workspace-page empty-workspace-page"
      data-onboarding="empty-workspace"
    >
      <EmptyState
        icon={FolderPlus}
        headingLevel={1}
        title={t('project.empty.title')}
        description={t('project.empty.description')}
        action={
          <Button type="button" onClick={() => setCreateOpen(true)}>
            <Plus size={15} aria-hidden="true" />
            {t('project.empty.action')}
          </Button>
        }
      />
      <ProjectManagementDialog
        open={createOpen}
        initialMode="create"
        onOpenChange={setCreateOpen}
        onProjectSelected={(projectId) => {
          if (projectId) navigate(projectRoutes.summary(projectId));
        }}
      />
    </section>
  );
}
