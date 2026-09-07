import { TimeToHireChart } from '../../components/charts/TimeToHireChart';
import { ConversionChart } from '../../components/charts/ConversionChart';

export default function ReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-100">Reports</h2>
        <p className="text-sm text-slate-400 mt-0.5">Hiring analytics and pipeline performance</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Time to Hire</h3>
          <p className="text-xs text-slate-500 mb-5">Average days from application to hire, by month</p>
          <TimeToHireChart />
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Pipeline Conversion</h3>
          <p className="text-xs text-slate-500 mb-5">Percentage of candidates advancing through each stage</p>
          <ConversionChart />
        </div>
      </div>
    </div>
  );
}
