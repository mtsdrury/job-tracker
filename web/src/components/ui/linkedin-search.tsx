"use client";

import { Linkedin, ExternalLink } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "./card";
import { generateAllSchoolSearchUrls, type School } from "@/lib/linkedin-urls";

interface LinkedInSearchLinksProps {
  companyName: string;
  schools?: School[];
  companyLinkedInId?: string;
}

export function LinkedInSearchLinks({
  companyName,
  schools = [],
  companyLinkedInId,
}: LinkedInSearchLinksProps) {
  // Filter out schools without linkedin_id (support both formats)
  const validSchools = schools.filter(
    (s) => (s as any).linkedin_id || s.linkedinId
  );

  if (validSchools.length === 0) {
    return (
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Linkedin className="h-4 w-4" />
            Find Referrals on LinkedIn
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted">
            Add your schools in Settings to find alumni referrals at {companyName}.
          </p>
        </CardContent>
      </Card>
    );
  }

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
          Find Referrals on LinkedIn
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {searchLinks.map((link) => (
            <a
              key={link.schoolName}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-between rounded-lg border border-border bg-surface/50 px-4 py-3 transition-colors hover:bg-surface hover:border-accent/30"
            >
              <span className="text-sm text-foreground">
                {link.schoolName} alumni at {companyName}
              </span>
              <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted" />
            </a>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
