import { createBrowserRouter, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import DashboardPage from './pages/DashboardPage';
import JobListPage from './pages/jobs/JobListPage';
import ApplyPage from './pages/apply/ApplyPage';
import PipelinePage from './pages/pipeline/PipelinePage';

const router = createBrowserRouter([
  { path: '/login', element: <div>Login Page</div> },
  { path: '/register', element: <div>Register Page</div> },
  { path: '/jobs/:id/apply', element: <ApplyPage /> },
  {
    path: '/app',
    element: <AppLayout />,
    children: [
      { path: 'dashboard', element: <DashboardPage /> },
      { path: 'jobs', element: <JobListPage /> },
      { path: 'jobs/:id/pipeline', element: <PipelinePage /> },
      // Other routes to implement later
    ],
  },
  { path: '/', element: <Navigate to="/app/dashboard" /> },
  { path: '*', element: <div className="p-6">404 Not Found</div> },
]);

export default router;
