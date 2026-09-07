import { useState } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { Spinner } from '../ui/Spinner';
import type { ApplicationFile } from '../../types';

pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

interface CvViewerProps {
  file: ApplicationFile;
  appId: string;
}

export function CvViewer({ file, appId }: CvViewerProps) {
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);

  const src = `/api/v1/applications/${appId}/files/${file.id}`;

  if (!file.content_type.includes('pdf')) {
    return (
      <div className="flex flex-col items-center justify-center h-64 bg-slate-800/60 rounded-xl border border-slate-700 gap-3">
        <p className="text-sm text-slate-400">{file.filename}</p>
        <a
          href={src}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm rounded-lg transition-colors"
        >
          <Download size={14} /> Download file
        </a>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="w-full rounded-xl overflow-hidden border border-slate-700 bg-slate-800/40">
        <Document
          file={src}
          onLoadSuccess={({ numPages }) => setNumPages(numPages)}
          loading={<div className="flex justify-center py-12"><Spinner size="lg" /></div>}
        >
          <Page
            pageNumber={page}
            renderTextLayer={false}
            renderAnnotationLayer={false}
            className="max-w-full"
          />
        </Document>
      </div>
      {numPages > 1 && (
        <div className="flex items-center gap-3 text-sm text-slate-400">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="p-1 hover:text-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span>Page {page} / {numPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(numPages, p + 1))}
            disabled={page === numPages}
            className="p-1 hover:text-slate-100 disabled:opacity-30 transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  );
}
