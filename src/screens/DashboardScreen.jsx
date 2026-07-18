import { useMemo } from 'react';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, BarElement, ArcElement,
  PointElement, LineElement, Tooltip, Legend, Filler,
} from 'chart.js';
import { Briefcase, Bookmark, Send, TrendingUp, MapPin, Building2, Sparkles, ArrowRight, Calendar, Clock } from 'lucide-react';
import { Card, Badge, Button, Skeleton, EmptyState } from '../components/ui';
import { useApp } from '../context/AppContext';
import { APPLICATION_STATUS_META } from '../types';
import { cn, initials, formatDate } from '../lib/utils';
  import ApplicationsOverTimeChart from '../components/ApplicationsOverTimeChart';

ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, PointElement, LineElement, Tooltip, Legend, Filler);

export function DashboardScreen({ onNavigate }) {
  const { profile, jobs, savedJobs, applications, loading } = useApp();

  const stats = useMemo(() => {
    const byStatus = { saved: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
    applications.forEach((a) => { byStatus[a.status] = (byStatus[a.status] || 0) + 1; });

    const bySource = {};
    jobs.forEach((j) => { if (j.source) bySource[j.source] = (bySource[j.source] || 0) + 1; });

    const byLocation = {};
    jobs.forEach((j) => { if (j.location) byLocation[j.location] = (byLocation[j.location] || 0) + 1; });

    // Jobs imported per day (14 days)
    const days = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      const count = jobs.filter((j) => j.created_at.startsWith(key)).length;
      days.push({ label: d.toLocaleDateString('en', { month: 'short', day: 'numeric' }), count });
    }

    // --- NEW: Last 10 applied jobs (by applied_at or created_at) ---
    const appliedJobs = applications
      .filter((a) => a.status === 'applied' || a.applied_at)
      .sort((a, b) => new Date(b.applied_at || b.created_at) - new Date(a.applied_at || a.created_at))
      .slice(0, 10)
      .map((a) => {
        const job = jobs.find((j) => j.id === a.job_id);
        return job ? { title: job.title, company: job.company, date: a.applied_at || a.created_at, status: a.status } : null;
      })
      .filter(Boolean);

    // --- NEW: Application counts for last week, month, year ---
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
    const monthAgo = new Date(); monthAgo.setMonth(monthAgo.getMonth() - 1);
    const yearAgo = new Date(); yearAgo.setFullYear(yearAgo.getFullYear() - 1);

    const countSince = (cutoff) => applications.filter((a) => {
      const d = new Date(a.applied_at || a.created_at);
      return d >= cutoff;
    }).length;

    const appliedLastWeek = countSince(weekAgo);
    const appliedLastMonth = countSince(monthAgo);
    const appliedLastYear = countSince(yearAgo);

    return { byStatus, bySource, byLocation, days, appliedJobs, appliedLastWeek, appliedLastMonth, appliedLastYear };
  }, [jobs, applications]);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Skeleton className="h-8 w-48 mb-6" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid lg:grid-cols-2 gap-4">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  const kpis = [
    { label: 'Total Jobs', value: jobs.length, icon: Briefcase, color: 'brand' },
    { label: 'Saved Jobs', value: savedJobs.length, icon: Bookmark, color: 'amber' },
    { label: 'Applications', value: applications.length, icon: Send, color: 'blue' },
    { label: 'Interviews', value: stats.byStatus.interview + stats.byStatus.offer, icon: TrendingUp, color: 'emerald' },
  ];

  const colorMap = {
    brand: { bg: 'bg-brand-50', text: 'text-brand-600', ring: 'ring-brand-100' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', ring: 'ring-amber-100' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', ring: 'ring-blue-100' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', ring: 'ring-emerald-100' },
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">Dashboard</h1>
          <p className="text-slate-500 text-sm">Your job search overview and analytics.</p>
        </div>
        <Button onClick={() => onNavigate('explorer')} icon={<ArrowRight size={16} />}>Explore Jobs</Button>
      </header>

      {/* Profile banner */}
      <Card className="p-5 mb-6 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-brand-50 to-transparent rounded-full -translate-y-1/2 translate-x-1/3" />
        <div className="relative flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-lg font-bold shrink-0">
            {initials(profile?.name)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-bold text-slate-900 text-lg truncate">{profile?.name || 'Guest User'}</h2>
            <p className="text-sm text-slate-500 truncate">{profile?.title || 'No title set'}{profile?.email ? ` • ${profile.email}` : ''}</p>
            {profile?.skills && profile.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {profile.skills.slice(0, 5).map((s) => (
                  <Badge key={s} className="bg-brand-50 text-brand-700 text-[10px]">{s}</Badge>
                ))}
                {profile.skills.length > 5 && <Badge className="bg-slate-100 text-slate-500 text-[10px]">+{profile.skills.length - 5}</Badge>}
              </div>
            )}
          </div>
          {!profile && (
            <Button variant="outline" size="sm" onClick={() => onNavigate('resume')} icon={<Sparkles size={14} />}>Upload Resume</Button>
          )}
        </div>
      </Card>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => {
          const c = colorMap[kpi.color];
          const Icon = kpi.icon;
          return (
            <Card key={kpi.label} className="p-5 hover:card-shadow-lg transition-shadow duration-200">
              <div className="flex items-center justify-between mb-3">
                <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center ring-4', c.bg, c.text, c.ring)}>
                  <Icon size={20} />
                </div>
              </div>
              <p className="text-2xl sm:text-3xl font-extrabold text-slate-900">{kpi.value}</p>
              <p className="text-xs text-slate-500 font-medium mt-0.5">{kpi.label}</p>
            </Card>
          );
        })}
      </div>

      {/* {/* NEW: Application timeline KPIs (week / month / year) */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
            <Clock size={18} />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">{stats.appliedLastWeek}</p>
            <p className="text-[11px] text-slate-500 font-medium">Applied (last week)</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center text-brand-600 shrink-0">
            <Calendar size={18} />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">{stats.appliedLastMonth}</p>
            <p className="text-[11px] text-slate-500 font-medium">Applied (last month)</p>
          </div>
        </Card>
        <Card className="p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp size={18} />
          </div>
          <div>
            <p className="text-xl sm:text-2xl font-extrabold text-slate-900">{stats.appliedLastYear}</p>
            <p className="text-[11px] text-slate-500 font-medium">Applied (last year)</p>
          </div>
        </Card>
      </div>
 */}
       <ApplicationsOverTimeChart />

      {/* Charts row 1 */}
      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Application Status</h3>
          {applications.length === 0 ? (
            <EmptyState icon={<Send size={24} />} title="No applications yet" description="Start applying to jobs from the explorer." />
          ) : (
            <div className="flex items-center justify-center">
              <Doughnut
                data={{
                  labels: Object.values(APPLICATION_STATUS_META).map((m) => m.label),
                  datasets: [{
                    data: Object.keys(APPLICATION_STATUS_META).map((s) => stats.byStatus[s] || 0),
                    backgroundColor: ['#94a3b8', '#3b82f6', '#f59e0b', '#10b981', '#f43f5e'],
                    borderWidth: 0, hoverOffset: 4,
                  }],
                }}
                options={{ cutout: '65%', plugins: { legend: { position: 'bottom', labels: { padding: 12, font: { size: 11 }, usePointStyle: true, pointStyle: 'circle' } } } }}
              />
            </div>
          )}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Jobs by Source</h3>
          {jobs.length === 0 ? (
            <EmptyState icon={<Building2 size={24} />} title="No jobs imported" description="Import jobs from the Job Source screen." />
          ) : (
            <Bar
              data={{
                labels: Object.keys(stats.bySource),
                datasets: [{ label: 'Jobs', data: Object.values(stats.bySource), backgroundColor: '#0ea5e9', borderRadius: 6, maxBarThickness: 40 }],
              }}
              options={{
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } }, x: { ticks: { font: { size: 11 } } } },
                maintainAspectRatio: true,
              }}
            />
          )}
        </Card>
      </div>

      {/* NEW: Last 10 Applied Jobs chart */}
      <Card className="p-5 mb-6">
        <h3 className="font-bold text-slate-800 text-sm mb-4">Last 10 Applied Jobs</h3>
        {stats.appliedJobs.length === 0 ? (
          <EmptyState icon={<Send size={24} />} title="No applications yet" description="Jobs you apply to will appear here in a timeline." />
        ) : (
          <Bar
            data={{
              labels: stats.appliedJobs.map((j, i) => `#${i + 1}`),
              datasets: [{
                label: 'Application',
                data: stats.appliedJobs.map((_, i) => stats.appliedJobs.length - i),
                backgroundColor: stats.appliedJobs.map((j) =>
                  j.status === 'offer' ? '#10b981' : j.status === 'interview' ? '#f59e0b' : j.status === 'rejected' ? '#f43f5e' : '#3b82f6'
                ),
                borderRadius: 6,
                maxBarThickness: 35,
              }],
            }}
            options={{
              indexAxis: 'y',
              plugins: {
                legend: { display: false },
                tooltip: {
                  callbacks: {
                    title: (ctx) => stats.appliedJobs[ctx[0].dataIndex]?.title || '',
                    label: (ctx) => {
                      const j = stats.appliedJobs[ctx.dataIndex];
                      return [`${j.company || '—'}`, `Applied: ${formatDate(j.date)}`, `Status: ${APPLICATION_STATUS_META[j.status]?.label || j.status}`];
                    },
                  },
                },
              },
              scales: { x: { display: false }, y: { ticks: { font: { size: 11 } } } },
              maintainAspectRatio: true,
            }}
          />
        )}
      </Card>

      {/* Charts row 2 */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Jobs Imported (14 days)</h3>
          {jobs.length === 0 ? (
            <EmptyState icon={<TrendingUp size={24} />} title="No data yet" />
          ) : (
            <Line
              data={{
                labels: stats.days.map((d) => d.label),
                datasets: [{
                  label: 'Jobs', data: stats.days.map((d) => d.count),
                  borderColor: '#0ea5e9', backgroundColor: 'rgba(14, 165, 233, 0.1)',
                  fill: true, tension: 0.35, pointBackgroundColor: '#0284c7', pointRadius: 3, pointHoverRadius: 5,
                }],
              }}
              options={{
                plugins: { legend: { display: false } },
                scales: { y: { beginAtZero: true, ticks: { precision: 0, font: { size: 11 } } }, x: { ticks: { font: { size: 10 }, maxRotation: 0 } } },
                maintainAspectRatio: true,
              }}
            />
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Top Locations</h3>
          {jobs.length === 0 ? (
            <EmptyState icon={<MapPin size={24} />} title="No data yet" />
          ) : (
            <div className="space-y-2.5">
              {Object.entries(stats.byLocation).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([loc, count]) => {
                const pct = Math.round((count / jobs.length) * 100);
                return (
                  <div key={loc} className="flex items-center gap-3">
                    <span className="text-sm text-slate-700 w-32 truncate shrink-0">{loc}</span>
                    <div className="flex-1 h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-brand-400 to-brand-600 transition-all duration-500" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs font-semibold text-slate-500 w-8 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Recent applications */}
      {applications.length > 0 && (
        <Card className="p-5 mt-6">
          <h3 className="font-bold text-slate-800 text-sm mb-4">Recent Applications</h3>
          <div className="divide-y divide-slate-100">
            {applications.slice(0, 5).map((app) => {
              const job = jobs.find((j) => j.id === app.job_id);
              if (!job) return null;
              const meta = APPLICATION_STATUS_META[app.status];
              return (
                <div key={app.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                    <Building2 size={15} className="text-slate-500" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-800 truncate">{job.title}</p>
                    <p className="text-xs text-slate-500 truncate">{job.company} • {formatDate(app.applied_at || app.created_at)}</p>
                  </div>
                  <Badge className={meta.color} dot={meta.dot}>{meta.label}</Badge>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
