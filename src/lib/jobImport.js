import Papa from 'papaparse';
import * as XLSX from 'xlsx';

function normalizeRow(row) {
  const get = (keys) => {
    for (const k of Object.keys(row)) {
      const lk = k.toLowerCase().trim().replace(/[\s_]/g, '');
      if (keys.some((key) => lk === key.replace(/[\s_]/g, ''))) return row[k];
    }
    return undefined;
  };
  const str = (v) => (v == null || v === '' ? undefined : String(v).trim());
  const num = (v) => {
    if (v == null || v === '') return null;
    const n = Number(String(v).replace(/[^\d.-]/g, ''));
    return isNaN(n) ? null : n;
  };
  const arr = (v) => {
    if (v == null || v === '') return undefined;
    const s = String(v);
    if (s.includes(',')) return s.split(',').map((x) => x.trim()).filter(Boolean);
    if (s.includes('|')) return s.split('|').map((x) => x.trim()).filter(Boolean);
    return [s.trim()];
  };
  const dateStr = (v) => {
    if (v == null || v === '') return null;
    if (v instanceof Date) return v.toISOString().split('T')[0];
    const s = String(v).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.split('T')[0];
    const d = new Date(s);
    return isNaN(d.getTime()) ? null : d.toISOString().split('T')[0];
  };

  return {
    title: str(get(['title', 'jobtitle', 'job title', 'position', 'role'])),
    company: str(get(['company', 'companyname', 'company name', 'employer'])),
    location: str(get(['location', 'city', 'place', 'joblocation'])),
    experience_min: num(get(['experience_min', 'expmin', 'minexp', 'min_experience', 'experience'])),
    experience_max: num(get(['experience_max', 'expmax', 'maxexp', 'max_experience'])),
    salary_min: num(get(['salary_min', 'salarymin', 'minsalary', 'min_salary', 'salary'])),
    salary_max: num(get(['salary_max', 'salarymax', 'maxsalary', 'max_salary'])),
    currency: str(get(['currency', 'curr'])),
    work_mode: str(get(['work_mode', 'workmode', 'work type', 'remotetype', 'remote'])),
    employment_type: str(get(['employment_type', 'employmenttype', 'jobtype', 'job_type', 'type'])),
    posted_date: dateStr(get(['posted_date', 'posteddate', 'date', 'posted', 'dateposted', 'created'])),
    source: str(get(['source', 'platform', 'site', 'origin'])),
    job_url: str(get(['job_url', 'url', 'link', 'applyurl', 'apply_url', 'joburl'])),
    skills: arr(get(['skills', 'skill', 'tech', 'technologies', 'tags'])),
    keywords: arr(get(['keywords', 'keyword'])),
    description: str(get(['description', 'desc', 'summary', 'details'])),
  };
}

export async function parseJobFile(file) {
  const name = file.name.toLowerCase();

  if (name.endsWith('.json')) {
    const text = await file.text();
    const data = JSON.parse(text);
    const arr = Array.isArray(data) ? data : [data];
    return arr.map((r) => normalizeRow(r)).filter((r) => r.title);
  }
  if (name.endsWith('.csv')) {
    return new Promise((resolve, reject) => {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data.map(normalizeRow).filter((r) => r.title)),
        error: reject,
      });
    });
  }
  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf);
    const ws = wb.Sheets[wb.SheetNames[0]];
    const rows = XLSX.utils.sheet_to_json(ws);
    return rows.map(normalizeRow).filter((r) => r.title);
  }
  throw new Error('Unsupported file format. Please upload CSV, XLSX, or JSON.');
}

export function jobsToExportRows(jobs) {
  return jobs.map((j) => ({
    Title: j.title || '',
    Company: j.company || '',
    Location: j.location || '',
    'Exp (min)': j.experience_min ?? '',
    'Exp (max)': j.experience_max ?? '',
    'Salary (min)': j.salary_min ?? '',
    'Salary (max)': j.salary_max ?? '',
    Currency: j.currency || '',
    'Work Mode': j.work_mode || '',
    'Employment Type': j.employment_type || '',
    Source: j.source || '',
    'Posted Date': j.posted_date || '',
    'Job URL': j.job_url || '',
    Skills: Array.isArray(j.skills) ? j.skills.join(', ') : '',
    Saved: j.is_saved ? 'Yes' : 'No',
    'App Status': j.application?.status || '',
    'ATS Score': j._atsScore ?? '',
  }));
}
