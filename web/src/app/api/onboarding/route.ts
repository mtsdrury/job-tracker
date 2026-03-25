import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { schools, resumeVersions, strategy, templates, targetRoles, experienceLevel } = await req.json();

    // Update user config, strategy, and profile fields
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        strategyMode: strategy || "referral_first",
        targetRoles: targetRoles || [],
        experienceLevel: experienceLevel || null,
        config: {
          schools: schools || [],
          connections: (schools || []).map(
            (s: { name: string; status: string }) => ({
              label: s.name,
              line: `I am ${s.status === "Student" ? "a student" : "an alum"} at ${s.name}`,
            })
          ),
          onboarding_completed: true,
        },
      },
    });

    // Create resume versions
    if (resumeVersions && resumeVersions.length > 0) {
      await prisma.resumeVersion.createMany({
        data: resumeVersions.map((name: string, i: number) => ({
          userId: session.user.id,
          name,
          isDefault: i === 0,
        })),
      });
    }

    // Create message templates
    if (templates && templates.length > 0) {
      await prisma.messageTemplate.createMany({
        data: templates
          .filter((t: { name: string; body: string }) => t.name && t.body)
          .map(
            (t: { name: string; body: string; category?: string }) => ({
              userId: session.user.id,
              name: t.name,
              body: t.body,
              category: t.category || "initial_outreach",
            })
          ),
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Onboarding error:", err);
    return NextResponse.json(
      { error: "Something went wrong" },
      { status: 500 }
    );
  }
}
