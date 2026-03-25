import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/account/export - Export all user data as JSON
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Fetch all user data in parallel
    const [user, jobs, contacts, resumeVersions, messageTemplates, outreachEvents] =
      await Promise.all([
        prisma.user.findUnique({
          where: { id: userId },
          select: {
            id: true,
            email: true,
            name: true,
            image: true,
            createdAt: true,
            billingStatus: true,
            strategyMode: true,
            stalledDays: true,
            config: true,
          },
        }),
        prisma.job.findMany({
          where: { userId },
          include: {
            resumeVersion: true,
            outreachEvents: {
              include: {
                contact: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.contact.findMany({
          where: { userId },
          include: {
            outreachEvents: true,
          },
          orderBy: { createdAt: "desc" },
        }),
        prisma.resumeVersion.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.messageTemplate.findMany({
          where: { userId },
          orderBy: { createdAt: "desc" },
        }),
        prisma.outreachEvent.findMany({
          where: { userId },
          include: {
            job: {
              select: {
                id: true,
                title: true,
                company: true,
              },
            },
            contact: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: "desc" },
        }),
      ]);

    // Compile export data
    const exportData = {
      exportedAt: new Date().toISOString(),
      user,
      jobs,
      contacts,
      resumeVersions,
      messageTemplates,
      outreachEvents,
      summary: {
        totalJobs: jobs.length,
        totalContacts: contacts.length,
        totalResumeVersions: resumeVersions.length,
        totalMessageTemplates: messageTemplates.length,
        totalOutreachEvents: outreachEvents.length,
      },
    };

    // Format filename with date
    const now = new Date();
    const dateString = now.toISOString().split("T")[0]; // YYYY-MM-DD
    const filename = `knowsomeone-export-${dateString}.json`;

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error("Data export error:", error);
    return NextResponse.json(
      { error: "Failed to export data. Please try again." },
      { status: 500 }
    );
  }
}
