# ClearCredit

[![CI](https://github.com/innotelinc/clearcredit/actions/workflows/ci.yml/badge.svg)](https://github.com/innotelinc/clearcredit/actions/workflows/ci.yml)
[![Next.js](https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)](https://www.prisma.io/)
[![Stripe](https://img.shields.io/badge/Stripe-Billing-635BFF?logo=stripe&logoColor=white)](https://stripe.com/)

AI-assisted credit repair platform built with Next.js, Prisma, NextAuth, and Stripe. ClearCredit gives admins and clients a shared workspace for onboarding, contracts, credit report ingestion, AI-generated disputes, billing, and ongoing case management.

![ClearCredit social preview](public/repo-social-preview.svg)

## Live Site
- App: https://subscribe.innotel.us
- Repo: https://github.com/innotelinc/clearcredit

## Core Features
- Multi-step client signup with authorization and contract capture
- Role-based admin and client dashboards
- Credit report upload and AI-assisted dispute generation
- Dispute-credit accounting for packages, subscriptions, and admin adjustments
- Stripe checkout, billing portal, and webhook handling
- Service contracts, invoices, activity logs, and client management
- Admin settings interface and automation status visibility

## Local Setup
```bash
npm install
npx prisma generate
npx prisma db push
npm run seed:admin
npm run dev
```

## Required Environment
```env
DATABASE_URL=file:./dev.db
NEXTAUTH_SECRET=replace-me
NEXTAUTH_URL=http://localhost:3000
PUBLIC_APP_URL=http://localhost:3000
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
OPENAI_API_KEY=sk-...
REPORT_PULL_MODE=mock
AUTO_ANALYZE_PULLED_REPORTS=true
# Generic real-provider mode
# REPORT_PULL_MODE=generic
# REPORT_PROVIDER_BASE_URL=https://provider.example.com
# REPORT_PROVIDER_API_KEY=provider_api_key
# REPORT_PROVIDER_CREATE_PATH=/reports/pull
# REPORT_PROVIDER_STATUS_PATH=/reports/:id
# REPORT_PROVIDER_WEBHOOK_SECRET=shared_secret
```

## Useful Commands
```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
npm run seed:admin
```

## Stripe Webhook
Endpoint:
```text
https://subscribe.innotel.us/api/stripe/webhook
```

Subscribe to:
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.deleted`

## Automation Notes
- Uploaded credit reports can be analyzed into disputes automatically.
- Automatic report pulling is wired behind `/api/reports/pull`.
- Provider callbacks are handled at `/api/reports/provider-webhook`.
- Admins can trigger a full automation cycle from Settings or `POST /api/automation/run`.
- For local/demo automation, set `REPORT_PULL_MODE=mock`.
- For real provider mode, configure the generic provider environment values shown above.

## CI
GitHub Actions validates:
- lint
- tests
- typecheck
- production build

## License
MIT
