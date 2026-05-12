// api/create-checkout-session.js
// Vercel serverless function that creates a Stripe Checkout Session.
//
// Deploys automatically to https://your-site.vercel.app/api/create-checkout-session
//
// Environment variables required (set these in Vercel dashboard):
//   STRIPE_SECRET_KEY     — your Stripe secret key (sk_test_... or sk_live_...)

import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// Server-side source of truth for product info. The client only sends
// product IDs + quantities — never prices — to prevent price tampering.
const PRODUCTS = {
  'sack-01': { name: 'Solar Flare',      price: 1399, priceId: 'price_REPLACE_ME' },
  'sack-02': { name: 'Goblin Mode',      price: 2299, priceId: 'price_REPLACE_ME' },
  'sack-03': { name: 'Hot Honey',        price: 1499, priceId: 'price_REPLACE_ME' },
  'sack-04': { name: 'Crayon Box',       price: 1599, priceId: 'price_REPLACE_ME' },
  'sack-05': { name: 'Cuban Linx',       price: 1999, priceId: 'price_REPLACE_ME' },
  'sack-06': { name: 'Sunset Crash',     price: 1699, priceId: 'price_1TVjHBQngPa8tz1GvQ2VBDIy' },
  'sack-07': { name: 'Pride Classic',    price: 1499, priceId: 'price_1TVjHeQngPa8tz1GtEsuP7mD' },
  'sack-08': { name: 'Tile Glitch',      price: 1899, priceId: 'price_1TVjI5QngPa8tz1GGRpC2dk4' },
  'sack-09': { name: 'Lagoon',           price: 1599, priceId: 'price_1TVjIRQngPa8tz1GgbhtlgQn' },
  'sack-10': { name: 'Watermelon Sugar', price: 1499, priceId: 'price_1TVjIzQngPa8tz1GbZbo9u3Z' },
  'sack-11': { name: 'Reggae Riot',      price: 1799, priceId: 'price_1TVjJJQngPa8tz1GgSvEojCF' },
  'sack-12': { name: 'Grape Soda',       price: 1399, priceId: 'price_1TVjJbQngPa8tz1G1Fi5GHAH' },
  'db-01': { name: 'The Blaze', price: 1199, priceId: 'price_1TW3YKQngPa8tz1GkO0HEezP' },
  'db-02': { name: 'Slime Wave', price: 1299, priceId: 'price_1TW3xUQngPa8tz1GAJrlj9xN' },
  'db-03': { name: 'Acid Burn', price: 1099, priceId: 'price_1TW3b1QngPa8tz1Gf5P5wbUV' },
};

// Shipping config — match what's set in your Stripe Dashboard if you want
// Stripe to handle it instead. For now we add shipping as a line item.
const SHIPPING_THRESHOLD_CENTS = 4000;  // $40
const SHIPPING_COST_CENTS = 499;        // $4.99

export default async function handler(req, res) {
  // CORS — allows your site to call this endpoint
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { cart } = req.body;

    if (!Array.isArray(cart) || cart.length === 0) {
      return res.status(400).json({ error: 'Cart is empty' });
    }

    // Build line items from cart, validating each product exists.
    // Use Stripe Price IDs (recommended) — they let you edit prices in
    // the Stripe dashboard without redeploying.
    const lineItems = [];
    let subtotalCents = 0;

    for (const item of cart) {
      const product = PRODUCTS[item.id];
      if (!product) {
        return res.status(400).json({ error: `Unknown product: ${item.id}` });
      }
      const qty = Math.max(1, Math.min(99, parseInt(item.qty, 10) || 1));

      // OPTION A — use the Stripe Price ID (recommended for production)
      // Uncomment this once you've replaced the price_REPLACE_ME values above:
      //
      // lineItems.push({ price: product.priceId, quantity: qty });

      // OPTION B — inline price_data (works without setting up Prices in Stripe first)
      // Easier for getting started. Leave this active until you switch to Option A.
      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: { name: product.name },
          unit_amount: product.price,  // in cents
        },
        quantity: qty,
      });

      subtotalCents += product.price * qty;
    }

    // Determine the protocol + host for success/cancel URLs.
    // Vercel sets these headers automatically.
    const proto = req.headers['x-forwarded-proto'] || 'https';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = `${proto}://${host}`;

    // Build shipping options. Free over $40, otherwise $4.99 flat.
    const shippingOptions = subtotalCents >= SHIPPING_THRESHOLD_CENTS
      ? [{
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: 0, currency: 'usd' },
            display_name: 'Free shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        }]
      : [{
          shipping_rate_data: {
            type: 'fixed_amount',
            fixed_amount: { amount: SHIPPING_COST_CENTS, currency: 'usd' },
            display_name: 'Standard shipping',
            delivery_estimate: {
              minimum: { unit: 'business_day', value: 5 },
              maximum: { unit: 'business_day', value: 7 },
            },
          },
        }];

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: lineItems,
      success_url: `${origin}/success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      shipping_address_collection: {
        allowed_countries: ['US', 'CA', 'GB', 'AU'],
      },
      shipping_options: shippingOptions,
      // Optional: enable automatic tax once you've configured Stripe Tax
      // automatic_tax: { enabled: true },
      // Optional: collect customer phone numbers
      phone_number_collection: { enabled: true },
      // Optional: allow promo codes
      allow_promotion_codes: true,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('Stripe error:', err);
    return res.status(500).json({
      error: err.message || 'Could not create checkout session',
    });
  }
}
