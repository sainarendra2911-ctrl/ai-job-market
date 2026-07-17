export type ApplicationStatus = 'saved' | 'applied' | 'interview' | 'offer' | 'rejected';

export interface Job {
  id: string;
  title: string;
  company: string | null;
  location: string | null;
  experience_min: number | null;
  experience_max: number | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string | null;
  work_mode: string | null;
  employment_type: string | null;
  posted_date: string | null;
  source: string | null;
  job_url: string | null;
  skills: string[];
  keywords: string[];
  description: string | null;
  created_at: string;
}

export interface Profile {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  title: string | null;
  summary: string | null;
  skills: string[];
  experience_years: number | null;
  education: string | null;
  raw_text: string | null;
  file_name: string | null;
  file_path: string | null;
  created_at: string;
  updated_at: string;
}

export interface SavedJob {
  id: string;
  job_id: string;
  created_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  status: ApplicationStatus;
  applied_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface JobWithMeta extends Job {
  is_saved: boolean;
  application: Application | null;
}

export interface JobFilters {
  search: string;
  role: string;
  skills: string[];
  experienceMin: number | null;
  experienceMax: number | null;
  location: string;
  salaryMin: number | null;
  salaryMax: number | null;
  workMode: string;
  company: string;
  employmentType: string;
  postedWithinDays: number | null;
  source: string;
}

export const DEFAULT_FILTERS: JobFilters = {
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

export const APPLICATION_STATUS_META: Record<ApplicationStatus, { label: string; color: string; dot: string }> = {
  saved: { label: 'Saved', color: 'bg-slate-100 text-slate-700', dot: 'bg-slate-400' },
  applied: { label: 'Applied', color: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  interview: { label: 'Interview', color: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  offer: { label: 'Offer', color: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  rejected: { label: 'Rejected', color: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
};

export const WORK_MODES = ['Remote', 'Hybrid', 'On-site'];
export const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Internship', 'Temporary'];
export const SOURCES = ['LinkedIn', 'Naukri', 'Indeed', 'Glassdoor', 'AngelList', 'Company Site', 'Upload'];
