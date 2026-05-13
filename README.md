# Market360

Market360 is an affiliate-led deals discovery platform for Indian shoppers. It ingests marketplace product data, normalizes it into one catalog, qualifies meaningful deals, tracks affiliate redirects, and exposes a polished deals frontend with admin operations, SEO pages, and user alerts.

## What It Does

- Ingests deal/product data from marketplace source adapters.
- Normalizes Flipkart and manual deals into one internal product shape.
- Separates persistent products from time-sensitive deal events.
- Scores deals by discount, rating, review volume, commission potential, click trend, and freshness.
- Hides stale, duplicate, low-quality, out-of-stock, or suspicious deals.
- Routes outbound clicks through tracked affiliate redirects.
- Provides SEO landing pages, sitemap, schema markup, and content pages.
- Includes an operator/admin console for sync health, hidden deals, stale deals, blacklists, category overrides, and analytics.
- Supports user wishlists, saved categories, price-drop alerts, discount-threshold alerts, and daily best-deals notification events.

## Tech Stack

- Frontend: React, React Router, Axios, CSS Modules
- Backend: Node.js, Express, MongoDB, Mongoose
- Auth: JWT cookies, CSRF protection
- Jobs: node-cron
- Media: Cloudinary for manual deal images

## Project Structure

```text
Market360/
  Backend/
    config/
    controllers/
    middleware/
    models/
    routes/
    services/
    utils/
    server.js
  Frontend/
    public/
    src/
      components/
      context/
      services/
      utils/
  docs/
    affiliate-compliance.md
```

## Key Backend Domains

- `products`: canonical product identity and current normalized snapshot
- `deals`: active and historical promotions
- `price_histories`: time-series price snapshots
- `source_sync_logs`: ingestion and scheduler run tracking
- `click_events`: affiliate click analytics
- `price_alerts`: user price/drop and discount alerts
- `alert_events`: generated user notification events
- `admin_rules`: brand blacklists, product blacklists, category overrides

## Main Features

### Marketplace Connectors

Connectors live in:

```text
Backend/services/connectors/
```

Current adapters:

- Flipkart connector

They return normalized internal products and keep source-specific rules contained.

### Normalization Layer

Located at:

```text
Backend/services/normalization/productNormalizer.js
```

It standardizes:

- title cleanup
- brand extraction
- price parsing
- category mapping
- rating normalization
- image normalization
- slug generation

Canonical categories include:

- `electronics`
- `mobiles-accessories`
- `computers`
- `audio`
- `kitchen-appliances`
- `home-living`
- `fashion`
- `beauty-personal-care`
- `toys-books`
- `fitness-sports`
- `automotive`

### Deal Qualification

Located at:

```text
Backend/services/deals/dealEngine.js
```

Deals must pass checks for discount, price floor, stock, title quality, category, image, review volume, rating, freshness, valid affiliate URL, and duplicate detection.

### Affiliate Redirects

Outbound links use:

```text
GET /go/:dealId
```

The redirect flow:

1. Fetch deal.
2. Validate active/qualified status.
3. Log click event.
4. Attach source/category/device/placement metadata.
5. Increment counters.
6. Redirect to affiliate URL.

### Scheduler

Scheduler is opt-in:

```env
ENABLE_SCHEDULER=true
```

Jobs include:

- refresh top active deals
- validate homepage items
- expire stale deals
- category delta sync
- full sync target categories
- rebuild rankings
- generate today’s best deals
- archive expired deals
- evaluate user alerts
- generate daily best-deals notification events

## Frontend Pages

Core routes:

- `/`
- `/products`
- `/products/:id`
- `/wishlist`
- `/profile`
- `/admin`

SEO/content routes:

- `/deals/electronics`
- `/deals/kitchen-appliances`
- `/deals/under-1000`
- `/store/flipkart`
- `/best-deals-today`
- `/price-drop-alerts`
- `/content/best-bluetooth-headphones-under-2000`
- `/content/best-air-fryers-on-discount-this-week`
- `/content/top-laptop-deals-today-in-india`

## Local Setup

### 1. Backend Environment

From the backend folder:

```powershell
cd Backend
Copy-Item .env.example .env
```

Edit `Backend/.env` and set at least:

```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb://127.0.0.1:27017/market360
JWT_SECRET=your-generated-jwt-secret
CSRF_SECRET=your-generated-csrf-secret
FRONTEND_ORIGINS=http://localhost:3000
COOKIE_SECURE=false
COOKIE_SAMESITE=lax
ENABLE_SCHEDULER=false
```

Generate secrets:

```powershell
node utils\generateSecrets.js
```

### 2. Frontend Environment

From the frontend folder:

```powershell
cd Frontend
Copy-Item .env.example .env
```

Set:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

### 3. Install Dependencies

Backend:

```powershell
cd Backend
npm install
```

Frontend:

```powershell
cd Frontend
npm install
```

### 4. Run Locally

Start backend:

```powershell
cd Backend
node server.js
```

Start frontend:

```powershell
cd Frontend
npm start
```

Visit:

```text
http://localhost:3000
```

## Useful Scripts

Backend:

```powershell
npm run dev
npm start
node utils\generateSecrets.js
```

Frontend:

```powershell
npm start
npm run build
```

## Compliance Notes

Read:

```text
docs/affiliate-compliance.md
```

Important principles:

- Use official affiliate/API/feed content where allowed.
- Keep price and availability freshness visible.
- Use affiliate disclosure text.
- Route monetized clicks through tracked redirect URLs.
- Avoid storing marketplace images outside allowed rules.

## Current Limitations

- Live Flipkart API calls require real affiliate credentials.
- Daily email generation currently creates pending alert events; an actual email provider is not wired yet.
- Scheduler is disabled by default.
- SEO is implemented in the current React/Express architecture; server-side rendering or Next.js migration can improve crawlability later.

## Suggested Next Steps

1. Add real affiliate credentials.
2. Seed sample products/deals for local demos.
3. Wire an email provider for daily best-deals alerts.
4. Add dashboard charts for admin analytics.
5. Add tests around normalization, deal qualification, and redirect logging.
6. Consider Next.js migration for production SEO.
