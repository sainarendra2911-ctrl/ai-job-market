export const APPLICATION_STATUS_META = {
  saved: { label: 'Saved', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  applied: { label: 'Applied', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  interview: { label: 'Interview', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  offer: { label: 'Offer', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
};

export const DEFAULT_FILTERS = {
  search: '',
  role: '',
  skills: [],
  experienceMin: null,
  experienceMax: null,
  location: '',
  salaryMin: null,
  salaryMax: null,
  workMode: '',
  company: '',
  employmentType: '',
  postedWithinDays: null,
  source: '',
};

export const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];
export const SOURCES = ['LinkedIn', 'Naukri', 'Indeed', 'Glassdoor', 'AngelList', 'Company Site', 'Upload'];
