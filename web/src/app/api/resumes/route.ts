import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const resumeVersions = await prisma.resumeVersion.findMany({
      where: { userId: session.user.id },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        keywords: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json(resumeVersions);
  } catch (error) {
    console.error("Failed to fetch resume versions:", error);
    return NextResponse.json(
      { error: "Failed to fetch resume versions" },
      { status: 500 }
    );
  }
}
