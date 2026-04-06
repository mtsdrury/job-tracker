"use client";

import { Linkedin, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./card";
import { generateAllSchoolSearchUrls, generateCompanyOnlySearchUrl, type School } from "@/lib/linkedin-urls";

interface LinkedInSearchLinksProps {
  companyName?: string;
  schools?: School[];
  companyLinkedInId?: string;
}

export function LinkedInSearchLinks({
  companyName = "",
  schools = [],
  companyLinkedInId,
}: LinkedInSearchLinksProps) {
  // Show disabled state if no company name
  if (!companyName) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Linkedin className="h-4 w-4" />
            Find Connections
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            Add a company name to search for connections.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Filter out schools without linkedin_id (support both formats)
  const validSchools = schools.filter(
    (s) => (s as any).linkedin_id || s.linkedinId
  );

  // Get all search links (includes company-only search as first entry)
  const searchLinks = generateAllSchoolSearchUrls(
    companyName,
    validSchools,
    companyLinkedInId
  );

  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Linkedin className="h-4 w-4" />
          Find Connections
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {searchLinks.map((link, index) => {
            // First entry is the company-only search
            const isCompanyOnly = index === 0;

            return (
              <a
                key={`${link.schoolName}-${index}`}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center justify-between rounded-lg border px-4 py-3 transition-colors ${
                  isCompanyOnly
                    ? "border-accent/50 bg-accent/10 hover:bg-accent/15 hover:border-accent/70"
                    : "border-border bg-surface/50 hover:bg-surface hover:border-accent/30"
                }`}
              >
                <span className={`text-sm ${isCompanyOnly ? "font-semibold text-foreground" : "text-foreground"}`}>
                  {link.schoolName}
                </span>
                <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted" />
              </a>
            );
          })}
          {validSchools.length === 0 && (
            <p className="text-xs text-muted mt-2">
              Add your schools in Settings to see alumni filters.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
