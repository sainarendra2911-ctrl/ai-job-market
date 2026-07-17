import { useMemo, useState, useCallback } from 'react';
import {
  Search, Bookmark, BookmarkCheck, ChevronLeft, ChevronRight, ExternalLink,
  ArrowUpDown, ArrowUp, ArrowDown, Download, Filter, X, SlidersHorizontal, Briefcase, MapPin, Building2, Trophy,
} from 'lucide-react';
import { Card, Badge, Button, Input, Select, Label, EmptyState, Modal } from '../components/ui';
import { useApp } from '../context/AppContext';
import { rankJobsByATS, atsScoreColor } from '../lib/ats';
import {
  DEFAULT_FILTERS, WORK_MODES, EMPLOYMENT_TYPES, SOURCES,
  APPLICATION_STATUS_META,
} from '../types';
import { cn, formatSalary, formatExperience, formatDate, timeAgo, toCSV, downloadFile } from '../lib/utils';
import { jobsToExportRows } from '../lib/jobImport';

const PAGE_SIZE = 10;

export function JobExplorerScreen() {
  const { jobsWithMeta, jobs, saveJob, unsaveJob, setApplicationStatus, profile } = useApp();
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState('posted_date');
  const [sortDir, setSortDir] = useState('desc');
  const [page, setPage] = useState(1);
  const [skillsInput, setSkillsInput] = useState('');
  const [detailJob, setDetailJob] = useState(null);
  const [togglingId, setTogglingId] = useState(null);
  const [atsMode, setAtsMode] = useState(false);

  const allMeta = useMemo(() => jobsWithMeta(), [jobsWithMeta]);

  // ATS ranked jobs (when atsMode is on)
  const atsRanked = useMemo(() => {
    if (!atsMode || !profile) return [];
    return rankJobsByATS(profile, jobs);
  }, [atsMode, profile, jobs]);

  const filterOptions = useMemo(() => {
    const locations = [...new Set(jobs.map((j) => j.location).filter(Boolean))];
    const companies = [...new Set(jobs.map((j) => j.company).filter(Boolean))];
    return { locations, companies };
  }, [jobs]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.role) n++;
    if (filters.skills.length) n++;
    if (filters.experienceMin != null) n++;
    if (filters.experienceMax != null) n++;
    if (filters.location) n++;
    if (filters.salaryMin != null) n++;
    if (filters.salaryMax != null) n++;
    if (filters.workMode) n++;
    if (filters.company) n++;
    if (filters.employmentType) n++;
    if (filters.postedWithinDays != null) n++;
    if (filters.source) n++;
    return n;
  }, [filters]);

  const sourceData = atsMode ? atsRanked : allMeta;

  const filtered = useMemo(() => {
    let result = [...sourceData];
    const search = filters.search.trim().toLowerCase();
    if (search) {
      result = result.filter((j) =>
        j.title.toLowerCase().includes(search) ||
        (j.company?.toLowerCase().includes(search)) ||
        (j.description?.toLowerCase().includes(search)) ||
        j.skills.some((s) => s.toLowerCase().includes(search)) ||
        j.keywords.some((k) => k.toLowerCase().includes(search))
      );
    }
    if (filters.role) result = result.filter((j) => j.title.toLowerCase().includes(filters.role.toLowerCase()));
    if (filters.skills.length) result = result.filter((j) => filters.skills.every((s) => j.skills.some((js) => js.toLowerCase().includes(s.toLowerCase()))));
    if (filters.experienceMin != null) result = result.filter((j) => (j.experience_max ?? 0) >= filters.experienceMin);
    if (filters.experienceMax != null) result = result.filter((j) => (j.experience_min ?? 0) <= filters.experienceMax);
    if (filters.location) result = result.filter((j) => j.location?.toLowerCase().includes(filters.location.toLowerCase()));
    if (filters.salaryMin != null) result = result.filter((j) => (j.salary_max ?? 0) >= filters.salaryMin);
    if (filters.salaryMax != null) result = result.filter((j) => (j.salary_min ?? Infinity) <= filters.salaryMax);
    if (filters.workMode) result = result.filter((j) => j.work_mode?.toLowerCase() === filters.workMode.toLowerCase());
    if (filters.company) result = result.filter((j) => j.company?.toLowerCase().includes(filters.company.toLowerCase()));
    if (filters.employmentType) result = result.filter((j) => j.employment_type?.toLowerCase() === filters.employmentType.toLowerCase());
    if (filters.source) result = result.filter((j) => j.source === filters.source);
    if (filters.postedWithinDays != null) {
      const cutoff = new Date();
      cutoff.setDate(cutoff.getDate() - filters.postedWithinDays);
      result = result.filter((j) => j.posted_date ? new Date(j.posted_date) >= cutoff : false);
    }

    if (!atsMode) {
      result.sort((a, b) => {
        let av = '', bv = '';
        switch (sortField) {
          case 'title': av = a.title.toLowerCase(); bv = b.title.toLowerCase(); break;
          case 'company': av = (a.company ?? '').toLowerCase(); bv = (b.company ?? '').toLowerCase(); break;
          case 'location': av = (a.location ?? '').toLowerCase(); bv = (b.location ?? '').toLowerCase(); break;
          case 'posted_date': av = a.posted_date ?? '1970-01-01'; bv = b.posted_date ?? '1970-01-01'; break;
          case 'salary_min': av = a.salary_min ?? 0; bv = b.salary_min ?? 0; break;
          case 'experience_min': av = a.experience_min ?? 0; bv = b.experience_min ?? 0; break;
        }
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [sourceData, filters, sortField, sortDir, atsMode]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageData = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const addSkill = () => {
    const s = skillsInput.trim();
    if (s && !filters.skills.includes(s)) {
      setFilters({ ...filters, skills: [...filters.skills, s] });
    }
    setSkillsInput('');
  };

  const removeSkill = (s) => setFilters({ ...filters, skills: filters.skills.filter((x) => x !== s) });
  const clearFilters = () => { setFilters(DEFAULT_FILTERS); setSkillsInput(''); setPage(1); };

  const toggleSave = useCallback(async (job) => {
    setTogglingId(job.id);
    try {
      if (job.is_saved) await unsaveJob(job.id);
      else await saveJob(job.id);
    } catch { /* ignore */ } finally {
      setTogglingId(null);
    }
  }, [saveJob, unsaveJob]);

  const handleExport = () => {
    const rows = jobsToExportRows(filtered);
    downloadFile('jobs-export.csv', toCSV(rows), 'text/csv');
  };

  const updateAppStatus = async (jobId, status) => {
    try { await setApplicationStatus(jobId, status); } catch { /* ignore */ }
  };

  const SortHeader = ({ field, label, className }) => (
    <button onClick={() => toggleSort(field)} className={cn('flex items-center gap-1 hover:text-slate-700 transition-colors', className)}>
      {label}
      {sortField === field ? (sortDir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="text-slate-300" />}
    </button>
  );

  if (jobs.length === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-6">Job Explorer</h1>
        <Card className="p-0">
          <EmptyState
            icon={<Briefcase size={28} />}
            title="No jobs to explore"
            description="Import jobs from the Job Source screen to start filtering, bookmarking, and applying."
          />
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1">Job Explorer</h1>
          <p className="text-slate-500 text-sm">{filtered.length} of {jobs.length} jobs{atsMode && ' (ATS sorted)'} match your filters.</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {profile && (
            <Button
              variant={atsMode ? 'primary' : 'outline'}
              size="md"
              icon={<Trophy size={16} />}
              onClick={() => { setAtsMode(!atsMode); setPage(1); }}
            >
              ATS Sort
            </Button>
          )}
          <Button variant="outline" size="md" icon={<Download size={16} />} onClick={handleExport} disabled={!filtered.length}>Export CSV</Button>
          <Button variant="outline" size="md" icon={<SlidersHorizontal size={16} />} onClick={() => setShowFilters(!showFilters)}>
            Filters{activeFilterCount > 0 && <span className="ml-1.5 px-1.5 py-0.5 rounded bg-brand-600 text-white text-[10px] font-bold">{activeFilterCount}</span>}
          </Button>
        </div>
      </header>

      {/* Search bar */}
      <div className="mb-4 relative">
        <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <Input
          placeholder="Search by title, company, skills, keywords…"
          value={filters.search}
          onChange={(e) => { setFilters({ ...filters, search: e.target.value }); setPage(1); }}
          className="pl-11 h-12 text-base"
        />
        {filters.search && (
          <button onClick={() => setFilters({ ...filters, search: '' })} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100">
            <X size={16} />
          </button>
        )}
      </div>

      {/* Filter panel */}
      {showFilters && (
        <Card className="p-5 mb-4 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter size={16} className="text-slate-500" />
              <h3 className="font-bold text-slate-800 text-sm">Advanced Filters</h3>
            </div>
            {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters} icon={<X size={14} />}>Clear all</Button>}
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            <div>
              <Label>Role</Label>
              <Input placeholder="e.g. Frontend Developer" value={filters.role} onChange={(e) => setFilters({ ...filters, role: e.target.value })} />
            </div>
            <div>
              <Label>Location</Label>
              <Select value={filters.location} onChange={(e) => setFilters({ ...filters, location: e.target.value })}>
                <option value="">Any location</option>
                {filterOptions.locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </Select>
            </div>
            <div>
              <Label>Company</Label>
              <Select value={filters.company} onChange={(e) => setFilters({ ...filters, company: e.target.value })}>
                <option value="">Any company</option>
                {filterOptions.companies.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <Label>Work Mode</Label>
              <Select value={filters.workMode} onChange={(e) => setFilters({ ...filters, workMode: e.target.value })}>
                <option value="">Any mode</option>
                {WORK_MODES.map((m) => <option key={m} value={m}>{m}</option>)}
              </Select>
            </div>
            <div>
              <Label>Employment Type</Label>
              <Select value={filters.employmentType} onChange={(e) => setFilters({ ...filters, employmentType: e.target.value })}>
                <option value="">Any type</option>
                {EMPLOYMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </div>
            <div>
              <Label>Source</Label>
              <Select value={filters.source} onChange={(e) => setFilters({ ...filters, source: e.target.value })}>
                <option value="">Any source</option>
                {SOURCES.map((s) => <option key={s} value={s}>{s}</option>)}
              </Select>
            </div>
            <div>
              <Label>Posted Within</Label>
              <Select value={filters.postedWithinDays ?? ''} onChange={(e) => setFilters({ ...filters, postedWithinDays: e.target.value ? Number(e.target.value) : null })}>
                <option value="">Any time</option>
                <option value="1">Last 24 hours</option>
                <option value="3">Last 3 days</option>
                <option value="7">Last 7 days</option>
                <option value="14">Last 14 days</option>
                <option value="30">Last 30 days</option>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Exp Min (yrs)</Label>
                <Input type="number" placeholder="0" value={filters.experienceMin ?? ''} onChange={(e) => setFilters({ ...filters, experienceMin: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Exp Max</Label>
                <Input type="number" placeholder="10" value={filters.experienceMax ?? ''} onChange={(e) => setFilters({ ...filters, experienceMax: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Salary Min</Label>
                <Input type="number" placeholder="0" value={filters.salaryMin ?? ''} onChange={(e) => setFilters({ ...filters, salaryMin: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Salary Max</Label>
                <Input type="number" placeholder="200000" value={filters.salaryMax ?? ''} onChange={(e) => setFilters({ ...filters, salaryMax: e.target.value ? Number(e.target.value) : null })} />
              </div>
            </div>
            <div className="sm:col-span-2 lg:col-span-3 xl:col-span-4">
              <Label>Skills</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Type a skill and press Enter"
                  value={skillsInput}
                  onChange={(e) => setSkillsInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addSkill(); } }}
                />
                <Button variant="secondary" onClick={addSkill} disabled={!skillsInput.trim()}>Add</Button>
              </div>
              {filters.skills.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {filters.skills.map((s) => (
                    <Badge key={s} className="bg-brand-50 text-brand-700 border border-brand-100">
                      {s}
                      <button onClick={() => removeSkill(s)} className="ml-1 hover:text-brand-900"><X size={11} /></button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-600 text-xs uppercase tracking-wider">
                {atsMode && <th className="text-left px-4 py-3 font-semibold">ATS</th>}
                <th className="text-left px-4 py-3 font-semibold"><SortHeader field="title" label="Job Title" /></th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell"><SortHeader field="company" label="Company" /></th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell"><SortHeader field="location" label="Location" /></th>
                <th className="text-left px-4 py-3 font-semibold hidden xl:table-cell"><SortHeader field="experience_min" label="Experience" /></th>
                <th className="text-left px-4 py-3 font-semibold hidden lg:table-cell"><SortHeader field="salary_min" label="Salary" /></th>
                <th className="text-left px-4 py-3 font-semibold hidden sm:table-cell">Source</th>
                <th className="text-left px-4 py-3 font-semibold hidden md:table-cell"><SortHeader field="posted_date" label="Posted" /></th>
                <th className="text-center px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pageData.map((job) => {
                const appMeta = job.application ? APPLICATION_STATUS_META[job.application.status] : null;
                const atsColor = job._atsScore != null ? atsScoreColor(job._atsScore) : null;
                return (
                  <tr key={job.id} className="hover:bg-slate-50/60 transition-colors group">
                    {atsMode && (
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center justify-center w-9 h-9 rounded-lg font-bold text-xs', atsColor.bg, atsColor.text)}>
                          {job._atsScore}
                        </span>
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <button onClick={() => setDetailJob(job)} className="text-left">
                        <p className="font-semibold text-slate-800 group-hover:text-brand-700 transition-colors line-clamp-1">{job.title}</p>
                        <p className="text-xs text-slate-500 md:hidden">{job.company} • {job.location || 'Remote'}</p>
                      </button>
                      {appMeta && <Badge className={cn('mt-1', appMeta.color)} dot={appMeta.dot}>{appMeta.label}</Badge>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-600">{job.company || '—'}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{job.location || '—'}</td>
                    <td className="px-4 py-3 hidden xl:table-cell text-slate-600">{formatExperience(job.experience_min, job.experience_max)}</td>
                    <td className="px-4 py-3 hidden lg:table-cell text-slate-600">{formatSalary(job.salary_min, job.salary_max, job.currency ?? 'USD')}</td>
                    <td className="px-4 py-3 hidden sm:table-cell">
                      {job.source && <Badge className="bg-slate-100 text-slate-600">{job.source}</Badge>}
                    </td>
                    <td className="px-4 py-3 hidden md:table-cell text-slate-500 text-xs">{timeAgo(job.posted_date)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => toggleSave(job)}
                          disabled={togglingId === job.id}
                          title={job.is_saved ? 'Remove bookmark' : 'Bookmark'}
                          className={cn('p-1.5 rounded-lg transition-colors', job.is_saved ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600')}
                        >
                          {job.is_saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
                        </button>
                        {job.job_url && (
                          <a href={job.job_url} target="_blank" rel="noopener noreferrer" title="Apply / View" className="p-1.5 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors">
                            <ExternalLink size={16} />
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <EmptyState
            icon={<Search size={24} />}
            title="No matching jobs"
            description="Try adjusting your filters or search query."
            action={<Button variant="outline" size="sm" onClick={clearFilters}>Clear filters</Button>}
          />
        )}

        {filtered.length > 0 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 flex-wrap gap-2">
            <p className="text-xs text-slate-500">
              Showing {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length}
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage(currentPage - 1)} disabled={currentPage === 1} icon={<ChevronLeft size={14} />}>Prev</Button>
              <span className="text-xs text-slate-600 px-2 font-medium">Page {currentPage} / {totalPages}</span>
              <Button variant="outline" size="sm" onClick={() => setPage(currentPage + 1)} disabled={currentPage === totalPages}>Next<ChevronRight size={14} /></Button>
            </div>
          </div>
        )}
      </Card>

      {/* Job Detail Modal */}
      <Modal open={!!detailJob} onClose={() => setDetailJob(null)} title="Job Details" maxWidth="max-w-2xl">
        {detailJob && (
          <div className="space-y-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">{detailJob.title}</h2>
              <div className="flex flex-wrap items-center gap-2 mt-1.5 text-sm text-slate-500">
                {detailJob.company && <span className="flex items-center gap-1"><Building2 size={14} /> {detailJob.company}</span>}
                {detailJob.location && <span className="flex items-center gap-1"><MapPin size={14} /> {detailJob.location}</span>}
                {detailJob.work_mode && <Badge className="bg-slate-100 text-slate-600">{detailJob.work_mode}</Badge>}
                {detailJob.employment_type && <Badge className="bg-slate-100 text-slate-600">{detailJob.employment_type}</Badge>}
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <DetailStat label="Experience" value={formatExperience(detailJob.experience_min, detailJob.experience_max)} />
              <DetailStat label="Salary" value={formatSalary(detailJob.salary_min, detailJob.salary_max, detailJob.currency ?? 'USD')} />
              <DetailStat label="Posted" value={formatDate(detailJob.posted_date)} />
              <DetailStat label="Source" value={detailJob.source || '—'} />
            </div>

            {detailJob._atsScore != null && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-slate-100">
                <Trophy size={18} className="text-brand-600" />
                <span className="text-sm font-semibold text-slate-700">ATS Match Score: {detailJob._atsScore}/100</span>
                <Badge className={cn(atsScoreColor(detailJob._atsScore).bg, atsScoreColor(detailJob._atsScore).text)}>
                  {atsScoreColor(detailJob._atsScore).label}
                </Badge>
              </div>
            )}

            {detailJob.skills.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-2">Skills</p>
                <div className="flex flex-wrap gap-1.5">
                  {detailJob.skills.map((s) => <Badge key={s} className="bg-brand-50 text-brand-700 border border-brand-100">{s}</Badge>)}
                </div>
              </div>
            )}

            {detailJob.description && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1.5">Description</p>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100 max-h-48 overflow-y-auto">{detailJob.description}</p>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold text-slate-600 mb-2">Application Status</p>
              <div className="flex flex-wrap gap-2">
                {Object.keys(APPLICATION_STATUS_META).map((status) => {
                  const meta = APPLICATION_STATUS_META[status];
                  const isActive = detailJob.application?.status === status;
                  return (
                    <button
                      key={status}
                      onClick={() => updateAppStatus(detailJob.id, status)}
                      className={cn(
                        'px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                        isActive ? meta.color + ' ring-2 ring-offset-1 ring-current' : 'bg-slate-100 text-slate-500 hover:bg-slate-200',
                      )}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button variant="outline" onClick={() => toggleSave(detailJob)} icon={detailJob.is_saved ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}>
                {detailJob.is_saved ? 'Bookmarked' : 'Bookmark'}
              </Button>
              {detailJob.job_url && (
                <a href={detailJob.job_url} target="_blank" rel="noopener noreferrer">
                  <Button icon={<ExternalLink size={16} />}>Apply Now</Button>
                </a>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function DetailStat({ label, value }) {
  return (
    <div className="bg-slate-50 rounded-lg p-3 border border-slate-100">
      <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">{label}</p>
      <p className="text-sm font-semibold text-slate-800 mt-0.5">{value}</p>
    </div>
  );
}
