const JSEARCH_API_URL = "https://jsearch.p.rapidapi.com/search";

interface JSearchResult {
  job_id: string;
  job_title: string;
  employer_name: string;
  employer_logo: string | null;
  job_city: string | null;
  job_state: string | null;
  job_country: string;
  job_employment_type: string | null;
  job_is_remote: boolean;
  job_apply_link: string | null;
  job_description: string | null;
  job_min_salary: number | null;
  job_max_salary: number | null;
  job_posted_at_datetime_utc: string | null;
}

export interface JobSearchResult {
  externalId: string;
  title: string;
  company: string;
  companyLogo: string | null;
  location: string;
  remoteType: string | null;
  url: string | null;
  description: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  datePosted: string | null;
}

interface CacheEntry {
  data: JobSearchResult[];
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();
const CACHE_TTL = 6 * 60 * 60 * 1000; // 6 hours
const CACHE_MAX_SIZE = 100;

function sweepExpiredEntries() {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (entry.expiresAt <= now) {
      cache.delete(key);
    }
  }
}

function buildCacheKey(query: string, location: string, remote: boolean): string {
  return `${query}|${location}|${remote}`.toLowerCase();
}

function mapResult(r: JSearchResult): JobSearchResult {
  const parts = [r.job_city, r.job_state, r.job_country].filter(Boolean);
  return {
    externalId: r.job_id,
    title: r.job_title,
    company: r.employer_name,
    companyLogo: r.employer_logo,
    location: parts.join(", ") || "Unknown",
    remoteType: r.job_is_remote ? "Remote" : (r.job_employment_type || null),
    url: r.job_apply_link,
    description: r.job_description,
    salaryMin: r.job_min_salary,
    salaryMax: r.job_max_salary,
    datePosted: r.job_posted_at_datetime_utc,
  };
}

export async function searchJobs(
  query: string,
  location: string = "",
  remote: boolean = false,
  page: number = 1
): Promise<JobSearchResult[]> {
  const apiKey = process.env.RAPIDAPI_KEY;
  if (!apiKey) {
    throw new Error("RAPIDAPI_KEY is not configured");
  }

  const cacheKey = buildCacheKey(query, location, remote) + `|${page}`;
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const params = new URLSearchParams({
    query: remote ? `${query} remote` : location ? `${query} in ${location}` : query,
    page: String(page),
    num_pages: "1",
  });

  if (remote) {
    params.set("remote_jobs_only", "true");
  }

  const res = await fetch(`${JSEARCH_API_URL}?${params.toString()}`, {
    headers: {
      "X-RapidAPI-Key": apiKey,
      "X-RapidAPI-Host": "jsearch.p.rapidapi.com",
    },
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`JSearch API error: ${res.status} ${text}`);
  }

  const json = await res.json();
  const results: JobSearchResult[] = (json.data || []).map(mapResult);

  if (cache.size >= CACHE_MAX_SIZE) {
    sweepExpiredEntries();
  }
  if (cache.size >= CACHE_MAX_SIZE) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }
  cache.set(cacheKey, { data: results, expiresAt: Date.now() + CACHE_TTL });

  return results;
}
