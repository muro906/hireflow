import { Application } from '../../types';
import { formatRelativeDate } from '../../utils/format';
import { Calendar, Mail } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function CandidateCard({ application }: { application: Application }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: application.id,
    data: {
      type: 'Application',
      application,
    }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="bg-slate-900 border border-slate-800 rounded-lg p-4 shadow-sm cursor-grab active:cursor-grabbing hover:border-slate-700 transition-colors"
    >
      <div className="font-medium text-slate-200 mb-1">{application.candidate_name}</div>
      <div className="flex flex-col gap-1.5 text-xs text-slate-400">
        <div className="flex items-center gap-1.5">
          <Mail className="w-3.5 h-3.5" />
          <span className="truncate">{application.candidate_email}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" />
          <span>{formatRelativeDate(application.applied_at)}</span>
        </div>
      </div>
    </div>
  );
}
