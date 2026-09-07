import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import JobListPage from './pages/jobs/JobListPage';
import JobDetailPage from './pages/jobs/JobDetailPage';
import JobCreatePage from './pages/jobs/JobCreatePage';
import JobEditPage from './pages/jobs/JobEditPage';
import PipelinePage from './pages/pipeline/PipelinePage';
import ApplicantListPage from './pages/applicants/ApplicantListPage';
import ApplicantDetailPage from './pages/applicants/ApplicantDetailPage';
import ReportsPage from './pages/reports/ReportsPage';
import ApplyPage from './pages/apply/ApplyPage';
import NotFoundPage from './pages/NotFoundPage';

const router = createBrowserRouter([
  // Public routes (no auth required)
  { path: '/login', element: <LoginPage /> },
  { path: '/register', element: <RegisterPage /> },
  { path: '/jobs/:id/apply', element: <ApplyPage /> },

  // Protected app routes (auth guard inside AppLayout)
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'jobs', element: <JobListPage /> },
      { path: 'jobs/create', element: <JobCreatePage /> },
      { path: 'jobs/:id', element: <JobDetailPage /> },
      { path: 'jobs/:id/edit', element: <JobEditPage /> },
      { path: 'jobs/:id/pipeline', element: <PipelinePage /> },
      { path: 'applicants', element: <ApplicantListPage /> },
      { path: 'applicants/:id', element: <ApplicantDetailPage /> },
      { path: 'reports', element: <ReportsPage /> },
    ],
  },

  { path: '/', element: <Navigate to="/app/dashboard" replace /> },
  { path: '*', element: <NotFoundPage /> },
]);

export default router;
