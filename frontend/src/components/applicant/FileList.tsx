import { Paperclip, Trash2, Download, FileText } from 'lucide-react';
import { useFiles, useDeleteFile } from '../../api/files';
import { Spinner } from '../ui/Spinner';
import { formatBytes } from '../../utils/format';

export function FileList({ appId }: { appId: string }) {
  const { data: files, isLoading } = useFiles(appId);
  const deleteFile = useDeleteFile(appId);

  if (isLoading) return <div className="flex justify-center py-4"><Spinner size="sm" /></div>;

  if (!files?.length) {
    return <p className="text-sm text-slate-500">No files uploaded.</p>;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <Paperclip size={14} /> Files
      </h3>
      <ul className="space-y-2">
        {files.map((f) => (
          <li
            key={f.id}
            className="flex items-center justify-between bg-slate-800/60 rounded-lg px-3 py-2"
          >
            <div className="flex items-center gap-2 min-w-0">
              <FileText size={14} className="text-slate-400 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-sm text-slate-200 truncate">{f.filename}</p>
                <p className="text-xs text-slate-500">{formatBytes(f.size_bytes)} · {f.file_type}</p>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
              <a
                href={`/api/v1/applications/${appId}/files/${f.id}`}
                target="_blank"
                rel="noreferrer"
                className="p-1.5 rounded text-slate-500 hover:text-brand-400 transition-colors"
              >
                <Download size={14} />
              </a>
              <button
                onClick={() => deleteFile.mutate(f.id)}
                className="p-1.5 rounded text-slate-500 hover:text-rose-400 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
