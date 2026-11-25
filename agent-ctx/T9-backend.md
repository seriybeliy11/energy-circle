# T9 — Backend layer: Prisma schema + heist claim/history API routes

Agent: T9 backend implementation
Date: 2026-11-24
Project: HQD MIAMI CHASE - HEIST LOOTBOX (`/home/z/my-project`, Next.js 16 + TS strict)

## Scope (exactly 3 files touched, nothing else)

1. `prisma/schema.prisma` — removed unused `User` / `Post` models, added `ClaimRecord`
   (fields: id, prizeId, prizeTitle, valueRub, category, partnerName, deliveryType,
   promoCode?, phone?, claimId, status default "ISSUED", createdAt).
   Ran `bun run db:push` — success, Prisma Client regenerated.
2. `src/app/api/heist/claim/route.ts` — NEW. `POST` handler, `export const dynamic = 'force-dynamic'`.
3. `src/app/api/heist/history/route.ts` — NEW. `GET` handler, `export const dynamic = 'force-dynamic'`.

## Design notes for downstream agents

- Reuses shared pure helpers from `src/api/mockData.ts` (`getPrizeById`, `generatePromoCode`,
  `buildClaimInstructions`) and types from `src/api/types.ts` (`ClaimRequest`, `ClaimResult`,
  `ClaimHistoryEntry`). No types were duplicated.
- Request body is parsed as `unknown` and narrowed via type guards (`isRecord`, `isDeliveryType`)
  into `Partial<ClaimRequest>` — strict TS, no `any`, no casts of unchecked data.
- All claim branching (promo code vs deep link vs SBP) is driven by the authoritative
  `prize.deliveryType` from the catalog, not the client-sent `deliveryType` field.
- Validation order: JSON parse (400 «Некорректное тело запроса») → prize lookup
  (400 «Приз не найден в каталоге шлюза») → SBP phone `/^\+7\d{10}$/`
  (400 «Укажи корректный номер телефона») → SBP >= 500 RUB receipt
  (400 «Прикрепите скриншот чека из Самоката»).
- `promoCode` only for PROMO_CODE / DEEP_LINK; `redirectUrl`
  (`https://partner.example.com/activate?code=...&utm_source=hqd_samokat`) only for DEEP_LINK;
  `message` «Выплата по СБП поступит в течение 2 минут» only for SBP_PAYOUT.
- `claimId` = random 4-digit string 1000–9999. `expiresInSeconds: 86400`,
  `expiresAt: Date.now() + 86_400_000`.
- DB write is wrapped in try/catch: on DB failure the success result is still returned (demo
  resilience). History route degrades to `{ claims: [] }` on DB error.
- History: `findMany({ orderBy: { createdAt: 'desc' }, take: 20 })` mapped to `ClaimHistoryEntry`
  with `createdAt.toISOString()`, `promoCode: record.promoCode ?? undefined`.
- Responses use `NextResponse` consistently; Russian header comments; no console logs; no emojis.

## Verification results

- `bunx tsc --noEmit`: only pre-existing errors in `examples/` and `skills/`; zero errors from
  the new route files.
- `bun run lint`: no issues in the new route files (pre-existing errors elsewhere were left
  untouched, per scope).
- Curl smoke tests against the RUNNING dev server (port 3000, not restarted):
  - POST claim `case-miami-vice` PROMO_CODE → 200 `{"success":true,"promoCode":"HQD-MIAMI-2632-RD","instructions":[...],"expiresInSeconds":86400,"expiresAt":...,"claimId":"3385"}`
  - POST claim `sbp-50000` SBP without phone → 400 `{"error":"Укажи корректный номер телефона"}`
  - POST claim `sbp-500` SBP with `+79991234567` + `receiptUploaded:true` → 200, no promoCode,
    `message:"Выплата по СБП поступит в течение 2 минут"`
  - GET history → 200 `{"claims":[...]}` with both records, newest first, promoCode omitted for SBP entry
  - Extra: malformed JSON → 400 «Некорректное тело запроса»; unknown prizeId → 400 «Приз не найден в каталоге шлюза»
- `dev.log` confirms Prisma INSERT/SELECT on `ClaimRecord` executed with expected statuses.

## Deviations from spec

None. (One internal iteration: initial `typeof raw === 'object'` narrowing failed strict TS
assignment to `Record<string, unknown>`; fixed with an `isRecord` type guard — final code is
equivalent to the spec.)
