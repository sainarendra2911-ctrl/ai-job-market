import { createClient } from 'npm:@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface SearchRequest {
  query: string;
  source: string;
  location?: string;
}

interface NormalizedJob {
  title: string;
  company: string | null;
  location: string | null;
  experience_min: number | null;
  experience_max: number | null;
  salary_min: number | null;
  salary_max: number | null;
  currency: string;
  work_mode: string | null;
  employment_type: string | null;
  posted_date: string | null;
  source: string;
  job_url: string | null;
  skills: string[];
  keywords: string[];
  description: string | null;
}

// Generate realistic sample job listings for the requested query/source.
// This simulates a live job search since external job board APIs require
// paid keys and scraping is legally restricted. The results are normalized
// to the app's job schema so they can be imported directly.
function generateResults(req: SearchRequest): NormalizedJob[] {
  const query = req.query.trim();
  const source = req.source || 'LinkedIn';
  const location = req.location?.trim() || '';
  const seed = query.toLowerCase() + source.toLowerCase() + location.toLowerCase();

  // Deterministic pseudo-random based on seed
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const rand = (n: number) => {
    hash = (hash * 9301 + 49297) % 233280;
    return Math.floor((hash / 233280) * n);
  };

  const companies = ['TechCorp', 'DataFlow Inc', 'CloudNative Labs', 'Quantum Systems', 'ByteForge', 'NexaSoft', 'Apex Digital', 'Vertex AI', 'MetaSphere', 'CodeCraft', 'InnoTech', 'ScaleUp Co'];
  const modes = ['Remote', 'Hybrid', 'On-site'];
  const types = ['Full-time', 'Contract', 'Part-time'];
  const skillSets = [
    ['JavaScript', 'React', 'Node.js', 'TypeScript', 'REST'],
    ['Python', 'Django', 'PostgreSQL', 'Docker', 'AWS'],
    ['Java', 'Spring', 'Microservices', 'Kubernetes', 'gRPC'],
    ['Go', 'gRPC', 'Kafka', 'Terraform', 'GCP'],
    ['React', 'Redux', 'Tailwind', 'Jest', 'GraphQL'],
    ['Python', 'TensorFlow', 'Pandas', 'NLP', 'SQL'],
  ];
  const cities = location ? [location, 'Remote'] : ['San Francisco, CA', 'New York, NY', 'Austin, TX', 'Seattle, WA', 'Remote', 'Boston, MA', 'Remote'];

  const count = 6 + rand(6); // 6-11 results
  const results: NormalizedJob[] = [];
  const usedCompanies = new Set<string>();

  for (let i = 0; i < count; i++) {
    let company = companies[rand(companies.length)];
    while (usedCompanies.has(company) && usedCompanies.size < companies.length) {
      company = companies[rand(companies.length)];
    }
    usedCompanies.add(company);

    const expMin = rand(8);
    const expMax = expMin + 1 + rand(4);
    const salMin = (60 + rand(120)) * 1000;
    const salMax = salMin + (20 + rand(60)) * 1000;
    const daysAgo = rand(30);
    const posted = new Date();
    posted.setDate(posted.getDate() - daysAgo);

    const seniority = expMin >= 5 ? 'Senior' : expMin >= 3 ? 'Mid-Level' : 'Junior';
    const title = `${seniority} ${query}`.replace(/\s+/g, ' ').trim();
    const skills = skillSets[rand(skillSets.length)];

    results.push({
      title,
      company,
      location: cities[rand(cities.length)],
      experience_min: expMin,
      experience_max: expMax,
      salary_min: salMin,
      salary_max: salMax,
      currency: 'USD',
      work_mode: modes[rand(modes.length)],
      employment_type: types[rand(types.length)],
      posted_date: posted.toISOString().split('T')[0],
      source,
      job_url: `https://${source.toLowerCase().replace(/\s+/g, '')}.com/jobs/${Math.abs(hash + i * 1000)}`,
      skills,
      keywords: [query, seniority],
      description: `We are seeking a ${title} to join our team at ${company}. The ideal candidate will have ${expMin}-${expMax} years of experience with ${skills.slice(0, 3).join(', ')}. This is a ${modes[rand(modes.length)].toLowerCase()} role offering competitive compensation and growth opportunities.`,
    });
  }

  return results;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json() as SearchRequest;
    if (!body.query || !body.query.trim()) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const jobs = generateResults(body);

    return new Response(JSON.stringify({ jobs, count: jobs.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
