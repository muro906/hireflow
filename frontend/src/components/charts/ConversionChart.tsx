import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { useConversion } from '../../api/reports';
import { Spinner } from '../ui/Spinner';

const COLOURS = ['#6366f1', '#8b5cf6', '#f59e0b', '#10b981', '#ef4444'];

export function ConversionChart() {
  const { data, isLoading } = useConversion();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!data?.stages?.length) {
    return (
      <div className="flex items-center justify-center h-64 text-slate-500">
        No pipeline data yet
      </div>
    );
  }

  const chartData = data.stages.map((s) => ({
    name: s.name,
    entered: s.entered,
    rate: Math.round(s.conversion_rate * 100),
  }));

  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={chartData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
        <XAxis dataKey="name" stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} />
        <YAxis stroke="#64748b" tick={{ fill: '#94a3b8', fontSize: 12 }} unit="%" />
        <Tooltip
          contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
          labelStyle={{ color: '#f1f5f9' }}
          itemStyle={{ color: '#94a3b8' }}
          formatter={(v: number) => [`${v}%`, 'Conversion rate']}
        />
        <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
          {chartData.map((_e, i) => (
            <Cell key={i} fill={COLOURS[i % COLOURS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
