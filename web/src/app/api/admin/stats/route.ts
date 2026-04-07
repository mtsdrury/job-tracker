import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { error } = await requireAdmin();
  if (error) return error;

  const [
    totalUsers,
    proUsers,
    demoUsers,
    totalJobs,
    appliedJobs,
    totalContacts,
    totalOutreach,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { billingStatus: "pro" } }),
    prisma.user.count({ where: { config: { path: ["is_demo"], equals: true } } }),
    prisma.job.count(),
    prisma.job.count({ where: { applied: true } }),
    prisma.contact.count(),
    prisma.outreachEvent.count(),
  ]);

  // Recent signups (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const recentSignups = await prisma.user.count({
    where: { createdAt: { gte: sevenDaysAgo } },
  });

  return NextResponse.json({
    totalUsers,
    proUsers,
    freeUsers: totalUsers - proUsers - demoUsers,
    demoUsers,
    recentSignups,
    totalJobs,
    appliedJobs,
    totalContacts,
    totalOutreach,
  });
}
