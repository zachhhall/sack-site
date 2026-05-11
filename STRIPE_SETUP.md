# Stripe Setup — SACK.

This site uses a Stripe **server-side checkout** via a Vercel serverless function. No backend server to manage — Vercel runs it for free.

## What you're deploying

```
sack-site/
├── index.html                          ← the storefront
├── success.html                        ← post-checkout thank-you page
├── images/                             ← 12 SVG sack illustrations
├── api/
│   └── create-checkout-session.js      ← the serverless function
├── package.json                        ← declares Stripe dependency
└── .gitignore
```

When deployed, Vercel automatically turns `api/create-checkout-session.js` into the endpoint `/api/create-checkout-session`. The front-end calls it, it creates a Stripe Checkout Session, and your customer is redirected to Stripe's hosted payment page.

---

## Step-by-step deploy (~10 minutes)

### 1. Create your Stripe account

Sign up at https://stripe.com.

In the dashboard, grab your **secret key** from **Developers → API Keys**. It starts with `sk_test_...` (use this for testing) or `sk_live_...` (use this for real payments).

> ⚠️ **Never** put the secret key in `index.html` or commit it to GitHub. It only goes in Vercel's environment variables (next steps).

### 2. Put the code on GitHub

```bash
cd sack-site
git init
git add .
git commit -m "initial sack site"
```

Then create a new repo on https://github.com/new and follow GitHub's instructions to push your code. Or use GitHub Desktop if you prefer a UI.

### 3. Deploy to Vercel

1. Sign up at https://vercel.com (free tier is fine — login with GitHub for fastest setup)
2. Click **"Add New → Project"**
3. Import your `sack-site` GitHub repo
4. Before clicking Deploy, expand **"Environment Variables"** and add:
   - **Name:** `STRIPE_SECRET_KEY`
   - **Value:** your `sk_test_...` key from Step 1
5. Click **Deploy**

That's it. In ~30 seconds you'll have a live URL like `sack-site-abc123.vercel.app`.

### 4. Test the checkout

Open your deployed site, add a sack to the cart, hit checkout. You'll be redirected to Stripe's checkout page.

Use Stripe's test card to complete a fake purchase:
- **Card number:** `4242 4242 4242 4242`
- **Expiry:** any future date (e.g. `12/30`)
- **CVC:** any 3 digits (e.g. `123`)
- **ZIP:** any 5 digits (e.g. `12345`)

You should be redirected back to `/success.html` after payment.

### 5. Go live

When you're ready to accept real payments:
1. In Stripe dashboard, toggle from **Test mode** to **Live mode** (top right)
2. Grab your live secret key (`sk_live_...`)
3. In Vercel: **Settings → Environment Variables**, update `STRIPE_SECRET_KEY` to the live key
4. Redeploy (Vercel does this automatically when you update env vars)

---

## Optional: Use Stripe Price IDs instead of hardcoded prices

Right now prices are defined in the code (in `api/create-checkout-session.js`). This is fine to start, but if you want to **edit prices in the Stripe dashboard without redeploying code**, do this:

### 1. Create Products in Stripe

In Stripe dashboard → **Products → + Add product**:

| SKU | Name | Price |
|-----|------|-------|
| SACK-01 | Solar Flare | $13.99 |
| SACK-02 | Goblin Mode | $22.99 |
| SACK-03 | Hot Honey | $14.99 |
| SACK-04 | Crayon Box | $15.99 |
| SACK-05 | Cuban Linx | $19.99 |
| SACK-06 | Sunset Crash | $16.99 |
| SACK-07 | Pride Classic | $14.99 |
| SACK-08 | Tile Glitch | $18.99 |
| SACK-09 | Lagoon | $15.99 |
| SACK-10 | Watermelon Sugar | $14.99 |
| SACK-11 | Reggae Riot | $17.99 |
| SACK-12 | Grape Soda | $13.99 |

For each one, copy the **Price ID** (looks like `price_1Q...`).

### 2. Update the code

In `api/create-checkout-session.js`:

1. Replace each `price_REPLACE_ME` in the `PRODUCTS` object with the matching Price ID
2. Find this block:
   ```js
   // OPTION A — use the Stripe Price ID (recommended for production)
   // lineItems.push({ price: product.priceId, quantity: qty });
   ```
   Uncomment that line.
3. Find the next block (Option B) and **delete** the whole `lineItems.push({ price_data: ... })` call.

Commit, push, Vercel auto-redeploys. Now you can change any price in Stripe and it takes effect immediately.

---

## Optional: Enable sales tax

Stripe Tax handles US sales tax automatically.

1. In Stripe dashboard → **Settings → Tax**, enable Stripe Tax
2. In `api/create-checkout-session.js`, uncomment this line:
   ```js
   // automatic_tax: { enabled: true },
   ```
3. Make sure each Product in Stripe has a tax code assigned (Stripe will prompt you)

---

## Local development (optional)

If you want to test the serverless function on your own computer before deploying:

```bash
npm install -g vercel
cd sack-site
npm install
vercel dev
```

Then add a `.env.local` file (don't commit this!) with:
```
STRIPE_SECRET_KEY=sk_test_yourKeyHere
```

Open http://localhost:3000 and the function will run locally.

---

## Troubleshooting

**"Could not start checkout. Server returned 500"**
→ Check Vercel logs (Vercel dashboard → your project → Deployments → click latest → Functions tab). Most common cause: `STRIPE_SECRET_KEY` env var is missing or has a typo.

**Images not loading**
→ Open the site through your Vercel URL or a local server (`python3 -m http.server`). Browsers block local file paths for security.

**Checkout works in test mode but not live mode**
→ Double-check you swapped the env var to `sk_live_...` AND redeployed. Test keys won't work with live mode and vice versa.
