import { useCallback, useRef, useState } from 'react';
import { UploadCloud, FileSpreadsheet, FileJson, FileText, Search, CheckCircle2, AlertCircle, Loader2, Globe, ArrowRight } from 'lucide-react';
import { Button, Card, Badge, Select, Input } from '../components/ui';
import { useApp } from '../context/AppContext';
import { parseJobFile, type ParsedJobRow } from '../lib/jobImport';
import { SOURCES } from '../types';
import type { Screen } from '../components/Layout';

const ACCEPTED = '.csv,.xlsx,.xls,.json';

export function JobSourceScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { importJobs } = useApp();
  const [dragOver, setDragOver] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [parsedRows, setParsedRows] = useState<ParsedJobRow[] | null>(null);
  const [fileName, setFileName] = useState('');
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string; count?: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setParsing(true);
    setError(null);
    setResult(null);
    setParsedRows(null);
    setFileName(file.name);
    try {
      const rows = await parseJobFile(file);
      if (!rows.length) {
        setError('No valid job rows found. Ensure your file has a "title" column.');
        return;
      }
      setParsedRows(rows);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to parse file');
    } finally {
      setParsing(false);
    }
  }, []);

  const doImport = async () => {
    if (!parsedRows?.length) return;
    setImporting(true);
    setError(null);
    try {
      const count = await importJobs(parsedRows);
      setResult({ ok: true, msg: `Successfully imported ${count} job${count === 1 ? '' : 's'}.`, count });
      setParsedRows(null);
      setFileName('');
    } catch (e) {
      setResult({ ok: false, msg: e instanceof Error ? e.message : 'Import failed' });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-1.5">Job Source</h1>
        <p className="text-slate-500 text-sm sm:text-base">Import scraped job listings or search live jobs from supported platforms.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Upload Card */}
        <Card className="p-6">
          <div className="flex items-center gap-2.5 mb-4">
            <div className="w-9 h-9 rounded-lg bg-brand-50 flex items-center justify-center">
              <UploadCloud className="text-brand-600" size={18} />
            </div>
            <div>
              <h2 className="font-bold text-slate-900 text-base">Upload Scraped Listings</h2>
              <p className="text-xs text-slate-500">CSV, Excel, or JSON files</p>
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f); }}
            onClick={() => inputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 ${
              dragOver ? 'border-brand-500 bg-brand-50/50 scale-[1.01]' : 'border-slate-300 hover:border-brand-400 hover:bg-slate-50'
            }`}
          >
            <input ref={inputRef} type="file" accept={ACCEPTED} className="hidden" onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])} />
            {parsing ? (
              <div className="flex flex-col items-center gap-2 py-4">
                <Loader2 className="animate-spin text-brand-500" size={28} />
                <p className="text-sm text-slate-600">Parsing {fileName}…</p>
              </div>
            ) : (
              <>
                <div className="w-12 h-12 mx-auto rounded-xl bg-slate-100 flex items-center justify-center mb-3">
                  <UploadCloud className="text-slate-400" size={24} />
                </div>
                <p className="text-sm font-semibold text-slate-700 mb-1">Drop file here or click to browse</p>
                <p className="text-xs text-slate-400">Supports CSV, XLSX, JSON</p>
                <div className="flex items-center justify-center gap-3 mt-4">
                  <span className="flex items-center gap-1 text-[11px] text-slate-500"><FileSpreadsheet size={14} /> CSV</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500"><FileSpreadsheet size={14} /> XLSX</span>
                  <span className="flex items-center gap-1 text-[11px] text-slate-500"><FileJson size={14} /> JSON</span>
                </div>
              </>
            )}
          </div>

          {error && (
            <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm animate-fade-in">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {parsedRows && (
            <div className="mt-4 animate-fade-in">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  <span className="text-sm font-semibold text-slate-700">{parsedRows.length} job{parsedRows.length === 1 ? '' : 's'} ready</span>
                </div>
                <Button size="sm" onClick={doImport} loading={importing}>Import all</Button>
              </div>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
                {parsedRows.slice(0, 50).map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 text-xs">
                    <span className="font-medium text-slate-800 truncate flex-1">{r.title}</span>
                    <span className="text-slate-500 truncate">{r.company || '—'}</span>
                    {r.source && <Badge className="bg-slate-100 text-slate-600">{r.source}</Badge>}
                  </div>
                ))}
                {parsedRows.length > 50 && <div className="px-3 py-2 text-xs text-slate-400 text-center">+ {parsedRows.length - 50} more…</div>}
              </div>
            </div>
          )}

          {result && (
            <div className={`mt-4 flex items-center gap-2 p-3 rounded-lg text-sm animate-fade-in ${result.ok ? 'bg-emerald-50 border border-emerald-200 text-emerald-700' : 'bg-rose-50 border border-rose-200 text-rose-700'}`}>
              {result.ok ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
              <span>{result.msg}</span>
              {result.ok && <button onClick={() => onNavigate('explorer')} className="ml-auto text-xs font-semibold text-brand-700 hover:text-brand-800 flex items-center gap-1">View jobs <ArrowRight size={12} /></button>}
            </div>
          )}

          <div className="mt-4 pt-4 border-t border-slate-100">
            <p className="text-[11px] text-slate-400 font-medium mb-1.5">Expected columns (header names are flexible):</p>
            <div className="flex flex-wrap gap-1">
              {['title', 'company', 'location', 'experience_min', 'experience_max', 'salary_min', 'salary_max', 'work_mode', 'employment_type', 'posted_date', 'source', 'job_url', 'skills'].map((c) => (
                <code key={c} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">{c}</code>
              ))}
            </div>
          </div>
        </Card>

        {/* Live Search Card */}
        <LiveJobSearch onImported={() => onNavigate('explorer')} />
      </div>
    </div>
  );
}

function LiveJobSearch({ onImported }: { onImported: () => void }) {
  const { importJobs } = useApp();
  const [query, setQuery] = useState('');
  const [source, setSource] = useState('LinkedIn');
  const [location, setLocation] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<ParsedJobRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);

  const search = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setError(null);
    setResults(null);
    try {
      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/search-live-jobs`;
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}` },
        body: JSON.stringify({ query, source, location }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `Search failed (${res.status})`);
      }
      const data = await res.json();
      const jobs: ParsedJobRow[] = data.jobs ?? [];
      if (!jobs.length) {
        setError('No live jobs found. Try a different query or source.');
      } else {
        setResults(jobs);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Search failed');
    } finally {
      setSearching(false);
    }
  };

  const importResults = async () => {
    if (!results?.length) return;
    setImporting(true);
    try {
      await importJobs(results);
      setResults(null);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed');
    } finally {
      setImporting(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center">
          <Globe className="text-emerald-600" size={18} />
        </div>
        <div>
          <h2 className="font-bold text-slate-900 text-base">Search Live Jobs</h2>
          <p className="text-xs text-slate-500">Fetch current listings from job platforms</p>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <label className="block text-xs font-semibold text-slate-600 mb-1.5">Keywords / Role</label>
          <Input placeholder="e.g. Senior Frontend Developer" value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Source</label>
            <Select value={source} onChange={(e) => setSource(e.target.value)}>
              {SOURCES.filter((s) => s !== 'Upload').map((s) => <option key={s} value={s}>{s}</option>)}
            </Select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1.5">Location</label>
            <Input placeholder="e.g. Remote, NYC" value={location} onChange={(e) => setLocation(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && search()} />
          </div>
        </div>
        <Button onClick={search} loading={searching} className="w-full" icon={<Search size={16} />}>Search Jobs</Button>
      </div>

      {error && (
        <div className="mt-4 flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-sm animate-fade-in">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {results && (
        <div className="mt-4 animate-fade-in">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold text-slate-700">{results.length} live result{results.length === 1 ? '' : 's'}</span>
            <Button size="sm" onClick={importResults} loading={importing}>Import all</Button>
          </div>
          <div className="max-h-56 overflow-y-auto rounded-lg border border-slate-200 divide-y divide-slate-100">
            {results.map((r, i) => (
              <div key={i} className="px-3 py-2.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-slate-800 truncate">{r.title}</span>
                  <Badge className="bg-emerald-100 text-emerald-700 shrink-0">{r.source}</Badge>
                </div>
                <p className="text-slate-500 mt-0.5 truncate">{r.company}{r.location ? ` • ${r.location}` : ''}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="mt-4 pt-4 border-t border-slate-100">
        <div className="flex items-start gap-2 text-[11px] text-slate-400 leading-relaxed">
          <FileText size={13} className="shrink-0 mt-0.5" />
          <p>Live search uses a server-side edge function. Results are fetched and normalized to match your job schema, then imported into your database.</p>
        </div>
      </div>
    </Card>
  );
}
