import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    monthly: process.env.STRIPE_PRICE_MONTHLY || "",
    quarterly: process.env.STRIPE_PRICE_QUARTERLY || "",
    semiannual: process.env.STRIPE_PRICE_SEMIANNUAL || "",
  });
}
