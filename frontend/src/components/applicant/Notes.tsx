import { useState } from 'react';
import { Trash2, Plus, FileText } from 'lucide-react';
import { useNotes, useAddNote, useDeleteNote } from '../../api/files';
import { useAuthStore } from '../../store/auth';
import { Avatar } from '../ui/Avatar';
import { Spinner } from '../ui/Spinner';
import { formatRelative } from '../../utils/format';

export function Notes({ appId }: { appId: string }) {
  const [body, setBody] = useState('');
  const { data: notes, isLoading } = useNotes(appId);
  const addNote = useAddNote(appId);
  const deleteNote = useDeleteNote(appId);
  const user = useAuthStore((s) => s.user);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!body.trim()) return;
    addNote.mutate(body, { onSuccess: () => setBody('') });
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <FileText size={14} /> Notes
      </h3>

      <form onSubmit={submit} className="space-y-2">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a note…"
          rows={3}
          className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none"
        />
        <button
          type="submit"
          disabled={!body.trim() || addNote.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
        >
          <Plus size={12} /> Add note
        </button>
      </form>

      {isLoading ? (
        <div className="flex justify-center py-4"><Spinner size="sm" /></div>
      ) : (
        <ul className="space-y-3">
          {(notes ?? []).map((note) => (
            <li key={note.id} className="bg-slate-800/60 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Avatar name={note.user_name || 'U'} size="sm" />
                  <div>
                    <span className="text-xs font-medium text-slate-300">{note.user_name}</span>
                    <span className="text-xs text-slate-500 ml-2">{formatRelative(note.created_at)}</span>
                  </div>
                </div>
                {user?.id === note.user_id && (
                  <button
                    onClick={() => deleteNote.mutate(note.id)}
                    className="p-1 rounded text-slate-600 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>
              <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{note.body}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
