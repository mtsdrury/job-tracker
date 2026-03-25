import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// DELETE /api/account/delete - Delete user account and all associated data
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const userId = session.user.id;

    // Use a transaction to ensure all related data is deleted in the correct order
    await prisma.$transaction(async (tx) => {
      // Delete outreach events first (references contacts and jobs)
      await tx.outreachEvent.deleteMany({
        where: { userId },
      });

      // Delete contacts
      await tx.contact.deleteMany({
        where: { userId },
      });

      // Delete jobs
      await tx.job.deleteMany({
        where: { userId },
      });

      // Delete resume versions
      await tx.resumeVersion.deleteMany({
        where: { userId },
      });

      // Delete message templates
      await tx.messageTemplate.deleteMany({
        where: { userId },
      });

      // Delete accounts (OAuth)
      await tx.account.deleteMany({
        where: { userId },
      });

      // Delete sessions
      await tx.session.deleteMany({
        where: { userId },
      });

      // Finally, delete the user
      await tx.user.delete({
        where: { id: userId },
      });
    });

    return NextResponse.json({
      success: true,
      message: "Account and all associated data have been permanently deleted",
    });
  } catch (error) {
    console.error("Account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account. Please try again." },
      { status: 500 }
    );
  }
}
