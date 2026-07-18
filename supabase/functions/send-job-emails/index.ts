import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface JobEmailData {
  title: string;
  company: string | null;
  location: string | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  job_url: string | null;
  source: string | null;
  ats_score: number;
  matched_skills: string[];
}

interface EmailRequest {
  email: string;
  name: string | null;
  jobs: JobEmailData[];
  type: 'top5' | 'ats90';
}

const LOGO_SVG = `<svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="48" height="48" rx="12" fill="#0284c7"/>
  <path d="M16 18C16 16.3431 17.3431 15 19 15H29C30.6569 15 32 16.3431 32 18V30C32 31.6569 30.6569 33 29 33H19C17.3431 33 16 31.6569 16 30V18Z" stroke="white" stroke-width="2.5" stroke-linejoin="round"/>
  <path d="M21 20L27 24L21 28V20Z" fill="white"/>
  <path d="M19 12V15M29 12V15" stroke="white" stroke-width="2.5" stroke-linecap="round"/>
</svg>`;

function formatSalary(min, max, currency) {
  const cur = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency + ' ';
  const fmt = (n) => n >= 1000 ? `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}k` : String(n);
  if (min != null && max != null) return `${cur}${fmt(min)} - ${cur}${fmt(max)}`;
  if (min != null) return `${cur}${fmt(min)}+`;
  if (max != null) return `${cur}${fmt(max)}`;
  return 'Not specified';
}

function buildJobCard(job, rank) {
  const scoreColor = job.ats_score >= 90 ? '#10b981' : job.ats_score >= 75 ? '#0ea5e9' : job.ats_score >= 60 ? '#f59e0b' : '#94a3b8';
  const skills = job.matched_skills?.length
    ? job.matched_skills.slice(0, 6).map((s) => `<span style="display:inline-block;background:#e0f2fe;color:#0369a1;padding:2px 8px;border-radius:999px;font-size:11px;margin:2px 1px;">${s}</span>`).join('')
    : '';

  return `
  <tr>
    <td style="padding:16px 24px;border-bottom:1px solid #f1f5f9;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="vertical-align:top;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
              <span style="background:${scoreColor};color:#fff;font-size:12px;font-weight:700;padding:3px 10px;border-radius:6px;">ATS ${job.ats_score}</span>
              ${rank ? `<span style="color:#94a3b8;font-size:12px;font-weight:600;">#${rank}</span>` : ''}
            </div>
            <h3 style="margin:0 0 4px 0;font-size:16px;color:#0f172a;font-weight:700;">${job.title}</h3>
            <p style="margin:0 0 8px 0;font-size:13px;color:#64748b;">
              ${job.company || '—'} ${job.location ? `&nbsp;•&nbsp; ${job.location}` : ''} ${job.source ? `&nbsp;•&nbsp; ${job.source}` : ''}
            </p>
            <p style="margin:0 0 8px 0;font-size:13px;color:#475569;">
              <strong>Salary:</strong> ${formatSalary(job.salary_min, job.salary_max, job.currency)}
            </p>
            ${skills ? `<div style="margin:8px 0;">${skills}</div>` : ''}
            ${job.job_url ? `<a href="${job.job_url}" style="display:inline-block;background:#0284c7;color:#fff;text-decoration:none;font-size:13px;font-weight:600;padding:8px 20px;border-radius:8px;margin-top:8px;">View / Apply →</a>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>`;
}

function buildEmailHTML(req) {
  const isATS90 = req.type === 'ats90';
  const title = isATS90 ? 'Top ATS Score 90+ Jobs' : 'Your Top 5 Job Matches';
  const subtitle = isATS90
    ? 'These jobs have an ATS match score of 90 or higher — highly recommended for your profile.'
    : 'We found the best matching jobs based on your resume skills and experience.';

  const jobCards = req.jobs.map((j, i) => buildJobCard(j, isATS90 ? null : i + 1)).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:'Inter',-apple-system,BlinkMacSystemFont,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.06);max-width:600px;">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0ea5e9,#0369a1);padding:32px 40px;text-align:center;">
              ${LOGO_SVG}
              <h1 style="color:#fff;margin:12px 0 4px 0;font-size:22px;font-weight:800;letter-spacing:-0.02em;">JobPilot</h1>
              <p style="color:#e0f2fe;margin:0;font-size:13px;">Smart Job Management</p>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding:32px 40px 8px;">
              <h2 style="margin:0 0 8px 0;font-size:20px;color:#0f172a;font-weight:700;">${title}</h2>
              <p style="margin:0 0 24px 0;font-size:14px;color:#64748b;line-height:1.6;">Hi ${req.name || 'there'},<br/>${subtitle}</p>
            </td>
          </tr>
          <!-- Jobs -->
          <tr>
            <td style="padding:0 24px 24px;">
              <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:12px;overflow:hidden;">
                ${jobCards}
              </table>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:24px 40px 32px;text-align:center;border-top:1px solid #f1f5f9;">
              <p style="margin:0 0 8px 0;font-size:12px;color:#94a3b8;">This email was sent by JobPilot — your AI-powered job search assistant.</p>
              <p style="margin:0;font-size:11px;color:#cbd5e1;">© ${new Date().getFullYear()} JobPilot. All rights reserved.</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

async function logEmail(supabase, log) {
  try {
    await supabase.from('email_logs').insert(log);
  } catch { /* logging is best-effort */ }
}

async function sendWithResend(req, html, supabase) {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    await logEmail(supabase, {
      recipient_email: req.email, recipient_name: req.name, email_type: req.type,
      jobs_count: req.jobs.length, status: 'failed', error_message: 'RESEND_API_KEY not configured',
    });
    return { sent: false, preview: true, message: 'Email not sent — RESEND_API_KEY not configured. Configure the Resend API key in edge function secrets to enable email delivery.' };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'JobPilot <onboarding@resend.dev>',
      to: req.email,
      subject: req.type === 'ats90'
        ? `JobPilot: ${req.jobs.length} jobs with ATS score 90+`
        : 'JobPilot: Your Top 5 Job Matches',
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    await logEmail(supabase, {
      recipient_email: req.email, recipient_name: req.name, email_type: req.type,
      jobs_count: req.jobs.length, status: 'failed', error_message: `Resend ${res.status}: ${err}`,
    });
    throw new Error(`Resend API error: ${res.status} ${err}`);
  }

  const data = await res.json();
  await logEmail(supabase, {
    recipient_email: req.email, recipient_name: req.name, email_type: req.type,
    jobs_count: req.jobs.length, status: 'sent', provider_id: data.id,
  });
  return { sent: true, id: data.id, message: `Email sent to ${req.email}` };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    if (!body.email || !body.jobs || !body.jobs.length) {
      return new Response(JSON.stringify({ error: 'Email and jobs are required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const html = buildEmailHTML(body);
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const result = await sendWithResend(body, html, supabase);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
