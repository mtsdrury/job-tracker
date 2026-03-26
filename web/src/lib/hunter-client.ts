/**
 * Hunter.io Email Finder API client.
 * Free tier: 25 searches + 50 verifications per month.
 * Users provide their own API key in settings (same pattern as Apollo.io).
 */

const HUNTER_API_BASE = "https://api.hunter.io/v2";

export interface HunterEmailResult {
  email: string;
  score: number; // confidence 0-100
  position: string | null;
  firstName: string | null;
  lastName: string | null;
  company: string | null;
  sources: Array<{
    domain: string;
    uri: string;
    extractedOn: string;
  }>;
}

interface HunterEmailFinderResponse {
  data: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    score: number;
    domain: string;
    position: string | null;
    company: string | null;
    sources: Array<{
      domain: string;
      uri: string;
      extracted_on: string;
    }>;
  };
}

interface HunterDomainSearchResponse {
  data: {
    domain: string;
    organization: string;
    emails: Array<{
      value: string;
      type: string;
      confidence: number;
      first_name: string | null;
      last_name: string | null;
      position: string | null;
      sources: Array<{
        domain: string;
        uri: string;
        extracted_on: string;
      }>;
    }>;
  };
  meta: {
    results: number;
    limit: number;
    offset: number;
  };
}

interface HunterErrorResponse {
  errors: Array<{ id: string; code: number; details: string }>;
}

/**
 * Find a person's professional email by name + company domain.
 * Costs 1 Hunter credit per call.
 */
export async function findEmail(
  apiKey: string,
  firstName: string,
  lastName: string,
  domain: string
): Promise<HunterEmailResult> {
  const params = new URLSearchParams({
    domain,
    first_name: firstName,
    last_name: lastName,
    api_key: apiKey,
  });

  const res = await fetch(`${HUNTER_API_BASE}/email-finder?${params.toString()}`);

  if (!res.ok) {
    const err = (await res.json()) as HunterErrorResponse;
    const detail = err.errors?.[0]?.details || `Hunter API error: ${res.status}`;
    throw new Error(detail);
  }

  const json = (await res.json()) as HunterEmailFinderResponse;
  const d = json.data;

  return {
    email: d.email,
    score: d.score,
    position: d.position,
    firstName: d.first_name,
    lastName: d.last_name,
    company: d.company,
    sources: (d.sources || []).map((s) => ({
      domain: s.domain,
      uri: s.uri,
      extractedOn: s.extracted_on,
    })),
  };
}

/**
 * Search all emails at a company domain.
 * Costs 1 credit per 10 results returned.
 */
export async function searchDomain(
  apiKey: string,
  domain: string,
  limit: number = 10
): Promise<{
  organization: string;
  emails: HunterEmailResult[];
  total: number;
}> {
  const params = new URLSearchParams({
    domain,
    limit: String(limit),
    api_key: apiKey,
  });

  const res = await fetch(`${HUNTER_API_BASE}/domain-search?${params.toString()}`);

  if (!res.ok) {
    const err = (await res.json()) as HunterErrorResponse;
    const detail = err.errors?.[0]?.details || `Hunter API error: ${res.status}`;
    throw new Error(detail);
  }

  const json = (await res.json()) as HunterDomainSearchResponse;

  return {
    organization: json.data.organization,
    emails: json.data.emails.map((e) => ({
      email: e.value,
      score: e.confidence,
      position: e.position,
      firstName: e.first_name,
      lastName: e.last_name,
      company: json.data.organization,
      sources: (e.sources || []).map((s) => ({
        domain: s.domain,
        uri: s.uri,
        extractedOn: s.extracted_on,
      })),
    })),
    total: json.meta.results,
  };
}
