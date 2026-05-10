# EasyTax — ДанъкЛесно

Bulgarian freelancer tax management. Calculates annual income tax and residual
social security, generates NRA Declaration Art. 50 XML for upload to
`portal.nra.bg`, and tracks deadlines.

> **Status:** Phase 1 ✅ tax-engine · Phase 2 ✅ Next.js + Supabase + onboarding + dashboard
> Phase 3+ (AI invoice extraction, NRA XML, documents UI) deferred.

## Stack

- **App:** Next.js 15 App Router (TypeScript, Tailwind, React 19) — Vercel-ready
- **Database / auth / storage:** Supabase (RLS-locked)
- **Tax engine:** local workspace package, pure functions, zero deps
- **AI invoice extraction:** Anthropic Claude API (Phase 3)
- **NRA XML + PDF preview:** custom builder + pdf-lib (Phase 4)
- **Email:** Resend (Phase 4)

## Repository layout

```
apps/
  web/                 # Next.js 15 app
    app/
      page.tsx                  # public landing → redirects when authed
      (auth)/login, register    # Supabase auth
      onboarding/               # 4-step wizard
      dashboard/                # live tax calculation, RSC
      invoices/                 # list + (Phase 3) AI upload
      api/
        profile/                # POST onboarding payload
        invoices/               # GET/POST manual CRUD
        tax/[year]/calculate/   # GET live tax result
    lib/
      supabase/                 # browser, server, middleware clients
      auth.ts, format.ts, deadlines.ts
    middleware.ts               # session refresh + auth gate
packages/
  tax-engine/          # ✅ pure-function tax calculations + 42 passing tests
supabase/
  migrations/          # SQL — initial schema + RLS policies
  README.md            # how to apply
docs/
  tax-rules/           # one markdown per year, rates / thresholds / deadlines
vercel.json            # build configuration for monorepo deploy
```

## Quick start

```bash
git clone https://github.com/ItsFoboz/EasyTax.git
cd EasyTax
pnpm install

# 1. Set up Supabase (see supabase/README.md), fill in apps/web/.env.local
cp apps/web/.env.example apps/web/.env.local

# 2. Run tests
pnpm --filter @easytax/tax-engine test

# 3. Run the app
pnpm --filter @easytax/web dev
# → http://localhost:3000
```

## Phase 1 — `tax-engine`

Pure functions. Zero runtime dependencies. 42 passing Vitest tests.

```ts
import { calculateTax } from "@easytax/tax-engine";

const result = calculateTax(invoices, profile, 2024);
if (result.status === "ok") {
  console.log(result.income_tax, result.quarterly);
} else {
  // requires_accountant — mid-year profile change, etc.
}
```

What it computes:

1. Sums gross income from invoices (already in BGN at locked BNB rates).
2. Applies the 25% normative expense deduction.
3. Computes **residual** social security based on insurance profile (4 types).
4. Applies the 10% flat income tax on the final taxable base.
5. Splits into Q1, Q2, Q3 advance payments + Q4 final reconciliation.
6. Emits a VAT proximity warning at ≥80% of the registration threshold.

What it refuses to compute: mid-year profile changes return
`{ status: "requires_accountant" }` with a human-readable reason.

### Tax constants — single source of truth

One file per year at `packages/tax-engine/src/constants/{year}.ts`. Adding a
new year = add a file + register it in `constants/index.ts`. Logic never
hardcodes rates.

Configured: **2024** (authoritative), **2025** (seeded, marked `// TODO: verify`).

## Phase 2 — Web app

- `/` — public landing; redirects authed users to `/dashboard` or `/onboarding`
- `/login`, `/register` — Supabase Auth (email + password)
- `/onboarding` — 4-step wizard: profile type → profile-specific fields → personal details (incl. EGN) → tax year
- `/dashboard` — Server Component pulls invoices + profile + user, runs the tax engine, renders:
  - top stats (gross, tax, SS, effective rate)
  - VAT proximity bar (visible when ≥50%, warning at ≥80%)
  - full breakdown panel (gross → normative → SS → final base → tax)
  - quarterly advance + Q4 reconciliation
  - next-deadline countdown
- `/invoices` — table view; AI upload arrives in Phase 3

### Auth & RLS

- `@supabase/ssr` for cookie-based sessions (server + browser + middleware)
- `middleware.ts` refreshes the session on every request and redirects
  unauthenticated users away from app routes
- Every Supabase table has RLS enabled and policies that strictly require
  `auth.uid() = user_id`. See `supabase/migrations/20250101000002_rls_policies.sql`.

## Phase 3+ Roadmap

| Phase | Scope |
|-------|-------|
| 1 ✅ | `tax-engine` + tests |
| 2 ✅ | Next.js, Supabase schema + RLS, auth, onboarding, dashboard, basic invoices |
| 3 | AI invoice extraction (Claude vision), BNB rate fetcher with daily cache, review-before-save flow, signed-URL storage |
| 4 | NRA Declaration Art. 50 XML + XSD validation, PDF preview, documents UI, calendar UI |
| 5 | Email reminders (Resend), GDPR delete endpoint |
| 6 | Hardening: AES-256-GCM EGN encryption (currently stored plain — flagged TODO in `app/api/profile/route.ts`), secret rotation, audit logs |

## Known gaps before production

- **EGN is stored plaintext.** TODO in `apps/web/app/api/profile/route.ts`.
  Phase 6 wires AES-256-GCM with `EGN_ENCRYPTION_KEY` from env.
- **2025 constants** are seeded with best-available public figures. Verify
  before any production filing.
- **VAT threshold corrected** to 100,000 BGN (was 166,000 in original spec —
  per the 2026 transition guidance the threshold has been "maintained" since
  before 2024). In EUR: 51,130. Verified against the official 2026 amendment
  notice.
- **Sickness/maternity rate** is applied to all four profiles uniformly per
  the literal spec. For `employed_primary` it is normally already covered
  by the employer — adjust in `social-security.ts` if needed.
- **No NRA XSD** yet at `docs/nra-schemas/`. Phase 4 needs the official XSD
  file dropped in to wire up validation.

## Disclaimer

The figures produced by this engine are **estimates** based on the standard
25% normative expense deduction and the profile you configure. They do not
constitute tax advice. Consult a qualified accountant for complex situations
including foreign income, tax treaties, or mid-year registration changes.
