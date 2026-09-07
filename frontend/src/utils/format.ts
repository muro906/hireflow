import { format, formatDistanceToNow } from 'date-fns';

export function formatDate(dateString: string | undefined): string {
  if (!dateString) return '';
  return format(new Date(dateString), 'MMM d, yyyy');
}

export function formatDateTime(dateString: string | undefined): string {
  if (!dateString) return '';
  return format(new Date(dateString), 'MMM d, yyyy HH:mm');
}

/** Alias used throughout applicant components */
export const formatRelative = formatRelativeDate;

export function formatRelativeDate(dateString: string | undefined): string {
  if (!dateString) return '';
  return formatDistanceToNow(new Date(dateString), { addSuffix: true });
}

export function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}
