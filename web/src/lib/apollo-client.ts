/**
 * Apollo.io People Enrichment API client
 * Server-only utility for enriching contacts with email, title, LinkedIn URL, etc.
 */

export interface ApolloEnrichmentResult {
  email: string | null;
  title: string | null;
  linkedinUrl: string | null;
  photoUrl: string | null;
  headline: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  enrichedAt: Date;
}

interface ApolloApiResponse {
  person?: {
    email?: string;
    title?: string;
    linkedin_url?: string;
    photo_url?: string;
    headline?: string;
    city?: string;
    state?: string;
    country?: string;
  };
  error?: string;
}

export async function enrichContact(
  apiKey: string,
  firstName: string,
  lastName: string,
  company: string
): Promise<ApolloEnrichmentResult | null> {
  if (!apiKey) {
    throw new Error("Apollo API key is required");
  }

  if (!firstName || !lastName || !company) {
    throw new Error("First name, last name, and company are required");
  }

  try {
    const response = await fetch("https://api.apollo.io/api/v1/people/match", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        "X-Api-Key": apiKey,
      },
      body: JSON.stringify({
        first_name: firstName,
        last_name: lastName,
        organization_name: company,
        reveal_personal_emails: false,
      }),
    });

    // Handle non-200 responses
    if (!response.ok) {
      const errorText = await response.text();

      // Handle rate limiting gracefully
      if (response.status === 429) {
        throw new Error("API rate limit exceeded. Please try again later.");
      }

      // Handle unauthorized (invalid API key)
      if (response.status === 401 || response.status === 403) {
        throw new Error("Invalid Apollo API key. Please check your settings.");
      }

      // Handle not found
      if (response.status === 404) {
        return null;
      }

      throw new Error(`Apollo API error: ${response.status}`);
    }

    const data: ApolloApiResponse = await response.json();

    // No person found
    if (!data.person) {
      return null;
    }

    const person = data.person;

    return {
      email: person.email || null,
      title: person.title || null,
      linkedinUrl: person.linkedin_url || null,
      photoUrl: person.photo_url || null,
      headline: person.headline || null,
      city: person.city || null,
      state: person.state || null,
      country: person.country || null,
      enrichedAt: new Date(),
    };
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("Failed to enrich contact");
  }
}
