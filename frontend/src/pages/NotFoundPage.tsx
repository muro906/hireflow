import { Link } from 'react-router-dom';
import { Home } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center px-4">
      <div className="text-center space-y-6">
        <p className="text-8xl font-black text-slate-800 select-none">404</p>
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Page not found</h1>
          <p className="text-slate-400 text-sm mt-2">The page you're looking for doesn't exist.</p>
        </div>
        <Link
          to="/app/dashboard"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Home size={15} /> Back to dashboard
        </Link>
      </div>
    </div>
  );
}
