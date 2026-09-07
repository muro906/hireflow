import { Link } from 'react-router-dom';
import { Plus, Briefcase, ExternalLink, Pencil } from 'lucide-react';
import { useJobs } from '../../api/jobs';
import { Badge } from '../../components/ui/Badge';
import { Spinner } from '../../components/ui/Spinner';
import { formatDate } from '../../utils/format';

export default function JobDetailPage() {
  // Intentionally minimal — full detail lives on pipeline page
  // This page shows job info + links to pipeline & edit
  return null; // Will be populated by JobDetailPageContent
}

export { JobDetailPageContent as default };

function JobDetailPageContent() {
  // Redirect to PipelinePage from here, or show job summary
  return (
    <div className="text-slate-400 py-20 text-center">
      Select a job from the <Link to="/app/jobs" className="text-brand-400">Jobs list</Link> to view its pipeline.
    </div>
  );
}
