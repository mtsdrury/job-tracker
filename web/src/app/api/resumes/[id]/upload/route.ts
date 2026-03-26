import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadResume, deleteResume } from "@/lib/supabase-storage";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get the resume to check ownership
    const resumeVersion = await prisma.resumeVersion.findUnique({
      where: { id: params.id },
      select: { userId: true, fileUrl: true },
    });

    if (!resumeVersion) {
      return NextResponse.json({ error: "Resume not found" }, { status: 404 });
    }

    if (resumeVersion.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Parse form data
    const formData = await req.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Upload file to Supabase Storage
    const uploadResult = await uploadResume(
      session.user.id,
      file,
      file.name
    );

    if (!uploadResult.success) {
      return NextResponse.json(
        { error: uploadResult.error },
        { status: 400 }
      );
    }

    // Delete old file from storage if it exists
    if (resumeVersion.fileUrl) {
      const deleteResult = await deleteResume(resumeVersion.fileUrl);
      if (!deleteResult.success) {
        console.warn("Failed to delete old file from storage:", deleteResult.error);
        // Continue anyway; old file will be orphaned
      }
    }

    // Update database with new file URL
    const updated = await prisma.resumeVersion.update({
      where: { id: params.id },
      data: { fileUrl: uploadResult.fileUrl },
      select: {
        id: true,
        name: true,
        fileUrl: true,
        keywords: true,
        isDefault: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    // Trigger keyword extraction in the background (don't wait for it)
    // This allows the upload to complete quickly while keywords are extracted asynchronously
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    fetch(`${baseUrl}/api/resumes/${params.id}/keywords`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${session.user.id}`,
      },
    }).catch((error) => {
      console.error("Failed to trigger keyword extraction:", error);
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Resume upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload resume" },
      { status: 500 }
    );
  }
}
