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
      resumeVersions: { select: { id: true, name: true, isDefault: true }, orderBy: { createdAt: "asc" } },
      messageTemplates: { select: { id: true, name: true, body: true, category: true }, orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json(user);
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
      experienceLevel
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

    // Sync resume versions: delete all and recreate
    if (resumeVersions) {
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

    // Sync templates
    if (templates) {
      await prisma.messageTemplate.deleteMany({ where: { userId: session.user.id } });
      const validTemplates = templates.filter((t: { name: string; body: string }) => t.name && t.body);
      if (validTemplates.length > 0) {
        await prisma.messageTemplate.createMany({
          data: validTemplates.map((t: { name: string; body: string; category?: string }) => ({
            userId: session.user.id,
            name: t.name,
            body: t.body,
            category: t.category || "initial_outreach",
          })),
        });
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
