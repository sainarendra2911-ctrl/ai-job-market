import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Job, Profile, SavedJob, Application, ApplicationStatus, JobWithMeta } from '../types';

interface AppState {
  profile: Profile | null;
  jobs: Job[];
  savedJobs: SavedJob[];
  applications: Application[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  upsertProfile: (p: Partial<Profile>) => Promise<void>;
  saveJob: (jobId: string) => Promise<void>;
  unsaveJob: (jobId: string) => Promise<void>;
  setApplicationStatus: (jobId: string, status: ApplicationStatus) => Promise<void>;
  importJobs: (jobs: Partial<Job>[]) => Promise<number>;
  jobsWithMeta: () => JobWithMeta[];
}

const AppContext = createContext<AppState | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [savedJobs, setSavedJobs] = useState<SavedJob[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [profRes, jobsRes, savedRes, appRes] = await Promise.all([
        supabase.from('profiles').select('*').order('updated_at', { ascending: false }).limit(1).maybeSingle(),
        supabase.from('jobs').select('*').order('created_at', { ascending: false }),
        supabase.from('saved_jobs').select('*'),
        supabase.from('applications').select('*'),
      ]);
      if (profRes.error) throw profRes.error;
      if (jobsRes.error) throw jobsRes.error;
      if (savedRes.error) throw savedRes.error;
      if (appRes.error) throw appRes.error;
      setProfile((profRes.data as Profile | null) ?? null);
      setJobs((jobsRes.data as Job[]) ?? []);
      setSavedJobs((savedRes.data as SavedJob[]) ?? []);
      setApplications((appRes.data as Application[]) ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const upsertProfile = useCallback(async (p: Partial<Profile>) => {
    if (profile?.id) {
      const { data, error } = await supabase
        .from('profiles')
        .update({ ...p, updated_at: new Date().toISOString() })
        .eq('id', profile.id)
        .select('*')
        .single();
      if (error) throw error;
      setProfile(data as Profile);
    } else {
      const { data, error } = await supabase.from('profiles').insert(p).select('*').single();
      if (error) throw error;
      setProfile(data as Profile);
    }
  }, [profile]);

  const saveJob = useCallback(async (jobId: string) => {
    const { error } = await supabase.from('saved_jobs').insert({ job_id: jobId });
    if (error && !error.message.includes('duplicate')) throw error;
    setSavedJobs((prev) => [...prev, { id: crypto.randomUUID(), job_id: jobId, created_at: new Date().toISOString() }]);
  }, []);

  const unsaveJob = useCallback(async (jobId: string) => {
    const { error } = await supabase.from('saved_jobs').delete().eq('job_id', jobId);
    if (error) throw error;
    setSavedJobs((prev) => prev.filter((s) => s.job_id !== jobId));
  }, []);

  const setApplicationStatus = useCallback(async (jobId: string, status: ApplicationStatus) => {
    const existing = applications.find((a) => a.job_id === jobId);
    const now = new Date().toISOString();
    if (existing) {
      const { data, error } = await supabase
        .from('applications')
        .update({ status, updated_at: now, applied_at: status === 'applied' && !existing.applied_at ? now : existing.applied_at })
        .eq('id', existing.id)
        .select('*')
        .single();
      if (error) throw error;
      setApplications((prev) => prev.map((a) => (a.id === existing.id ? (data as Application) : a)));
    } else {
      const { data, error } = await supabase
        .from('applications')
        .insert({ job_id: jobId, status, applied_at: status === 'applied' ? now : null })
        .select('*')
        .single();
      if (error) throw error;
      setApplications((prev) => [...prev, (data as Application)]);
    }
  }, [applications]);

  const importJobs = useCallback(async (newJobs: Partial<Job>[]): Promise<number> => {
    if (!newJobs.length) return 0;
    const cleaned = newJobs.map((j) => ({
      title: j.title || 'Untitled',
      company: j.company ?? null,
      location: j.location ?? null,
      experience_min: j.experience_min ?? null,
      experience_max: j.experience_max ?? null,
      salary_min: j.salary_min ?? null,
      salary_max: j.salary_max ?? null,
      currency: j.currency ?? 'USD',
      work_mode: j.work_mode ?? null,
      employment_type: j.employment_type ?? null,
      posted_date: j.posted_date ?? null,
      source: j.source ?? 'Upload',
      job_url: j.job_url ?? null,
      skills: j.skills ?? [],
      keywords: j.keywords ?? [],
      description: j.description ?? null,
    }));
    const { data, error } = await supabase.from('jobs').insert(cleaned).select('*');
    if (error) throw error;
    setJobs((prev) => [...(data as Job[]), ...prev]);
    return data?.length ?? 0;
  }, []);

  const jobsWithMeta = useCallback((): JobWithMeta[] => {
    const savedSet = new Set(savedJobs.map((s) => s.job_id));
    const appMap = new Map(applications.map((a) => [a.job_id, a]));
    return jobs.map((j) => ({
      ...j,
      is_saved: savedSet.has(j.id),
      application: appMap.get(j.id) ?? null,
    }));
  }, [jobs, savedJobs, applications]);

  return (
    <AppContext.Provider
      value={{
        profile, jobs, savedJobs, applications, loading, error,
        refresh, upsertProfile, saveJob, unsaveJob, setApplicationStatus, importJobs, jobsWithMeta,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp(): AppState {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
