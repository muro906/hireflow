import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { useTimeToHire } from '../../api/reports';
import { Spinner } from '../ui/Spinner';
import { format, parseISO } from 'date-fns';

export function TimeToHireChart() {
  const { data, isLoading } = useTimeToHire();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data?.length) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        No hiring data yet
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    month: format(parseISO(d.month), 'MMM yy'),
    avg_days: Math.round(d.avg_days),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={formatted} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="month" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} unit=" d" />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#f1f5f9' }}
          itemStyle={{ color: '#94a3b8' }}
          formatter={(v: number) => [`${v} days`, 'Avg. time to hire']}
        />
        <Legend wrapperStyle={{ color: '#94a3b8', fontSize: 12 }} />
        <Bar dataKey="avg_days" name="Avg days to hire" fill="#6366f1" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
