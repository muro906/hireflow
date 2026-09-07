import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { useJobs } from '../api/jobs';
import { Briefcase, Users, Clock, ArrowRight } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Link } from 'react-router-dom';

export default function DashboardPage() {
  const { data, isLoading } = useJobs();

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold text-slate-100 tracking-tight">Dashboard</h1>
        <p className="text-slate-400 mt-1">Here is what is happening with your hiring today.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Open Jobs</CardTitle>
            <Briefcase className="h-4 w-4 text-brand-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{isLoading ? '-' : data?.total || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Applications (This Month)</CardTitle>
            <Users className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">142</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Avg Time to Hire</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">18 days</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Applications</CardTitle>
              <p className="text-sm text-slate-400 mt-1">Latest candidates who applied to your open roles.</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link to="/app/applicants">View All <ArrowRight className="ml-2 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-sm text-slate-400 py-8 text-center border border-dashed border-slate-800 rounded-lg">
              No recent applications. Check back later.
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button className="w-full justify-start" variant="secondary" asChild>
              <Link to="/app/jobs/create"><Briefcase className="mr-2 h-4 w-4" /> Create New Job</Link>
            </Button>
            <Button className="w-full justify-start" variant="secondary" asChild>
              <Link to="/app/reports"><BarChart2 className="mr-2 h-4 w-4" /> View Reports</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
// Import required for the Quick Actions
import { BarChart2 } from 'lucide-react';
