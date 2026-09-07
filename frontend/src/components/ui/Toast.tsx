import * as React from 'react';
import { useUiStore } from '../../store/ui';
import { cn } from '../../utils/cn';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useUiStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'pointer-events-auto flex w-full max-w-sm items-start gap-3 rounded-lg p-4 shadow-lg transition-all',
            'glass bg-slate-900/90 text-slate-100 border-slate-700'
          )}
        >
          {toast.variant === 'success' && <CheckCircle className="h-5 w-5 text-emerald-500" />}
          {toast.variant === 'error' && <AlertCircle className="h-5 w-5 text-rose-500" />}
          {toast.variant === 'warning' && <AlertTriangle className="h-5 w-5 text-amber-500" />}
          {toast.variant === 'info' && <Info className="h-5 w-5 text-blue-500" />}
          {(!toast.variant || toast.variant === 'default') && <Info className="h-5 w-5 text-slate-400" />}
          
          <div className="flex-1">
            <h3 className="text-sm font-medium">{toast.title}</h3>
            {toast.description && <p className="mt-1 text-sm text-slate-400">{toast.description}</p>}
          </div>
          <button onClick={() => removeToast(toast.id)} className="text-slate-400 hover:text-slate-200">
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
