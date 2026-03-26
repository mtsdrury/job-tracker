import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      strategyMode: true,
      stalledDays: true,
      config: true,
      targetRoles: true,
      preferredLocations: true,
      remotePreference: true,
      experienceLevel: true,
      emailDigest: true,
      emailDigestDay: true,
      billingStatus: true,
      toneProfile: true,
      writingSamples: true,
      apolloApiKey: true,
      resumeVersions: { select: { id: true, name: true, isDefault: true, fileUrl: true }, orderBy: { createdAt: "asc" } },
      messageTemplates: { select: { id: true, name: true, body: true, category: true }, orderBy: { createdAt: "asc" } },
    },
  });

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Mask the Apollo API key (show only last 4 chars)
  const maskedUser = {
    ...user,
    apolloApiKey: user.apolloApiKey
      ? `${"*".repeat(user.apolloApiKey.length - 4)}${user.apolloApiKey.slice(-4)}`
      : null,
  };

  return NextResponse.json(maskedUser);
}

export async function PUT(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const {
      strategyMode,
      stalledDays,
      schools,
      resumeVersions,
      templates,
      targetRoles,
      preferredLocations,
      remotePreference,
      experienceLevel,
      emailDigest,
      emailDigestDay,
      toneProfile,
      writingSamples,
      apolloApiKey
    } = body;

    // Update user
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { config: true },
    });
    const currentConfig = (currentUser?.config as Record<string, unknown>) || {};

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        strategyMode: strategyMode || undefined,
        stalledDays: stalledDays || undefined,
        targetRoles: targetRoles || undefined,
        preferredLocations: preferredLocations || undefined,
        remotePreference: remotePreference || undefined,
        experienceLevel: experienceLevel || undefined,
        emailDigest: emailDigest !== undefined ? emailDigest : undefined,
        emailDigestDay: emailDigestDay !== undefined ? emailDigestDay : undefined,
        toneProfile: toneProfile || undefined,
        writingSamples: writingSamples || undefined,
        apolloApiKey: apolloApiKey || undefined,
        config: {
          ...currentConfig,
          schools: schools || currentConfig.schools || [],
          connections: (schools || []).map((s: { name: string; status?: string }) => ({
            label: s.name,
            line: `I am ${s.status === "Student" ? "a student" : "an alum"} at ${s.name}`,
          })),
        },
      },
    });

    // Sync resume versions: only delete and recreate if resumeVersions is provided in request
    if (Array.isArray(resumeVersions)) {
      await prisma.resumeVersion.deleteMany({ where: { userId: session.user.id } });
      if (resumeVersions.length > 0) {
        await prisma.resumeVersion.createMany({
          data: resumeVersions.map((name: string, i: number) => ({
            userId: session.user.id,
            name,
            isDefault: i === 0,
          })),
        });
      }
    }

    // Sync templates: only delete and recreate if templates is provided in request
    if (Array.isArray(templates)) {
      await prisma.messageTemplate.deleteMany({ where: { userId: session.user.id } });
      const validTemplates = templates.filter((t: { name: string; body: string }) => t.name && t.body);
      if (validTemplates.length > 0) {
        await prisma.messageTemplate.createMany({
          data: validTemplates.map((t: { name: string; body: string; category?: string }) => ({
            userId: session.user.id,
            name: t.name,
            body: t.body,
            category: (t.category as "initial_outreach" | "follow_up" | "thank_you" | "referral_request") || "initial_outreach",
          })),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
