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
 * Generate a LinkedIn People Search URL filtered by company LinkedIn ID and school
 * @param companyLinkedInId - The LinkedIn company ID
 * @param schoolLinkedInId - The LinkedIn school ID
 * @returns LinkedIn search URL
 */
export function generateLinkedInSearchUrl(
  companyLinkedInId: string,
  schoolLinkedInId: string
): string {
  const params = new URLSearchParams({
    keywords: "",
    currentCompany: companyLinkedInId,
    school: schoolLinkedInId,
  });
  return `https://www.linkedin.com/search/results/people/?${params.toString()}`;
}

/**
 * Generate a LinkedIn People Search URL by company name (fallback when no company LinkedIn ID)
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
 * Generate LinkedIn search URLs for all configured schools
 * @param companyName - The company name
 * @param companyLinkedInId - Optional LinkedIn company ID for more precise search
 * @param schools - Array of school objects with linkedin_id (or linkedinId)
 * @returns Array of SearchLink objects with school name and URL
 */
export function generateAllSchoolSearchUrls(
  companyName: string,
  schools: School[],
  companyLinkedInId?: string
): SearchLink[] {
  return schools
    .filter((school) => school.linkedin_id || school.linkedinId) // Support both formats
    .map((school) => {
      const linkedinId = school.linkedin_id || school.linkedinId;
      return {
        schoolName: school.name,
        linkedin_id: linkedinId,
        url: companyLinkedInId
          ? generateLinkedInSearchUrl(companyLinkedInId, linkedinId!)
          : generateLinkedInSearchUrlByName(companyName, linkedinId!),
      };
    });
}
