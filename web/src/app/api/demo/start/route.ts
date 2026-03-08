import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import {
  generateDemoCredentials,
  DEMO_NAME,
  seedSchools,
  seedResumeVersions,
  seedTemplates,
  seedJobs,
} from "@/lib/demo-seed";

export async function POST() {
  try {
    const { email, password } = generateDemoCredentials();
    const hash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email,
        name: DEMO_NAME,
        password_hash: hash,
        strategyMode: "referral_first",
        stalledDays: 5,
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

    // Seed resume versions
    const resumeMap = new Map<string, string>();
    for (let i = 0; i < seedResumeVersions.length; i++) {
      const rv = await prisma.resumeVersion.create({
        data: {
          userId: user.id,
          name: seedResumeVersions[i],
          isDefault: i === 0,
        },
      });
      resumeMap.set(seedResumeVersions[i], rv.id);
    }

    // Seed templates
    await prisma.messageTemplate.createMany({
      data: seedTemplates.map((t) => ({
        userId: user.id,
        name: t.name,
        body: t.body,
        category: t.category,
      })),
    });

    // Seed jobs with contacts and outreach
    for (const seedJob of seedJobs) {
      const job = await prisma.job.create({
        data: {
          userId: user.id,
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
              userId: user.id,
              name: seedContact.name,
              title: seedContact.title,
              company: seedContact.company,
              linkedinUrl: seedContact.linkedinUrl,
              connectionType: seedContact.connectionType as "alumni" | "linkedin_1st" | "cold" | "recruiter" | "other",
              school: seedContact.school || null,
            },
          });

          const statusRankMap: Record<string, number> = {
            identified: 0,
            message_drafted: 1,
            message_sent: 2,
            responded: 3,
            sharing_internally: 4,
            referral_requested: 5,
            referral_secured: 6,
            referral_submitted: 7,
            no_response: -1,
            declined: -2,
          };

          const lastActionAt = new Date();
          if (seedContact.daysAgo) {
            lastActionAt.setDate(lastActionAt.getDate() - seedContact.daysAgo);
          }

          await prisma.outreachEvent.create({
            data: {
              userId: user.id,
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

    // Clean up old demo accounts (older than 24 hours)
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const oldDemoUsers = await prisma.user.findMany({
      where: {
        email: { contains: "@demo.jobtracker.dev" },
        createdAt: { lt: cutoff },
      },
      select: { id: true },
    });

    if (oldDemoUsers.length > 0) {
      const oldIds = oldDemoUsers.map((u) => u.id);
      await prisma.outreachEvent.deleteMany({ where: { userId: { in: oldIds } } });
      await prisma.job.deleteMany({ where: { userId: { in: oldIds } } });
      await prisma.contact.deleteMany({ where: { userId: { in: oldIds } } });
      await prisma.resumeVersion.deleteMany({ where: { userId: { in: oldIds } } });
      await prisma.messageTemplate.deleteMany({ where: { userId: { in: oldIds } } });
      await prisma.account.deleteMany({ where: { userId: { in: oldIds } } });
      await prisma.session.deleteMany({ where: { userId: { in: oldIds } } });
      await prisma.user.deleteMany({ where: { id: { in: oldIds } } });
    }

    return NextResponse.json({ email, password });
  } catch (err) {
    console.error("Demo start error:", err);
    return NextResponse.json({ error: "Failed to start demo" }, { status: 500 });
  }
}
