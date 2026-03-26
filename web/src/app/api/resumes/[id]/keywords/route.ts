import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { extractTextFromPdf, extractKeywords } from "@/lib/pdf-extract";

/**
 * POST /api/resumes/[id]/keywords
 * Triggers keyword extraction for a resume version
 * Downloads PDF from fileUrl, extracts text, identifies keywords
 * Saves keywords array to the ResumeVersion record
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;

    // Get the resume version to check ownership and fileUrl
    const resumeVersion = await prisma.resumeVersion.findUnique({
      where: { id },
      select: {
        id: true,
        userId: true,
        fileUrl: true,
        name: true,
      },
    });

    if (!resumeVersion) {
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 }
      );
    }

    if (resumeVersion.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (!resumeVersion.fileUrl) {
      return NextResponse.json(
        { error: "Resume file not uploaded" },
        { status: 400 }
      );
    }

    // Extract text from PDF
    let pdfText: string;
    try {
      pdfText = await extractTextFromPdf(resumeVersion.fileUrl);
    } catch (error) {
      console.error("PDF extraction failed:", error);
      // If PDF extraction fails, return empty keywords array
      pdfText = "";
    }

    // Extract keywords from the text
    const keywords = extractKeywords(pdfText);

    // Save keywords to database
    const updated = await prisma.resumeVersion.update({
      where: { id },
      data: {
        keywords: keywords,
      },
      select: {
        id: true,
        name: true,
        keywords: true,
      },
    });

    return NextResponse.json({
      success: true,
      resumeId: updated.id,
      resumeName: updated.name,
      keywords: updated.keywords || [],
      keywordCount: (updated.keywords || []).length,
    });
  } catch (error) {
    console.error("Failed to extract keywords:", error);
    return NextResponse.json(
      { error: "Failed to extract keywords" },
      { status: 500 }
    );
  }
}

/**
 * GET /api/resumes/[id]/keywords
 * Retrieve extracted keywords for a resume version
 */
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
        userId: true,
        name: true,
        keywords: true,
      },
    });

    if (!resumeVersion) {
      return NextResponse.json(
        { error: "Resume not found" },
        { status: 404 }
      );
    }

    if (resumeVersion.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    return NextResponse.json({
      resumeId: resumeVersion.id,
      resumeName: resumeVersion.name,
      keywords: resumeVersion.keywords || [],
      keywordCount: (resumeVersion.keywords || []).length,
    });
  } catch (error) {
    console.error("Failed to retrieve keywords:", error);
    return NextResponse.json(
      { error: "Failed to retrieve keywords" },
      { status: 500 }
    );
  }
}
