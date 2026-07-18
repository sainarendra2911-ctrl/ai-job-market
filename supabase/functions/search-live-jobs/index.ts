import { createClient } from 'npm:@supabase/supabase-js@2.57.4';


const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

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

    const body = await req.json();
    const query = (body.query || '').trim();
    const source = (body.source || '').trim();
    const location = (body.location || '').trim();

    if (!query) {
      return new Response(JSON.stringify({ error: 'Query is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Query the Supabase jobs table — no generated data
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    let dbQuery = supabase
      .from('jobs')
      .select('*')
      .order('posted_date', { ascending: false, nullsFirst: false })
      .limit(50);

    // Filter by title/keyword search (case-insensitive)
    dbQuery = dbQuery.or(`title.ilike.%${query}%,description.ilike.%${query}%,company.ilike.%${query}%`);

    if (source) {
      dbQuery = dbQuery.eq('source', source);
    }
    if (location) {
      dbQuery = dbQuery.ilike('location', `%${location}%`);
    }

    const { data, error } = await dbQuery;

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ jobs: data || [], count: (data || []).length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
