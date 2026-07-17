/**
 * ATS (Applicant Tracking System) scoring engine.
 * Scores a resume profile against a job's JD/description and skills.
 * Returns 0-100 score with breakdown.
 */

/**
 * Normalize text for comparison: lowercase, trim, remove extra spaces.
 */
function normalize(text) {
  return (text || '').toLowerCase().trim().replace(/\s+/g, ' ');
}

/**
 * Extract skill-like tokens from text using a simple keyword approach.
 */
function tokenize(text) {
  const normalized = normalize(text);
  if (!normalized) return [];
  // Split on non-alphanumeric (keep + and # and . for C++, C#, .NET etc)
  const tokens = normalized.split(/[^a-z0-9+#.]+/).filter((t) => t.length >= 2);
  return tokens;
}

/**
 * Calculate ATS match score between a profile and a job.
 *
 * @param {object} profile - { skills: string[], experience_years: number|null, title: string|null, ... }
 * @param {object} job - { skills: string[], description: string|null, title: string, experience_min, experience_max, ... }
 * @returns {{ score: number, matched: string[], missing: string[], breakdown: object }}
 */
export function scoreJobMatch(profile, job) {
  const breakdown = {};
  const matched = [];
  const missing = [];

  // --- 1. Skills matching (50% weight) ---
  const profileSkills = (profile.skills || []).map((s) => normalize(s)).filter(Boolean);
  const jobSkills = (job.skills || []).map((s) => normalize(s)).filter(Boolean);

  let skillsScore = 0;
  if (jobSkills.length > 0) {
    const matchedSkills = jobSkills.filter((js) =>
      profileSkills.some((ps) => ps === js || ps.includes(js) || js.includes(ps))
    );
    skillsScore = (matchedSkills.length / jobSkills.length) * 100;
    matched.push(...matchedSkills);
    missing.push(...jobSkills.filter((js) => !matchedSkills.includes(js)));
  } else {
    skillsScore = 50; // neutral if no skills listed
  }
  breakdown.skills = skillsScore;

  // --- 2. Keyword / description matching (25% weight) ---
  const profileText = normalize(
    [profile.title, profile.summary, profile.skills?.join(' '), profile.education]
      .filter(Boolean).join(' ')
  );
  const profileTokens = new Set(tokenize(profileText));
  const jobText = normalize([job.title, job.description, job.keywords?.join(' ')].filter(Boolean).join(' '));
  const jobTokens = tokenize(jobText).filter((t) => t.length >= 3);

  let keywordScore = 0;
  if (jobTokens.length > 0) {
    const keywordMatches = jobTokens.filter((t) => profileTokens.has(t));
    keywordScore = Math.min(100, (keywordMatches.length / Math.min(jobTokens.length, 30)) * 100);
  }
  breakdown.keywords = keywordScore;

  // --- 3. Experience matching (15% weight) ---
  let expScore = 50;
  if (profile.experience_years != null && (job.experience_min != null || job.experience_max != null)) {
    const candidateYears = profile.experience_years;
    const reqMin = job.experience_min ?? 0;
    const reqMax = job.experience_max ?? reqMin + 5;
    if (candidateYears >= reqMax) {
      expScore = 100;
    } else if (candidateYears >= reqMin) {
      expScore = 70 + ((candidateYears - reqMin) / Math.max(1, reqMax - reqMin)) * 30;
    } else {
      expScore = (candidateYears / Math.max(1, reqMin)) * 60;
    }
  }
  breakdown.experience = expScore;

  // --- 4. Title relevance (10% weight) ---
  let titleScore = 0;
  if (profile.title && job.title) {
    const profileTitleTokens = tokenize(profile.title);
    const jobTitleTokens = tokenize(job.title);
    const titleMatches = jobTitleTokens.filter((t) =>
      profileTitleTokens.some((pt) => pt === t || pt.includes(t) || t.includes(pt))
    );
    titleScore = jobTitleTokens.length > 0
      ? Math.min(100, (titleMatches.length / jobTitleTokens.length) * 100)
      : 0;
  }
  breakdown.title = titleScore;

  // --- Weighted total ---
  const score = Math.round(
    breakdown.skills * 0.5 +
    breakdown.keywords * 0.25 +
    breakdown.experience * 0.15 +
    breakdown.title * 0.1
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    matched: [...new Set(matched)],
    missing: [...new Set(missing)],
    breakdown,
  };
}

/**
 * Score all jobs against a profile, return sorted by score descending.
 * @param {object} profile
 * @param {array} jobs
 * @returns {array} jobs with `_atsScore` and `_atsBreakdown` fields added
 */
export function rankJobsByATS(profile, jobs) {
  return jobs
    .map((job) => {
      const result = scoreJobMatch(profile, job);
      return { ...job, _atsScore: result.score, _atsMatched: result.matched, _atsMissing: result.missing, _atsBreakdown: result.breakdown };
    })
    .sort((a, b) => b._atsScore - a._atsScore);
}

/**
 * Get ATS score badge color class.
 */
export function atsScoreColor(score) {
  if (score >= 90) return { bg: 'bg-emerald-100', text: 'text-emerald-700', ring: 'ring-emerald-200', label: 'Excellent' };
  if (score >= 75) return { bg: 'bg-brand-100', text: 'text-brand-700', ring: 'ring-brand-200', label: 'Good' };
  if (score >= 60) return { bg: 'bg-amber-100', text: 'text-amber-700', ring: 'ring-amber-200', label: 'Fair' };
  return { bg: 'bg-slate-100', text: 'text-slate-600', ring: 'ring-slate-200', label: 'Low' };
}
