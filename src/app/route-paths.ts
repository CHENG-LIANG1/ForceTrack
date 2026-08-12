export const PROJECT_PAGES = [
  'summary',
  'backlog',
  'board',
  'timeline',
] as const;
export type ProjectPage = (typeof PROJECT_PAGES)[number];

/** Central builders validate every project URL and preserve the current page on switches. */
export const projectRoutes = {
  summary: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/summary`,
  backlog: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/backlog`,
  board: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/board`,
  timeline: (projectId: string) =>
    `/projects/${encodeURIComponent(projectId)}/timeline`,
} as const;

export const legacyRoutes = {
  summary: '/summary',
  backlog: '/backlog',
  board: '/board',
  timeline: '/timeline',
} as const;

export function projectPath(projectId: string, page: ProjectPage): string {
  return projectRoutes[page](projectId);
}

export function pageFromPath(pathname: string): ProjectPage {
  const page = pathname.split('/').filter(Boolean).at(-1);
  return PROJECT_PAGES.includes(page as ProjectPage)
    ? (page as ProjectPage)
    : 'summary';
}
