# Affiliate Compliance Plan

Last reviewed: 2026-04-21

This document defines the Phase 0 compliance envelope for Market360 before building marketplace ingestion at scale. Treat this as an internal engineering control, not legal advice. Re-check the linked program documents before production launch and whenever Flipkart updates their affiliate terms.

## Phase 0 Goal

Confirm which data sources Market360 may use, how long content can be stored, what disclosures are required, and which marketplace rules affect product, price, image, review, and redirect behavior.

## Account Readiness Checklist

- [ ] Create or reactivate Flipkart Affiliate account.
- [ ] Store Flipkart Affiliate Tracking ID and API Token in backend environment variables.
- [ ] Confirm Flipkart API access by calling the feed listing endpoint in a non-production script.
- [ ] Add sitewide affiliate disclosure in the frontend footer and product detail pages.
- [ ] Add timestamp/disclaimer display where price or availability can become stale.
- [ ] Configure sync jobs so product advertising content refreshes before cache expiry.

## Compliance Matrix

| Source | Content source | Price allowed | Image handling | Cache rules | Disclaimer | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Flipkart | Flipkart Affiliate APIs: Product Feed Listing, Product Feed, Delta Feed, Search, Product ID lookup, Offer APIs, and feed downloads. | Allowed via Affiliate API/feed fields for registered affiliates. Use delta feeds for changes and avoid stale pricing. | Use feed/API image URLs. Avoid copying images into Market360 storage unless Flipkart terms explicitly allow it. | Product Feed API URLs are valid for 10 hours. API result pagination is 500 items per batch. Refresh via full feed plus delta feed. | Required affiliate disclosure. Add price/availability freshness text on product pages and deal cards. | API requires `Fk-Affiliate-Id` and `Fk-Affiliate-Token` headers. Flipkart FAQ states affiliate API rate limit is 20 calls/sec per affiliate. Feed download files may require manually appending `affid` to product URLs. |
| Manual/community deals | User-submitted product details and URLs, admin reviewed. | Allowed only if user-provided or independently verified. Do not copy protected marketplace price/review/image content from pages. | User-uploaded images only if uploader has rights, or use generic placeholders. | No marketplace cache limit unless content came from marketplace API/feed. Still expire old prices/deals operationally. | General affiliate disclosure if redirect monetizes the link. | Keep manual deals in `source: "manual"` and require admin review before public display. |

## Source-Specific Engineering Rules

### Flipkart

- Prefer Product Feed Listing API for category discovery.
- Use Product Feed API for initial category ingestion.
- Use Delta Feed API for periodic updates and deletion detection.
- Use Offer APIs for offer/deal-specific pages.
- Respect the documented 20 calls/sec per affiliate limit.
- Treat feed URLs as temporary because Flipkart documents 10-hour validity.
- Persist `productId`, affiliate URL, price fields, availability, category path, and feed version.
- When using feed downloads, ensure product URLs include the affiliate tracking parameter if the feed requires manual `affid` appending.

### Manual Deals

- Manual submission remains useful for community discovery, but it must not become a disguised scraper path.
- Require user authentication and admin approval.
- Store uploaded images through Cloudinary only for manual submissions.
- If a manual deal points to Flipkart, convert it to official affiliate linking before approval when possible.

## Required App Changes From Phase 0

- Add `source`, `sourceProductId`, `affiliateUrl`, `canonicalSourceUrl`, `lastSyncedAt`, `priceVerifiedAt`, `contentExpiresAt`, and `complianceFlags` to product records.
- Split persistent products from time-sensitive deals.
- Store price snapshots in a separate price history collection.
- Route all outbound monetized clicks through `/api/redirect/go/:dealId` for click tracking.
- Add visible disclosure copy:
  - Footer/sitewide: `Market360 may earn a commission when you buy through affiliate links.`
  - Price areas: `Price and availability were last checked at <timestamp> and may change on the seller site.`
- Add sync health monitoring for stale content:
  - Flipkart stale if no feed/delta sync in the expected schedule window.

## Environment Variables To Add Later

```env
FLIPKART_AFFILIATE_ID=
FLIPKART_AFFILIATE_TOKEN=
```

Do not commit real affiliate credentials.

## Open Questions Before Production

- Does Flipkart account currently expose API tokens, or only downloadable feeds?
- What exact site/app properties are approved for each affiliate account?
- Are mobile app deep links needed for Flipkart app attribution?

## Sources Reviewed

- Flipkart Affiliate API overview: https://affiliate.flipkart.com/api-docs/af_overview.html
- Flipkart Product API reference: https://affiliate.flipkart.com/api-docs/af_prod_ref.html
- Flipkart Affiliate API FAQ: https://affiliate.flipkart.com/api-docs/af_faq.html
- Flipkart commission page: https://affiliate.flipkart.com/commissions
