import { useState } from 'react';
import { Briefcase, LayoutDashboard, FileUp, UploadCloud, Search, Menu, X, Sparkles, Activity, TrendingUpIcon } from 'lucide-react';
import { cn, initials } from '../lib/utils';
import { useApp } from '../context/AppContext';

export const NAV_SCREENS = {
  SOURCE: 'source',
  RESUME: 'resume',
  DASHBOARD: 'dashboard',
  EXPLORER: 'explorer',
};

const NAV_ITEMS = [
  { id: 'source', label: 'Job Source', icon: UploadCloud },
  { id: 'resume', label: 'Resume', icon: FileUp },
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'explorer', label: 'Job Explorer', icon: Search },
  { id: 'recent', label: 'Recent Activity', icon: Activity },
  { id: 'trending', label: '`Trending Skills', icon: TrendingUpIcon },
];

export function Layout({ active, onNavigate, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { profile, jobs, applications } = useApp();

  const navContent = (
    <div className="flex flex-col h-full bg-blue-100">
      <div className="flex items-center gap-2.5 px-5 h-16 shrink-0">
        <div className="w-9 h-9  bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center shadow-md">
          <Briefcase className="text-white" size={20} />
        </div>
        <div>
          <p className="font-display font-extrabold text-slate-900 text-[15px] leading-tight">JobPilot</p>
          <p className="text-[10px] text-slate-400 font-medium tracking-wide">JOB MANAGEMENT</p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">Menu</p>
        <div className='grid gap-6 pt-8'>
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = active === item.id;
            const count = item.id === 'explorer' ? jobs.length : item.id === 'dashboard' ? applications.length : 0;
            return (
              <button
                key={item.id}
                onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                className={cn(
                  'w-full flex items-center gap-4 px-3 py-2.5  text-sm font-medium transition-all duration-150 group relative',
                  isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-white',
                )}
              >
                {isActive && <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-brand-600" />}
                <Icon size={18} className={cn(isActive ? 'text-brand-600' : 'text-slate-400 group-hover:text-slate-600')} />
                <span className="flex-1 text-left">{item.label}</span>
                {count > 0 && (
                  <span className={cn('text-[10px] font-bold px-1.5 py-0.5 ', isActive ? 'bg-brand-200 text-brand-800' : 'bg-slate-200 text-slate-600')}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </nav>

      <div className="p-3 shrink-0">
        <div className=" bg-gradient-to-br from-brand-50 to-slate-50 border border-slate-200/60 p-3.5">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles size={14} className="text-brand-600" />
            <p className="text-xs font-bold text-slate-700">AI Matching</p>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed mb-2.5">Upload your resume to unlock smart job matching and ATS scoring.</p>
          <button onClick={() => { onNavigate('resume'); setMobileOpen(false); }} className="w-full text-xs font-semibold text-brand-700 hover:text-brand-800 transition-colors">
            Get started →
          </button>
        </div>
        <div className="flex items-center gap-2.5 px-2 pt-3 mt-2 border-t border-slate-100">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white text-xs font-bold">
            {initials(profile?.name)}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-slate-700 truncate">{profile?.name || 'Guest User'}</p>
            <p className="text-[10px] text-slate-400 truncate">{profile?.email || 'No profile yet'}</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      <aside className="hidden lg:flex w-64 shrink-0 bg-white border-r border-slate-200/80 flex-col sticky top-0 h-screen">
        {navContent}
      </aside>

      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm lg:hidden" onClick={() => setMobileOpen(false)} />
          <aside className="fixed left-0 top-0 bottom-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col lg:hidden animate-slide-in">
            {navContent}
          </aside>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="lg:hidden sticky top-0 z-30 glass border-b border-slate-200/80 px-4 h-14 flex items-center gap-3">
          <button onClick={() => setMobileOpen(true)} className="p-2 -ml-2  hover:bg-slate-100">
            <Menu size={20} className="text-slate-700" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7  bg-gradient-to-br from-brand-500 to-brand-700 flex items-center justify-center">
              <Briefcase className="text-white" size={16} />
            </div>
            <span className="font-display font-extrabold text-slate-900">JobPilot</span>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>

      {mobileOpen && (
        <button className="fixed top-3 right-3 z-50 p-2  bg-white shadow-md lg:hidden" onClick={() => setMobileOpen(false)}>
          <X size={18} className="text-slate-600" />
        </button>
      )}
    </div>
  );
}
