# EasyTax — ДанъкЛесно

Bulgarian freelancer tax management. Calculates annual income tax and residual
social security, generates NRA Declaration Art. 50 XML for upload to
`portal.nra.bg`, and tracks deadlines.

> **Status:** Phase 1 — `tax-engine` package only. UI, API, AI invoice
> extraction, and NRA XML generation come next.

## Stack (planned)

- **Frontend + API:** Next.js (App Router) on Vercel
- **Database / auth / storage:** Supabase
- **AI invoice extraction:** Anthropic Claude API
- **PDF generation:** pdf-lib
- **Email:** Resend

## Repository layout

```
apps/
  web/                 # Next.js app (Phase 2+)
packages/
  tax-engine/          # ✅ Phase 1 — pure-function tax calculations
  nra-xml/             # Phase 3 — XML + XSD validation
  invoice-extractor/   # Phase 3 — Claude API wrapper
docs/
  tax-rules/           # One markdown per year — rates, thresholds, deadlines
  nra-schemas/         # NRA XSD per year (added Phase 3)
```

## Phase 1 — `tax-engine`

**Pure functions. Zero runtime dependencies. 100% test coverage on calculation logic.**

```ts
import { calculateTax } from "@easytax/tax-engine";

const result = calculateTax(invoices, profile, 2024);
if (result.status === "ok") {
  console.log(result.income_tax, result.quarterly);
} else {
  // requires_accountant — mid-year profile change, etc.
  console.log(result.reason);
}
```

### What it computes

1. Sums gross income from invoices (already converted to BGN at the BNB rate
   locked at extraction time).
2. Applies the 25% normative expense deduction for liberal professions.
3. Calculates **residual** social security based on the user's insurance
   profile (full self-employed / EOOD director / employed primary / civil
   contract only). Caps the base at the annual legal maximum and at actual
   freelance income.
4. Applies the 10% flat income tax on the final taxable base.
5. Splits into Q1, Q2, Q3 advance payments + Q4 final reconciliation.
6. Emits a VAT proximity warning at ≥80% of the registration threshold.

### What it refuses to compute

Mid-year profile changes (`profile_valid_from` set) return
`{ status: "requires_accountant", reason: "..." }` instead of guessing. The
UI surfaces this and points users to a qualified accountant.

### Tax constants — single source of truth

Each year has one file: `packages/tax-engine/src/constants/{year}.ts`. Adding
a new year = add a file + register it in `constants/index.ts`. Logic never
hardcodes rates.

Currently configured: **2024**, **2025**.

> 2025 figures are seeded with best-available public data and marked
> `// TODO: verify` until cross-checked against the published Budget Act.

### Running tests

```bash
pnpm install
pnpm --filter @easytax/tax-engine test
pnpm --filter @easytax/tax-engine test:coverage
```

Coverage thresholds: 95% statements / 90% branches / 100% functions / 95% lines.

## Roadmap

| Phase | Scope |
|-------|-------|
| 1 ✅ | `tax-engine` + tests |
| 2 | Next.js scaffold, Supabase schema + RLS, auth, onboarding wizard |
| 3 | Invoice CRUD, AI extraction (Claude vision), BNB rate fetcher |
| 4 | Tax calculator UI, dashboard, calendar |
| 5 | NRA XML generation + XSD validation, PDF preview, document delivery |
| 6 | Hardening: GDPR delete endpoint, EGN AES-256-GCM encryption, signed storage URLs |

## Disclaimer

The figures produced by this engine are **estimates** based on the standard
25% normative expense deduction and the profile you configure. They do not
constitute tax advice. Consult a qualified accountant for complex situations
including foreign income, tax treaties, or mid-year registration changes.
