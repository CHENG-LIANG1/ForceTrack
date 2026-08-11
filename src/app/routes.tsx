import { Navigate, Route, Routes } from 'react-router';

import { routes } from '@/app/route-paths';
import { BoardPage } from '@/features/board/BoardPage';
import { TimelinePage } from '@/features/timeline/TimelinePage';

/** Declares the MVP's two addressable pages and funnels every fallback to Board. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path={routes.board} element={<BoardPage />} />
      <Route path={routes.timeline} element={<TimelinePage />} />
      <Route path="/" element={<Navigate to={routes.board} replace />} />
      <Route path="*" element={<Navigate to={routes.board} replace />} />
    </Routes>
  );
}
