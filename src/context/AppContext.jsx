import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [profile, setProfile] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [savedJobs, setSavedJobs] = useState([]);
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
      setProfile(profRes.data ?? null);
      setJobs(jobsRes.data ?? []);
      setSavedJobs(savedRes.data ?? []);
      setApplications(appRes.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const upsertProfile = useCallback(async (p) => {
    if (profile?.id) {
      const { data, error } = await supabase
        .from('profiles').update({ ...p, updated_at: new Date().toISOString() })
        .eq('id', profile.id).select('*').single();
      if (error) throw error;
      setProfile(data);
    } else {
      const { data, error } = await supabase.from('profiles').insert(p).select('*').single();
      if (error) throw error;
      setProfile(data);
    }
  }, [profile]);

  const saveJob = useCallback(async (jobId) => {
    const { error } = await supabase.from('saved_jobs').insert({ job_id: jobId });
    if (error && !error.message.includes('duplicate')) throw error;
    setSavedJobs((prev) => [...prev, { id: crypto.randomUUID(), job_id: jobId, created_at: new Date().toISOString() }]);
  }, []);

  const unsaveJob = useCallback(async (jobId) => {
    const { error } = await supabase.from('saved_jobs').delete().eq('job_id', jobId);
    if (error) throw error;
    setSavedJobs((prev) => prev.filter((s) => s.job_id !== jobId));
  }, []);

  const setApplicationStatus = useCallback(async (jobId, status) => {
    const existing = applications.find((a) => a.job_id === jobId);
    const now = new Date().toISOString();
    if (existing) {
      const { data, error } = await supabase
        .from('applications')
        .update({ status, updated_at: now, applied_at: status === 'applied' && !existing.applied_at ? now : existing.applied_at })
        .eq('id', existing.id).select('*').single();
      if (error) throw error;
      setApplications((prev) => prev.map((a) => (a.id === existing.id ? data : a)));
    } else {
      const { data, error } = await supabase
        .from('applications')
        .insert({ job_id: jobId, status, applied_at: status === 'applied' ? now : null })
        .select('*').single();
      if (error) throw error;
      setApplications((prev) => [...prev, data]);
    }
  }, [applications]);

  const importJobs = useCallback(async (newJobs) => {
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
    setJobs((prev) => [...(data ?? []), ...prev]);
    return data?.length ?? 0;
  }, []);

  const jobsWithMeta = useCallback(() => {
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

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
