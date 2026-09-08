import { PipelineStage, Application } from '../../types';
import { CandidateCard } from './CandidateCard';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';

interface KanbanColumnProps {
  stage: PipelineStage;
  applications: Application[];
}

export function KanbanColumn({ stage, applications }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: {
      type: 'Column',
      stage,
    },
  });

  return (
    <div className="flex flex-col flex-shrink-0 w-80 bg-slate-900/30 rounded-xl border border-slate-800 h-full max-h-full">
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: stage.color }} />
          <h3 className="font-semibold text-slate-200">{stage.name}</h3>
          <span className="bg-slate-800 text-slate-300 text-xs py-0.5 px-2 rounded-full font-medium">
            {applications.length}
          </span>
        </div>
      </div>

      <div
        ref={setNodeRef}
        className={`flex-1 overflow-y-auto p-3 space-y-3 transition-colors ${isOver ? 'bg-brand-500/5' : ''}`}
      >
        <SortableContext items={applications.map(a => a.id)} strategy={verticalListSortingStrategy}>
          {applications.map(app => (
            <CandidateCard key={app.id} application={app} />
          ))}
        </SortableContext>

        {applications.length === 0 && (
          <div className="text-center p-4 border border-dashed border-slate-700/50 rounded-lg text-slate-500 text-sm">
            Drag candidates here
          </div>
        )}
      </div>
    </div>
  );
}
