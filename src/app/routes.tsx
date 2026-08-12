import { Navigate, Route, Routes, useLocation, useParams } from 'react-router';
import { useEffect } from 'react';

import { usePreferences } from '@/app/preferences-context';
import { useProjects } from '@/app/project-context';
import { pageFromPath, projectPath, type ProjectPage } from '@/app/route-paths';
import { LoadingState } from '@/components/LoadingState';
import { BacklogPage } from '@/features/backlog/BacklogPage';
import { BoardPage } from '@/features/board/BoardPage';
import { MembersPage } from '@/features/members/MembersPage';
import { EmptyWorkspacePage } from '@/features/projects/EmptyWorkspacePage';
import { SummaryPage } from '@/features/summary/SummaryPage';
import { TimelinePage } from '@/features/timeline/TimelinePage';

function preferredProjectId(
  projectIds: readonly string[],
  lastProjectId: string | null,
): string | null {
  return (
    (lastProjectId && projectIds.includes(lastProjectId)
      ? lastProjectId
      : projectIds[0]) ?? null
  );
}

function WorkspaceRedirect({ page }: { page: ProjectPage }) {
  const location = useLocation();
  const { projects, isReady } = useProjects();
  const { preferences } = usePreferences();
  if (!isReady) return <LoadingState label="Loading workspace…" />;
  const projectId = preferredProjectId(
    projects.map((project) => project.id),
    preferences.lastProjectId,
  );
  return projectId ? (
    <Navigate to={projectPath(projectId, page)} replace />
  ) : location.pathname !== '/' ? (
    <Navigate to="/" replace />
  ) : (
    <EmptyWorkspacePage />
  );
}

function ProjectPageGuard({
  page,
  children,
}: {
  page: ProjectPage;
  children: React.ReactNode;
}) {
  const { projectId } = useParams();
  const { projects, isReady } = useProjects();
  const { preferences, rememberProject } = usePreferences();
  const validProject = projects.find((project) => project.id === projectId);
  useEffect(() => {
    if (validProject && preferences.lastProjectId !== validProject.id) {
      rememberProject(
        validProject.id,
        projects.map((project) => project.id),
      );
    }
  }, [preferences.lastProjectId, projects, rememberProject, validProject]);
  if (!isReady) return <LoadingState label="Loading workspace…" />;
  if (!validProject) {
    const fallback = preferredProjectId(
      projects.map((project) => project.id),
      preferences.lastProjectId,
    );
    return fallback ? (
      <Navigate to={projectPath(fallback, page)} replace />
    ) : (
      <Navigate to="/" replace />
    );
  }
  return <div key={`${validProject.id}-${page}`}>{children}</div>;
}

function UnknownProjectPage() {
  const location = useLocation();
  return <WorkspaceRedirect page={pageFromPath(location.pathname)} />;
}

/** Project-aware routes preserve legacy bookmarks and browser history semantics. */
export function AppRoutes() {
  return (
    <Routes>
      <Route
        path="/projects/:projectId/summary"
        element={
          <ProjectPageGuard page="summary">
            <SummaryPage />
          </ProjectPageGuard>
        }
      />
      <Route
        path="/projects/:projectId/backlog"
        element={
          <ProjectPageGuard page="backlog">
            <BacklogPage />
          </ProjectPageGuard>
        }
      />
      <Route
        path="/projects/:projectId/board"
        element={
          <ProjectPageGuard page="board">
            <BoardPage />
          </ProjectPageGuard>
        }
      />
      <Route
        path="/projects/:projectId/timeline"
        element={
          <ProjectPageGuard page="timeline">
            <TimelinePage />
          </ProjectPageGuard>
        }
      />
      <Route
        path="/projects/:projectId/members"
        element={
          <ProjectPageGuard page="members">
            <MembersPage />
          </ProjectPageGuard>
        }
      />
      <Route path="/summary" element={<WorkspaceRedirect page="summary" />} />
      <Route path="/backlog" element={<WorkspaceRedirect page="backlog" />} />
      <Route path="/board" element={<WorkspaceRedirect page="board" />} />
      <Route path="/timeline" element={<WorkspaceRedirect page="timeline" />} />
      <Route path="/" element={<WorkspaceRedirect page="summary" />} />
      <Route path="/projects/:projectId/*" element={<UnknownProjectPage />} />
      <Route path="*" element={<WorkspaceRedirect page="summary" />} />
    </Routes>
  );
}
