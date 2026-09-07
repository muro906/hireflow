import { useParams, Link } from 'react-router-dom';
import { Mail, Phone, Calendar, ArrowLeft, Upload } from 'lucide-react';
import { useApplication } from '../../api/applications';
import { useFiles, useUploadFile } from '../../api/files';
import { Badge } from '../ui/Badge';
import { Spinner } from '../ui/Spinner';
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

  if (isLoading) {
    return <div className="flex justify-center py-20"><Spinner size="lg" /></div>;
  }
  if (!app) return <p className="text-slate-400">Application not found.</p>;

  const cvFile = files?.find((f) => f.file_type === 'cv');

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
        <Badge variant="stage" color="#6366f1" className="ml-auto">
          Stage
        </Badge>
      </div>

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
