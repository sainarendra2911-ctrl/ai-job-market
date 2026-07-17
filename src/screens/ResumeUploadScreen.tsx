import { useCallback, useRef, useState } from 'react';
import { FileUp, FileText, CheckCircle2, AlertCircle, Loader2, User, Mail, Phone, Briefcase, GraduationCap, Sparkles, Save, X, Edit3 } from 'lucide-react';
import { Button, Card, Badge, Input, Label, Modal } from '../components/ui';
import { useApp } from '../context/AppContext';
import { supabase, RESUMES_BUCKET } from '../lib/supabase';
import { extractResumeText, parseProfileFromText, type ParsedProfile } from '../lib/resume';
import type { Screen } from '../components/Layout';

export function ResumeUploadScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { profile, upsertProfile } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsed, setParsed] = useState<ParsedProfile | null>(null);
  const [fileName, setFileName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<ParsedProfile | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setError(null);
    setParsed(null);
    setSaved(false);
    setFileName(file.name);
    try {
      const text = await extractResumeText(file);
      if (!text.trim()) {
        setError('Could not extract any text from this file. It may be a scanned PDF or empty.');
        return;
      }
      const result = parseProfileFromText(text);

      // Upload file to storage
      const filePath = `${Date.now()}-${file.name.replace(/\s+/g, '-')}`;
      await supabase.storage.from(RESUMES_BUCKET).upload(filePath, file, { upsert: true });

      setParsed(result);
      // Save profile with raw text and file info
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
    setSaving(true);
    try {
      await upsertProfile(editForm);
      setParsed(editForm);
      setEditOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const displayProfile = parsed ?? (profile ? {
    name: profile.name, email: profile.email, phone: profile.phone, title: profile.title,
    summary: profile.summary, skills: profile.skills, experience_years: profile.experience_years, education: profile.education,
  } : null);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1.5">Resume Upload</h1>
        <p className="text-slate-500 text-sm sm:text-base">Upload your resume to extract your profile and enable personalized job matching.</p>
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
              <span>Profile saved successfully!</span>
              <button onClick={() => onNavigate('dashboard')} className="ml-auto text-xs font-semibold text-brand-700 hover:text-brand-800">View dashboard →</button>
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
              <Button onClick={saveEdit} loading={saving} icon={<Save size={16} />}>Save Changes</Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function ProfileField({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | null | undefined }) {
  return (
    <div>
      <p className="text-xs font-semibold text-slate-500 mb-1 flex items-center gap-1.5">{icon} {label}</p>
      <p className="text-sm text-slate-800 font-medium">{value || '—'}</p>
    </div>
  );
}
