import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Mail, Phone, Calendar, ArrowLeft, Upload, Trash2 } from 'lucide-react';
import { useApplication, useDeleteApplication } from '../../api/applications';
import { useFiles, useUploadFile } from '../../api/files';
import { usePipeline } from '../../api/pipeline';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Spinner } from '../ui/Spinner';
import { useUiStore } from '../../store/ui';
import { Notes } from './Notes';
import { StageHistory } from './StageHistory';
import { FileList } from './FileList';
import { CvViewer } from './CvViewer';
import { formatDate } from '../../utils/format';

export function ApplicantProfile() {
  const { id } = useParams<{ id: string }>();
  const { data: app, isLoading } = useApplication(id!);
  const { data: files } = useFiles(id!);
  const uploadFile = useUploadFile(id!);
  const { data: pipeline } = usePipeline(app?.job_id ?? '');
  const deleteApplication = useDeleteApplication();
  const addToast = useUiStore((st) => st.addToast);
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }
  if (!app) return <p className="text-slate-400">Application not found.</p>;

  const cvFile = files?.find((f) => f.file_type === 'cv');
  const stage = pipeline?.stages.find((st) => st.id === app.stage_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link to="/app/applicants" className="p-2 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors">
          <ArrowLeft size={16} />
        </Link>
        <div>
          <h2 className="text-xl font-bold text-slate-100">{app.candidate_name}</h2>
          <p className="text-sm text-slate-400">{app.candidate_email}</p>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <Badge dotColor={stage?.color ?? '#6366f1'}>
            {stage?.name ?? 'Unknown stage'}
          </Badge>
          <button
            type="button"
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete application"
            className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      <Modal
        open={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        title="Delete application"
        size="sm"
      >
        <p className="text-sm text-slate-300">
          Permanently delete <span className="font-medium text-slate-100">{app.candidate_name}</span>'s
          application, including notes and uploaded files? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>Cancel</Button>
          <Button
            variant="danger"
            isLoading={deleteApplication.isPending}
            onClick={() =>
              deleteApplication.mutate(id!, {
                onSuccess: () => {
                  addToast({ title: 'Application deleted', description: app.candidate_name, variant: 'success' });
                  navigate('/app/applicants');
                },
                onError: () =>
                  addToast({ title: 'Could not delete application', description: 'Please try again.', variant: 'error' }),
              })
            }
          >
            Delete
          </Button>
        </div>
      </Modal>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Left: CV + files */}
        <div className="lg:col-span-3 space-y-4">
          {cvFile ? (
            <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
              <CvViewer file={cvFile} appId={id!} />
            </div>
          ) : (
            <div className="bg-slate-900 rounded-xl border border-dashed border-slate-700 p-8 flex flex-col items-center gap-3 text-slate-500">
              <Upload size={28} />
              <p className="text-sm">No CV uploaded</p>
              <label className="cursor-pointer px-4 py-2 bg-slate-800 hover:bg-slate-700 text-sm text-slate-300 rounded-lg transition-colors">
                Upload CV
                <input
                  type="file"
                  className="hidden"
                  accept=".pdf,.doc,.docx"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadFile.mutate({ file, fileType: 'cv' });
                  }}
                />
              </label>
            </div>
          )}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <FileList appId={id!} />
          </div>
        </div>

        {/* Right: info + notes + history */}
        <div className="lg:col-span-2 space-y-4">
          {/* Contact info */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-slate-300">Contact</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-400">
                <Mail size={13} /> <span>{app.candidate_email}</span>
              </div>
              {app.candidate_phone && (
                <div className="flex items-center gap-2 text-slate-400">
                  <Phone size={13} /> <span>{app.candidate_phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-slate-400">
                <Calendar size={13} /> <span>Applied {formatDate(app.applied_at)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <Notes appId={id!} />
          </div>

          {/* Stage history */}
          <div className="bg-slate-900 rounded-xl border border-slate-800 p-4">
            <StageHistory appId={id!} />
          </div>
        </div>
      </div>
    </div>
  );
}
