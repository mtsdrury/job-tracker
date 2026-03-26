import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({
    monthly: process.env.STRIPE_PRICE_MONTHLY || "",
    quarterly: process.env.STRIPE_PRICE_QUARTERLY || "",
    semiannual: process.env.STRIPE_PRICE_SEMIANNUAL || "",
  });
}
