import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  seedSchools,
  seedResumeVersions,
  seedTemplates,
  seedJobs,
} from "@/lib/demo-seed";

export async function POST() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Verify this is a demo account
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, config: true },
  });

  const config = user?.config as Record<string, unknown> | null;
  if (!user || !config?.is_demo) {
    return NextResponse.json({ error: "Only demo accounts can be reset" }, { status: 403 });
  }

  try {
    const userId = user.id;

    // Wipe existing data
    await prisma.outreachEvent.deleteMany({ where: { userId } });
    await prisma.job.deleteMany({ where: { userId } });
    await prisma.contact.deleteMany({ where: { userId } });
    await prisma.resumeVersion.deleteMany({ where: { userId } });
    await prisma.messageTemplate.deleteMany({ where: { userId } });

    // Re-seed resume versions
    const resumeMap = new Map<string, string>();
    for (let i = 0; i < seedResumeVersions.length; i++) {
      const rv = await prisma.resumeVersion.create({
        data: {
          userId,
          name: seedResumeVersions[i],
          isDefault: i === 0,
        },
      });
      resumeMap.set(seedResumeVersions[i], rv.id);
    }

    // Re-seed templates
    await prisma.messageTemplate.createMany({
      data: seedTemplates.map((t) => ({
        userId,
        name: t.name,
        body: t.body,
        category: t.category,
      })),
    });

    // Re-seed jobs with contacts and outreach
    for (const seedJob of seedJobs) {
      const job = await prisma.job.create({
        data: {
          userId,
          title: seedJob.title,
          company: seedJob.company,
          location: seedJob.location,
          url: seedJob.url,
          applied: seedJob.applied,
          appliedAt: seedJob.appliedAt ? new Date(seedJob.appliedAt) : null,
          interviewStage: seedJob.interviewStage as "interviewing" | "offer" | "accepted" | "rejected" | "withdrawn" | undefined,
          nextAction: seedJob.nextAction || null,
          notes: seedJob.notes || null,
          resumeVersionId: seedJob.resumeVersion ? resumeMap.get(seedJob.resumeVersion) : null,
          datePosted: seedJob.datePosted ? new Date(seedJob.datePosted) : null,
          source: "manual",
        },
      });

      if (seedJob.contacts) {
        for (const seedContact of seedJob.contacts) {
          const contact = await prisma.contact.create({
            data: {
              userId,
              name: seedContact.name,
              title: seedContact.title,
              company: seedContact.company,
              linkedinUrl: seedContact.linkedinUrl,
              connectionType: seedContact.connectionType as "alumni" | "linkedin_1st" | "cold" | "recruiter" | "other",
              school: seedContact.school || null,
            },
          });

          const statusRankMap: Record<string, number> = {
            identified: 0, message_drafted: 1, message_sent: 2, responded: 3,
            sharing_internally: 4, referral_requested: 5, referral_secured: 6,
            referral_submitted: 7, no_response: -1, declined: -2,
          };

          const lastActionAt = new Date();
          if (seedContact.daysAgo) {
            lastActionAt.setDate(lastActionAt.getDate() - seedContact.daysAgo);
          }

          await prisma.outreachEvent.create({
            data: {
              userId,
              jobId: job.id,
              contactId: contact.id,
              status: seedContact.outreachStatus as "identified" | "message_drafted" | "message_sent" | "responded" | "sharing_internally" | "referral_requested" | "referral_secured" | "referral_submitted" | "no_response" | "declined",
              statusRank: statusRankMap[seedContact.outreachStatus] ?? 0,
              platform: (seedContact.outreachPlatform as "linkedin" | "email" | "other") || null,
              lastActionAt,
            },
          });
        }
      }
    }

    // Update config (keep is_demo flag)
    await prisma.user.update({
      where: { id: userId },
      data: {
        config: {
          onboarding_completed: true,
          is_demo: true,
          schools: seedSchools,
          connections: seedSchools.map((s) => ({
            label: s.name,
            line: `I am ${s.status === "Student" ? "a student" : "an alum"} at ${s.name}`,
          })),
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Demo reset error:", err);
    return NextResponse.json({ error: "Failed to reset demo" }, { status: 500 });
  }
}
