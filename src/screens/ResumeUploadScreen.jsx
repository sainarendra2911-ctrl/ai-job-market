import { useCallback, useRef, useState, useMemo } from 'react';
import {
  FileUp, FileText, CheckCircle2, AlertCircle, Loader2, User, Mail, Phone,
  Briefcase, GraduationCap, Sparkles, Save, X, Edit3, Send, Trophy, Target, TrendingUp, MailCheck,
} from 'lucide-react';
import { Button, Card, Badge, Input, Label, Modal } from '../components/ui';
import { useApp } from '../context/AppContext';
import { supabase, RESUMES_BUCKET } from '../lib/supabase';
import { extractResumeText, parseProfileFromText } from '../lib/resume';
import { rankJobsByATS, atsScoreColor } from '../lib/ats';
import { formatSalary, formatExperience, cn } from '../lib/utils';

export function ResumeUploadScreen({ onNavigate }) {
  const { profile, upsertProfile, jobs } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailResult, setEmailResult] = useState(null);
  const inputRef = useRef(null);

  const handleFile = useCallback(async (file) => {
    setParsing(true);
    setError(null);
    setParsed(null);
    setSaved(false);
    setEmailResult(null);
    setFileName(file.name);
    try {
      const text = await extractResumeText(file);
      if (!text.trim()) {
        setError('Could not extract any text from this file. It may be a scanned PDF or empty.');
        return;
      }
      const result = parseProfileFromText(text);
      const filePath = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      await supabase.storage.from(RESUMES_BUCKET).upload(filePath, file, { upsert: true });
      setParsed(result);
      await upsertProfile({
        ...result,
        raw_text: text,
        file_name: file.name,
        file_path: filePath,
      });
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse resume');
    } finally {
      setParsing(false);
    }
  }, [upsertProfile]);

  // ATS matching: rank jobs against the current profile
  const atsRanked = useMemo(() => {
    const prof = parsed ?? profile;
    if (!prof || !jobs.length) return [];
    return rankJobsByATS(prof, jobs);
  }, [parsed, profile, jobs]);

  const topMatches = atsRanked.slice(0, 5);
  const highScoreJobs = atsRanked.filter((j) => j._atsScore >= 90).slice(0, 5);

  const openEdit = () => {
    const src = parsed ?? (profile ? {
      name: profile.name, email: profile.email, phone: profile.phone, title: profile.title,
      summary: profile.summary, skills: profile.skills, experience_years: profile.experience_years, education: profile.education,
    } : null);
    if (src) {
      setEditForm({ ...src, skills: [...(src.skills ?? [])] });
      setEditOpen(true);
    }
  };

  const saveEdit = async () => {
    if (!editForm) return;
    setParsing(true);
    try {
      await upsertProfile(editForm);
      setParsed(editForm);
      setEditOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setParsing(false);
    }
  };

  const sendEmail = async (type) => {
    const prof = parsed ?? profile;
    if (!prof?.email) {
      setEmailModal({ ...emailModal, error: 'No email address found in profile. Please edit your profile to add an email.' });
      return;
    }
    const jobsToSend = type === 'ats90' ? highScoreJobs : topMatches;
    if (!jobsToSend.length) return;
    setSendingEmail(true);
    setEmailResult(null);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-job-emails`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({
          email: prof.email,
          name: prof.name,
          jobs: jobsToSend.map((j) => ({
            title: j.title,
            company: j.company,
            location: j.location,
            salary_min: j.salary_min,
            salary_max: j.salary_max,
            currency: j.currency,
            job_url: j.job_url,
            source: j.source,
            ats_score: j._atsScore,
            matched_skills: j._atsMatched,
          })),
          type,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Email send failed');
      setEmailResult({ ok: true, msg: data.message || 'Email sent successfully!' });
    } catch (e) {
      setEmailResult({ ok: false, msg: e instanceof Error ? e.message : 'Failed to send email' });
    } finally {
      setSendingEmail(false);
    }
  };

  const displayProfile = parsed ?? (profile ? {
    name: profile.name, email: profile.email, phone: profile.phone, title: profile.title,
    summary: profile.summary, skills: profile.skills, experience_years: profile.experience_years, education: profile.education,
  } : null);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1.5">Resume Upload</h1>
        <p className="text-slate-500 text-sm sm:text-base">Upload your resume to extract your profile, get ATS job matching scores, and receive email recommendations.</p>
      </header>

      <div className="grid gap-6">
        {/* Upload zone */}
        <Card className="p-6">
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              dragOver ? 'border-brand-500 bg-brand-50/50 scale-[1.01]' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
            }`}
          >
            <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {parsing ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <Loader2 className="animate-spin text-brand-500" size={28} />
                <p className="text-sm text-slate-600">Extracting profile from {fileName}…</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto rounded-xl bg-brand-50 flex items-center justify-center mb-3">
                  <FileUp className="text-brand-600" size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Drop your resume here or click to browse</p>
                <p className="text-xs text-slate-400">Supports PDF, DOCX, TXT</p>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm animate-fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {saved && (
            <div className="mt-4 flex items-center gap-2 p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm animate-fade-in">
              <CheckCircle2 size={16} />
              <span>Profile saved! ATS matching results are shown below.</span>
            </div>
          )}
        </Card>

        {/* Profile display */}
        {displayProfile && (
          <Card className="p-6 animate-fade-in">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center">
                  <User className="text-slate-600" size={18} />
                </div>
                <h2 className="font-bold text-slate-900 text-base">Extracted Profile</h2>
              </div>
              <Button variant="outline" size="sm" icon={<Edit3 size={14} />} onClick={openEdit}>Edit</Button>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              <ProfileField icon={<User size={14} />} label="Name" value={displayProfile.name} />
              <ProfileField icon={<Briefcase size={14} />} label="Title" value={displayProfile.title} />
              <ProfileField icon={<Mail size={14} />} label="Email" value={displayProfile.email} />
              <ProfileField icon={<Phone size={14} />} label="Phone" value={displayProfile.phone} />
              <ProfileField icon={<Sparkles size={14} />} label="Experience" value={displayProfile.experience_years != null ? `${displayProfile.experience_years} years` : null} />
              <ProfileField icon={<GraduationCap size={14} />} label="Education" value={displayProfile.education} />
            </div>

            {displayProfile.summary && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-600 mb-1.5">Summary</p>
                <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-lg p-3 border border-slate-100">{displayProfile.summary}</p>
              </div>
            )}

            {displayProfile.skills?.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-slate-600 mb-2">Skills ({displayProfile.skills.length})</p>
                <div className="flex flex-wrap gap-1.5">
                  {displayProfile.skills.map((s) => (
                    <Badge key={s} className="bg-brand-50 text-brand-700 border border-brand-100">{s}</Badge>
                  ))}
                </div>
              </div>
            )}

            {(profile?.file_name || fileName) && (
              <div className="mt-4 pt-4 border-t border-slate-100 flex items-center gap-2 text-xs text-slate-400">
                <FileText size={13} />
                <span>Source file: {profile?.file_name || fileName}</span>
              </div>
            )}
          </Card>
        )}

        {/* ATS Matching Results */}
        {atsRanked.length > 0 && (
          <div className="space-y-6 animate-fade-in">
            {/* Top 5 Matching Jobs */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
                    <Target className="text-brand-600" size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">Top 5 Matching Jobs</h2>
                    <p className="text-xs text-slate-500">Ranked by ATS score against your resume</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Send size={14} />}
                  onClick={() => { setEmailModal({ type: 'top5' }); setEmailResult(null); }}
                  loading={sendingEmail}
                >
                  Email Top 5
                </Button>
              </div>

              <div className="space-y-3">
                {topMatches.map((job, idx) => (
                  <ATSJobRow key={job.id} job={job} rank={idx + 1} />
                ))}
              </div>
            </Card>

            {/* ATS 90+ Score Jobs */}
            <Card className="p-6">
              <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
                    <Trophy className="text-emerald-600" size={18} />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-900 text-base">ATS Score 90+ Jobs</h2>
                    <p className="text-xs text-slate-500">Highly matched positions for your profile</p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  icon={<Send size={14} />}
                  onClick={() => { setEmailModal({ type: 'ats90' }); setEmailResult(null); }}
                  loading={sendingEmail}
                  disabled={highScoreJobs.length === 0}
                >
                  Email 90+ Jobs
                </Button>
              </div>

              {highScoreJobs.length > 0 ? (
                <div className="space-y-3">
                  {highScoreJobs.map((job, idx) => (
                    <ATSJobRow key={job.id} job={job} rank={idx + 1} highlight />
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-sm text-slate-400">
                  <Trophy size={28} className="mx-auto mb-2 text-slate-300" />
                  No jobs with ATS score 90+ yet. Import more jobs or update your resume skills.
                </div>
              )}
            </Card>
          </div>
        )}

        {displayProfile && atsRanked.length === 0 && (
          <Card className="p-6">
            <div className="text-center py-6 text-sm text-slate-400">
              <Target size={28} className="mx-auto mb-2 text-slate-300" />
              No jobs imported yet. Import jobs from the Job Source screen to see ATS matching.
              <div className="mt-3">
                <Button variant="outline" size="sm" onClick={() => onNavigate('source')}>Go to Job Source</Button>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Edit Modal */}
      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Edit Profile">
        {editForm && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Name</Label>
                <Input value={editForm.name ?? ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value || null })} />
              </div>
              <div>
                <Label>Title</Label>
                <Input value={editForm.title ?? ''} onChange={(e) => setEditForm({ ...editForm, title: e.target.value || null })} />
              </div>
              <div>
                <Label>Email</Label>
                <Input type="email" value={editForm.email ?? ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value || null })} />
              </div>
              <div>
                <Label>Phone</Label>
                <Input value={editForm.phone ?? ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value || null })} />
              </div>
              <div>
                <Label>Experience (years)</Label>
                <Input type="number" value={editForm.experience_years ?? ''} onChange={(e) => setEditForm({ ...editForm, experience_years: e.target.value ? Number(e.target.value) : null })} />
              </div>
              <div>
                <Label>Education</Label>
                <Input value={editForm.education ?? ''} onChange={(e) => setEditForm({ ...editForm, education: e.target.value || null })} />
              </div>
            </div>
            <div>
              <Label>Summary</Label>
              <textarea
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 bg-white text-sm text-slate-900 focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 resize-none"
                rows={3}
                value={editForm.summary ?? ''}
                onChange={(e) => setEditForm({ ...editForm, summary: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Skills (comma-separated)</Label>
              <Input
                value={editForm.skills.join(', ')}
                onChange={(e) => setEditForm({ ...editForm, skills: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="ghost" onClick={() => setEditOpen(false)} icon={<X size={16} />}>Cancel</Button>
              <Button onClick={saveEdit} loading={parsing} icon={<Save size={16} />}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Email confirmation modal */}
      <Modal open={!!emailModal} onClose={() => setEmailModal(null)} title="Send Job Recommendations" maxWidth="max-w-md">
        {emailModal && (
          <div className="space-y-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-brand-50 border border-brand-100">
              <MailCheck size={20} className="text-brand-600 shrink-0" />
              <div className="text-sm">
                <p className="font-semibold text-slate-800">Send to: {displayProfile?.email || 'No email set'}</p>
                <p className="text-xs text-slate-500">
                  {emailModal.type === 'ats90'
                    ? `${highScoreJobs.length} job${highScoreJobs.length === 1 ? '' : 's'} with ATS score 90+`
                    : `Top 5 matched jobs by ATS score`}
                </p>
              </div>
            </div>

            {emailResult && (
              <div className={cn(
                'flex items-start gap-2 p-3 rounded-lg text-sm animate-fade-in',
                emailResult.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700',
              )}>
                {emailResult.ok ? <CheckCircle2 size={16} className="shrink-0 mt-0.5" /> : <AlertCircle size={16} className="shrink-0 mt-0.5" />}
                <span>{emailResult.msg}</span>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setEmailModal(null)}>Close</Button>
              {!emailResult?.ok && (
                <Button onClick={() => sendEmail(emailModal.type)} loading={sendingEmail} icon={<Send size={16} />}>
                  Send Email
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ProfileField({ icon, label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">{icon} {label}</p>
      <p className="text-sm text-slate-800 font-medium">{value || '—'}</p>
    </div>
  );
}

function ATSJobRow({ job, rank, highlight }) {
  const color = atsScoreColor(job._atsScore);
  return (
    <div className={cn(
      'flex items-start gap-3 p-3 rounded-lg border transition-colors',
      highlight ? 'bg-emerald-50/50 border-emerald-100 hover:bg-emerald-50' : 'bg-slate-50/50 border-slate-100 hover:bg-slate-50',
    )}>
      <div className={cn(
        'shrink-0 w-10 h-10 rounded-lg flex flex-col items-center justify-center font-bold text-xs',
        color.bg, color.text,
      )}>
        <span className="text-[10px] opacity-60">ATS</span>
        <span>{job._atsScore}</span>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-400">#{rank}</span>
          <p className="text-sm font-semibold text-slate-800 truncate">{job.title}</p>
        </div>
        <p className="text-xs text-slate-500 mt-0.5 truncate">
          {job.company || '—'}{job.location ? ` • ${job.location}` : ''}
          {job.salary_min != null && ` • ${formatSalary(job.salary_min, job.salary_max, job.currency ?? 'USD')}`}
        </p>
        {job._atsMatched?.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {job._atsMatched.slice(0, 6).map((s) => (
              <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700 font-medium">{s}</span>
            ))}
            {job._atsMatched.length > 6 && <span className="text-[10px] text-slate-400">+{job._atsMatched.length - 6}</span>}
          </div>
        )}
      </div>
      {job.job_url && (
        <a href={job.job_url} target="_blank" rel="noopener noreferrer" className="shrink-0 p-2 rounded-lg text-brand-600 hover:bg-brand-50 transition-colors">
          <TrendingUp size={16} />
        </a>
      )}
    </div>
  );
}
