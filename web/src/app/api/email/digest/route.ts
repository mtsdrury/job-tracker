import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDigestData } from "@/lib/email-digest";
import { sendDigestEmail } from "@/lib/resend";

export const maxDuration = 300; // 5 minutes

export async function POST(req: NextRequest) {
  try {
    // Verify cron secret
    const cronSecret = req.headers.get("authorization");
    if (!cronSecret || cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const userId = body.userId; // Optional: send to specific user

    let users;

    if (userId) {
      // Send digest to specific user for testing
      users = await prisma.user.findMany({
        where: { id: userId, emailDigest: true },
        select: { id: true, email: true, name: true },
      });
    } else {
      // Send digests to all opted-in users for today's day of week
      const todayDayOfWeek = new Date().getDay(); // 0 = Sunday, 1 = Monday, etc.

      users = await prisma.user.findMany({
        where: {
          emailDigest: true,
          emailDigestDay: todayDayOfWeek,
        },
        select: { id: true, email: true, name: true },
      });
    }

    if (users.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No users to send digests to",
        count: 0,
      });
    }

    let successCount = 0;
    let failureCount = 0;
    const errors: string[] = [];

    for (const user of users) {
      try {
        const digestData = await buildDigestData(user.id);

        if (!digestData) {
          failureCount++;
          errors.push(`Failed to build digest data for user ${user.id}`);
          continue;
        }

        const result = await sendDigestEmail(user.name, user.email, digestData);

        if (result.success) {
          successCount++;
        } else {
          failureCount++;
          errors.push(`Failed to send email to ${user.email}: ${result.error}`);
        }
      } catch (error) {
        failureCount++;
        errors.push(`Error processing user ${user.id}: ${String(error)}`);
      }
    }

    return NextResponse.json({
      success: true,
      message: `Sent ${successCount} digests, ${failureCount} failed`,
      count: successCount,
      failed: failureCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined, // Limit error reporting
    });
  } catch (error) {
    console.error("Error in digest endpoint:", error);
    return NextResponse.json(
      { error: "Failed to process digest request", details: String(error) },
      { status: 500 }
    );
  }
}

// Allow GET for easy testing from browser
export async function GET(req: NextRequest) {
  try {
    // Simple GET endpoint for manual testing (also needs auth)
    const cronSecret = req.headers.get("authorization");
    if (!cronSecret || cronSecret !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = req.nextUrl.searchParams.get("userId");

    if (!userId) {
      return NextResponse.json(
        { error: "userId query parameter required for GET" },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, emailDigest: true },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const digestData = await buildDigestData(user.id);

    if (!digestData) {
      return NextResponse.json(
        { error: "Failed to build digest data" },
        { status: 500 }
      );
    }

    const result = await sendDigestEmail(user.name, user.email, digestData);

    return NextResponse.json({
      success: result.success,
      message: result.success ? "Digest sent successfully" : result.error,
      user: { name: user.name, email: user.email },
      digest: {
        jobsAdded: digestData.jobsAdded.count,
        jobsApplied: digestData.jobsApplied.count,
        outreach: digestData.outreachEvents.count,
        interviews: digestData.upcomingInterviews.count,
        stalled: digestData.stalledJobs.count,
      },
    });
  } catch (error) {
    console.error("Error in digest GET:", error);
    return NextResponse.json(
      { error: "Failed to process request", details: String(error) },
      { status: 500 }
    );
  }
}
