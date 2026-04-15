import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { TemplateCategory } from "@/generated/prisma/enums";

const VALID_CATEGORIES = new Set<string>([
  TemplateCategory.initial_outreach,
  TemplateCategory.follow_up,
  TemplateCategory.thank_you,
  TemplateCategory.referral_request,
]);

function toCategory(value: string | undefined): TemplateCategory {
  return value && VALID_CATEGORIES.has(value)
    ? (value as TemplateCategory)
    : TemplateCategory.initial_outreach;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { schools, resumeVersions, strategy, templates, targetRoles } = await req.json();

    // Update user config, strategy, and profile fields
    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        strategyMode: strategy || "referral_first",
        targetRoles: targetRoles || [],
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

    // Upsert resume versions (handles re-running onboarding gracefully)
    if (resumeVersions && resumeVersions.length > 0) {
      for (let i = 0; i < resumeVersions.length; i++) {
        const rv = resumeVersions[i] as { name: string; experienceLevel?: string };
        await prisma.resumeVersion.upsert({
          where: {
            userId_name: { userId: session.user.id, name: rv.name },
          },
          update: {
            experienceLevel: rv.experienceLevel || null,
            isDefault: i === 0,
          },
          create: {
            userId: session.user.id,
            name: rv.name,
            experienceLevel: rv.experienceLevel || null,
            isDefault: i === 0,
          },
        });
      }
    }

    // Upsert message templates (handles re-running onboarding gracefully)
    if (templates && templates.length > 0) {
      for (const t of templates.filter((t: { name: string; body: string }) => t.name && t.body)) {
        const tmpl = t as { name: string; body: string; category?: string };
        await prisma.messageTemplate.upsert({
          where: {
            userId_name: { userId: session.user.id, name: tmpl.name },
          },
          update: {
            body: tmpl.body,
            category: toCategory(tmpl.category),
          },
          create: {
            userId: session.user.id,
            name: tmpl.name,
            body: tmpl.body,
            category: toCategory(tmpl.category),
          },
        });
      }
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
