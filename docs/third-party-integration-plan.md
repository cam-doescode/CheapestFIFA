# Third-Party Ticket Platform Integration Plan

## Overview
Add StubHub and SeatGeek price feeds + affiliate monetization to complement FIFA Collect data.

## Priority 1: SeatGeek API (Instant Access)

- **Sign up**: seatgeek.com/build — instant `client_id`, no approval needed
- **Endpoint**: `GET https://api.seatgeek.com/2/events?client_id=XXX&q=FIFA World Cup 2026&per_page=200`
- **Returns**: events with `stats.lowest_price`, `stats.listing_count`, venue, datetime
- **Cache**: 15-min ISR via `next: { revalidate: 900 }`
- **Affiliate**: Join via Impact.com (2-7 day approval), commission 1-10%
- **Affiliate link**: append `?aid=AFFILIATE_ID` to SeatGeek URLs

## Priority 2: Sovrn Commerce (Instant Link Monetization)

- **What**: JS snippet that auto-converts outbound links to affiliate links
- **Supports**: StubHub (9% commission) and SeatGeek
- **Setup**: Add `<script>` tag to layout — zero code changes to existing links
- **Signup**: sovrn.com/commerce — same-day access
- **Revenue model**: Revenue share (Sovrn takes a cut of commissions)

## Priority 3: StubHub API (Requires Approval)

- **Apply**: Email `api.support@stubhub.com` with use case
- **Auth**: OAuth2 (client credentials flow for public data)
- **Endpoint**: `GET /catalog/events/search?groupingId=45410&rows=200`
- **Timeline**: 1-2 weeks for approval
- **Affiliate**: Partnerize (instant signup at partnerize.com) — 9% commission, 30-day cookie
- **Docs**: developer.stubhub.com

## Implementation Architecture

### New files needed:
- `src/lib/third-party-api.ts` — server-side fetch for SeatGeek + StubHub
- `src/lib/match-resolver.ts` — maps third-party events to our 104 matches by date+venue
- `.env.local` — API keys + feature flags

### Env vars:
```env
SEATGEEK_CLIENT_ID=
STUBHUB_APP_TOKEN=
ENABLE_SEATGEEK=false
ENABLE_STUBHUB=false
NEXT_PUBLIC_SEATGEEK_AID=
NEXT_PUBLIC_STUBHUB_AFFILIATE_ID=
```

### Type additions (`src/lib/types.ts`):
```ts
interface ThirdPartyPrice {
  platform: "stubhub" | "seatgeek";
  matchNo: number;
  minPrice: number;
  url: string;
  listingCount?: number;
  lastUpdated: string;
}
```
Add `thirdPartyPrices: ThirdPartyPrice[]` to `MatchWithPrices`.

### Event matching strategy (`match-resolver.ts`):
1. Date + venue name match (handles 95%+ of cases)
2. Team names in title + date (backup)
3. Silently drops unresolved events

### UI changes (`MatchCard.tsx`):
- "Also available on" section below PriceTable with platform pills
- Smart CTA: shows cheapest platform (FIFA Collect vs StubHub vs SeatGeek)
- CSP update in `next.config.ts`: add `api.seatgeek.com` and `api.stubhub.com` to `connect-src`

### Feature flags:
All third-party features gated behind `ENABLE_SEATGEEK` / `ENABLE_STUBHUB` env vars.
Site works identically to today when flags are off.

## Action Items
1. Sign up for SeatGeek API at seatgeek.com/build
2. Email api.support@stubhub.com for StubHub API access
3. Sign up for StubHub affiliate at stubhub.com/affiliates (Partnerize)
4. Sign up for SeatGeek affiliate at Impact.com
5. Consider adding Sovrn Commerce snippet for instant monetization
6. Build on feature branch `feat/third-party-prices`
