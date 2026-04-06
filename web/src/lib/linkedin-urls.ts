/**
 * LinkedIn deep linking utility for finding referrals
 * Generates direct LinkedIn search URLs filtered by company and school alumni
 */

export interface School {
  name: string;
  linkedin_id?: string;
  linkedinId?: string; // Support both camelCase and snake_case
  status?: string;
}

export interface SearchLink {
  schoolName: string;
  url: string;
  linkedin_id?: string;
}

/**
 * Generate a LinkedIn People Search URL for people at a company (no school filter)
 * @param companyName - The company name to search
 * @param companyLinkedInId - Optional LinkedIn company ID for more precise search
 * @returns LinkedIn search URL
 */
export function generateCompanyOnlySearchUrl(
  companyName: string,
  companyLinkedInId?: string
): string {
  const params = new URLSearchParams();

  if (companyLinkedInId) {
    params.set("currentCompany", companyLinkedInId);
  } else {
    params.set("keywords", companyName);
  }

  return `https://www.linkedin.com/search/results/people/?${params.toString()}`;
}

/**
 * Generate a LinkedIn People Search URL filtered by company LinkedIn ID and school
 * Uses company as the primary filter
 * @param companyName - The company name (used as keyword fallback)
 * @param companyLinkedInId - The LinkedIn company ID
 * @param schoolLinkedInId - The LinkedIn school ID
 * @returns LinkedIn search URL
 */
export function generateLinkedInSearchUrl(
  companyName: string,
  companyLinkedInId: string,
  schoolLinkedInId: string
): string {
  const params = new URLSearchParams({
    currentCompany: companyLinkedInId,
    school: schoolLinkedInId,
  });
  return `https://www.linkedin.com/search/results/people/?${params.toString()}`;
}

/**
 * Generate a LinkedIn People Search URL by company name (fallback when no company LinkedIn ID)
 * Uses company name as the primary keyword filter with school filter
 * @param companyName - The company name to search
 * @param schoolLinkedInId - The LinkedIn school ID
 * @returns LinkedIn search URL
 */
export function generateLinkedInSearchUrlByName(
  companyName: string,
  schoolLinkedInId: string
): string {
  const params = new URLSearchParams({
    keywords: companyName,
    school: schoolLinkedInId,
  });
  return `https://www.linkedin.com/search/results/people/?${params.toString()}`;
}

/**
 * Generate LinkedIn search URLs for all configured schools, including a company-only search as the first entry
 * @param companyName - The company name
 * @param schools - Array of school objects with linkedin_id (or linkedinId)
 * @param companyLinkedInId - Optional LinkedIn company ID for more precise search
 * @returns Array of SearchLink objects with school name and URL, with company-only search first
 */
export function generateAllSchoolSearchUrls(
  companyName: string,
  schools: School[],
  companyLinkedInId?: string
): SearchLink[] {
  // First entry: company-only search
  const companyOnlyLink: SearchLink = {
    schoolName: `All people at ${companyName}`,
    url: generateCompanyOnlySearchUrl(companyName, companyLinkedInId),
  };

  // School-specific searches
  const schoolLinks = schools
    .filter((school) => school.linkedin_id || school.linkedinId) // Support both formats
    .map((school) => {
      const linkedinId = school.linkedin_id || school.linkedinId;
      return {
        schoolName: school.name,
        linkedin_id: linkedinId,
        url: companyLinkedInId
          ? generateLinkedInSearchUrl(companyName, companyLinkedInId, linkedinId!)
          : generateLinkedInSearchUrlByName(companyName, linkedinId!),
      };
    });

  return [companyOnlyLink, ...schoolLinks];
}
