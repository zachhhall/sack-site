import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

// ─────────────────────────────────────────────────────────────────────────────
// PASTE YOUR STRIPE PRICE IDs HERE
// Get them from: Stripe Dashboard → Products → (click product) → copy "Price ID"
// They look like: price_1ABC123defGHI456jkl789
// ─────────────────────────────────────────────────────────────────────────────
const PRICE_IDS = {
  // ── Dirtbag series ──────────────────────────────────────────────────────
  'db-01': 'price_REPLACE_BLAZE',       // The Blaze   — $11.99
  'db-02': 'price_REPLACE_SLIMEWAVE',   // Slime Wave  — $12.99
  'db-03': 'price_REPLACE_ACIDBURN',    // Acid Burn   — $10.99

  // ── Main catalog ────────────────────────────────────────────────────────
  'sack-01': 'price_REPLACE_SOLARFLARE',      // Solar Flare      — $13.99
  'sack-02': 'price_REPLACE_GOBLINMODE',      // Goblin Mode      — $22.99
  'sack-03': 'price_REPLACE_HOTHONEY',        // Hot Honey        — $14.99
  'sack-04': 'price_REPLACE_CRAYONBOX',       // Crayon Box       — $15.99
  'sack-05': 'price_REPLACE_CUBANLINX',       // Cuban Linx       — $19.99
  'sack-06': 'price_REPLACE_SUNSETCRASH',     // Sunset Crash     — $16.99
  'sack-07': 'price_REPLACE_PRIDECLASSIC',    // Pride Classic    — $14.99
  'sack-08': 'price_REPLACE_TILEGLITCH',      // Tile Glitch      — $18.99
  'sack-09': 'price_REPLACE_LAGOON',          // Lagoon           — $15.99
  'sack-10': 'price_REPLACE_WATERMELONSUGAR', // Watermelon Sugar — $14.99
  'sack-11': 'price_REPLACE_REGGAERIOT',      // Reggae Riot      — $17.99
  'sack-12': 'price_REPLACE_GRAPESODA',       // Grape Soda       — $13.99
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { cart } = req.body;

  if (!cart || !Array.isArray(cart) || cart.length === 0) {
    return res.status(400).json({ error: 'Cart is empty' });
  }

  // Validate every item has a known price ID
  for (const item of cart) {
    if (!PRICE_IDS[item.id]) {
      return res.status(400).json({ error: `Unknown product: ${item.id}` });
    }
  }

  const line_items = cart.map(item => ({
    price: PRICE_IDS[item.id],
    quantity: item.qty,
  }));

  const session = await stripe.checkout.sessions.create({
    mode: 'payment',
    line_items,
    success_url: `${req.headers.origin}/?order=success`,
    cancel_url:  `${req.headers.origin}/?order=cancelled`,
    automatic_tax: { enabled: true },
    shipping_address_collection: { allowed_countries: ['US', 'CA'] },
  });

  res.status(200).json({ url: session.url });
}
