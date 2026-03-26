import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing signature" },
      { status: 400 }
    );
  }

  let event;

  try {
    // Webhook secret is required in production; missing secret is a configuration error
    if (!process.env.STRIPE_WEBHOOK_SECRET) {
      console.error("STRIPE_WEBHOOK_SECRET is not configured");
      return NextResponse.json(
        { error: "Webhook configuration error" },
        { status: 503 }
      );
    }

    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    console.error("Webhook signature verification failed:", error);
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;

      if (session.customer) {
        // Update user's billing status to pro
        await prisma.user.updateMany({
          where: { stripeCustomerId: session.customer as string },
          data: { billingStatus: "pro" },
        });
      }
    } else if (event.type === "customer.subscription.updated") {
      const subscription = event.data.object;

      if (subscription.customer) {
        // Check subscription status and update accordingly
        const status = subscription.status;
        const billingStatus = status === "active" ? "pro" : "free";

        await prisma.user.updateMany({
          where: { stripeCustomerId: subscription.customer as string },
          data: { billingStatus },
        });
      }
    } else if (event.type === "customer.subscription.deleted") {
      const subscription = event.data.object;

      if (subscription.customer) {
        // Subscription was cancelled, revert to free
        await prisma.user.updateMany({
          where: { stripeCustomerId: subscription.customer as string },
          data: { billingStatus: "free" },
        });
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
