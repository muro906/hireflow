import { useParams } from 'react-router-dom';
import { usePipeline } from '../../api/applications';
import { KanbanBoard } from '../../components/kanban/KanbanBoard';

export default function PipelinePage() {
  const { id } = useParams<{ id: string }>();
  const { data: pipeline, isLoading } = usePipeline(id!);

  if (isLoading) {
    return <div className="p-8 text-slate-400">Loading pipeline...</div>;
  }

  if (!pipeline) {
    return <div className="p-8 text-slate-400">Pipeline data not found.</div>;
  }

  return (
    <div className="flex flex-col h-full bg-slate-950">
      <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-900/50 backdrop-blur-md sticky top-0 z-10">
        <div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Pipeline</h1>
          <p className="text-sm text-slate-400">Manage candidates across stages.</p>
        </div>
      </div>
      <div className="flex-1 overflow-hidden p-6">
        <KanbanBoard jobId={id!} initialData={pipeline} />
      </div>
    </div>
  );
}
