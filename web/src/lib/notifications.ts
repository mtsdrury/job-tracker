import { prisma } from "@/lib/prisma";

/**
 * Generate notifications for a user based on job pipeline events.
 * This function is idempotent - it checks for existing notifications
 * before creating new ones to avoid duplicates.
 */

// Helper function to get start of day
function startOfDay(date: Date): Date {
  const newDate = new Date(date);
  newDate.setHours(0, 0, 0, 0);
  return newDate;
}

// Helper function to add days
function addDays(date: Date, days: number): Date {
  const newDate = new Date(date);
  newDate.setDate(newDate.getDate() + days);
  return newDate;
}

export async function generateNotifications(userId: string) {
  try {
    // Fetch user config to get stalled days threshold
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        stalledDays: true,
      },
    });

    if (!user) return;

    const stalledDays = user.stalledDays || 5;
    const now = new Date();
    const today = startOfDay(now);

    // 1. Check for interviews scheduled within 24 hours
    const tomorrowStart = addDays(today, 1);
    const tomorrowEnd = addDays(today, 2);

    const upcomingInterviews = await prisma.interview.findMany({
      where: {
        userId,
        scheduledAt: {
          gte: tomorrowStart,
          lt: tomorrowEnd,
        },
        outcome: null, // Not yet completed
      },
      include: {
        job: {
          select: {
            id: true,
            title: true,
            company: true,
          },
        },
      },
    });

    for (const interview of upcomingInterviews) {
      // Check if we already have a notification for this interview today
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: "interview_tomorrow",
          jobId: interview.jobId,
          createdAt: {
            gte: today,
          },
        },
      });

      if (!existing && interview.scheduledAt) {
        const timeStr = interview.scheduledAt.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });

        await prisma.notification.create({
          data: {
            userId,
            type: "interview_tomorrow",
            title: `Interview tomorrow at ${interview.job.company}`,
            message: `Your interview for ${interview.job.title} is scheduled for tomorrow at ${timeStr}`,
            jobId: interview.jobId,
            data: {
              stage: interview.stage,
              scheduledAt: interview.scheduledAt,
            },
          },
        });
      }
    }

    // 2. Check for stalled jobs (added 5+ days ago with no referral outreach)
    const stalledThreshold = addDays(today, -stalledDays);

    const oldJobs = await prisma.job.findMany({
      where: {
        userId,
        createdAt: {
          lte: stalledThreshold,
        },
        archived: false,
        applied: false, // Haven't applied yet
      },
      select: {
        id: true,
        title: true,
        company: true,
        createdAt: true,
        outreachEvents: {
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
    });

    for (const job of oldJobs) {
      // Check if there's any outreach activity
      if (job.outreachEvents.length === 0) {
        // Check if we already have a stalled_job notification for this job today
        const existing = await prisma.notification.findFirst({
          where: {
            userId,
            type: "stalled_job",
            jobId: job.id,
            createdAt: {
              gte: today,
            },
          },
        });

        if (!existing) {
          await prisma.notification.create({
            data: {
              userId,
              type: "stalled_job",
              title: `Time to find a referral for ${job.company}`,
              message: `You added this job ${stalledDays} days ago. Starting referral outreach could improve your chances.`,
              jobId: job.id,
              data: {
                daysWaiting: stalledDays,
              },
            },
          });
        }
      }
    }

    // 3. Check for follow-ups due (outreach with no response for 3+ days)
    const followUpThreshold = addDays(today, -3);

    const stalledOutreach = await prisma.outreachEvent.findMany({
      where: {
        userId,
        status: {
          in: ["message_sent", "identified", "message_drafted"],
        },
        lastActionAt: {
          lte: followUpThreshold,
        },
      },
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
    });

    for (const outreach of stalledOutreach) {
      // Check if we already have a follow_up_due notification for this outreach today
      const existing = await prisma.notification.findFirst({
        where: {
          userId,
          type: "follow_up_due",
          jobId: outreach.jobId,
          data: {
            path: ["contactId"],
            equals: outreach.contactId,
          },
          createdAt: {
            gte: today,
          },
        },
      });

      if (!existing) {
        const daysSinceAction = Math.floor(
          (now.getTime() - outreach.lastActionAt.getTime()) / (1000 * 60 * 60 * 24)
        );

        await prisma.notification.create({
          data: {
            userId,
            type: "follow_up_due",
            title: `Follow up with ${outreach.contact.name} at ${outreach.job.company}`,
            message: `It has been ${daysSinceAction} days since your last outreach. Consider following up.`,
            jobId: outreach.jobId,
            data: {
              contactId: outreach.contact.id,
              contactName: outreach.contact.name,
              daysSinceAction,
            },
          },
        });
      }
    }
  } catch (error) {
    console.error("Error generating notifications:", error);
  }
}

/**
 * Get formatted time difference for display
 */
export function getTimeAgoString(date: Date): string {
  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return "just now";
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    return `${weeks}w ago`;
  }

  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

/**
 * Get icon type based on notification type
 */
export function getNotificationIcon(type: string) {
  switch (type) {
    case "interview_tomorrow":
      return "calendar";
    case "stalled_job":
      return "alert-circle";
    case "follow_up_due":
      return "send";
    case "referral_responded":
      return "message-circle";
    case "outreach_reminder":
      return "bell";
    default:
      return "info";
  }
}

/**
 * Get color variant based on notification type
 */
export function getNotificationVariant(
  type: string
): "success" | "warning" | "info" | "error" {
  switch (type) {
    case "referral_responded":
      return "success";
    case "interview_tomorrow":
      return "info";
    case "stalled_job":
      return "warning";
    case "follow_up_due":
      return "warning";
    default:
      return "info";
  }
}
