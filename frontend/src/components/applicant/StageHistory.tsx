import { Clock, ArrowRight } from 'lucide-react';
import { useStageHistory } from '../../api/files';
import { Spinner } from '../ui/Spinner';
import { formatRelative } from '../../utils/format';

export function StageHistory({ appId }: { appId: string }) {
  const { data: history, isLoading } = useStageHistory(appId);

  if (isLoading) return <div className="flex justify-center py-4"><Spinner size="sm" /></div>;

  if (!history?.length) {
    return <p className="text-sm text-slate-500">No stage changes yet.</p>;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <Clock size={14} /> Stage History
      </h3>
      <ol className="relative border-l border-slate-700 ml-2 space-y-4">
        {history.map((entry) => (
          <li key={entry.id} className="ml-4">
            <span className="absolute -left-1.5 mt-1 h-3 w-3 rounded-full border-2 border-slate-700 bg-brand-500" />
            <div className="flex items-center gap-1.5 text-sm text-slate-300">
              {entry.from_stage_name && (
                <>
                  <span className="text-slate-500">{entry.from_stage_name}</span>
                  <ArrowRight size={12} className="text-slate-600" />
                </>
              )}
              <span className="font-medium text-slate-100">{entry.to_stage_name}</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              by {entry.moved_by_name} · {formatRelative(entry.moved_at)}
            </p>
          </li>
        ))}
      </ol>
    </div>
  );
}
