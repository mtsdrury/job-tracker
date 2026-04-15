import Stripe from "stripe";

// Lazy-initialized Stripe client. Constructing `new Stripe("")` at module load
// breaks Next.js page-data collection on Vercel when STRIPE_SECRET_KEY is
// missing, because the Stripe SDK throws during construction. The Proxy
// defers construction until the first property access (i.e. actual request
// handling), so importing this module at build time is always safe.
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY is not set. Configure it in your environment to use Stripe."
    );
  }
  _stripe = new Stripe(key, {
    apiVersion: "2025-02-24.acacia",
  });
  return _stripe;
}

export const stripe = new Proxy({} as Stripe, {
  get(_target, prop, receiver) {
    return Reflect.get(getStripe(), prop, receiver);
  },
});
