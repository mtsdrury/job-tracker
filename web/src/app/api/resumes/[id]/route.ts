import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { deleteResume } from "@/lib/supabase-storage";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    const resumeVersion = await prisma.resumeVersion.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        keywords: true,
        isDefault: true,
        experienceLevel: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!resumeVersion) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    // Verify ownership
    const owns = await prisma.resumeVersion.count({
      where: { id, userId: session.user.id },
    });

    if (!owns) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json(resumeVersion);
  } catch (error) {
    console.error("Failed to fetch resume version:", error);
    return NextResponse.json(
      { error: "Failed to fetch resume version" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Get the resume to check ownership and get fileUrl
    const resumeVersion = await prisma.resumeVersion.findUnique({
      where: { id },
      select: { userId: true, fileUrl: true },
    });

    if (!resumeVersion) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    if (resumeVersion.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Delete file from Supabase Storage if it exists
    if (resumeVersion.fileUrl) {
      const deleteResult = await deleteResume(resumeVersion.fileUrl);
      if (!deleteResult.success) {
        console.warn(
          "Failed to delete file from storage:",
          deleteResult.error
        );
        // Continue with database deletion even if storage deletion fails
      }
    }

    // Delete from database
    await prisma.resumeVersion.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete resume version:", error);
    return NextResponse.json(
      { error: "Failed to delete resume version" },
      { status: 500 }
    );
  }
}
