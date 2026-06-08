# ClearCredit

ClearCredit is an AI-assisted credit repair platform built with Next.js, Prisma, NextAuth, and Stripe. It helps credit repair businesses and their clients analyze reports, generate FCRA-style dispute letters, manage billing, and track dispute progress from intake to resolution.

**Live site:** https://subscribe.innotel.us  
**Repository:** https://github.com/innotelinc/clearcredit

## Features

- AI-assisted credit report analysis
- Dispute item tracking and status management
- FCRA-oriented dispute letter generation
- Client and admin dashboards
- Stripe checkout, subscriptions, invoices, and billing portal
- Role-based access control for admins and clients
- Prisma-backed data layer
- Seed script for creating an admin user quickly

## Tech Stack

- **Framework:** Next.js 16 (App Router)
- **Language:** TypeScript
- **Auth:** NextAuth
- **Database:** Prisma + SQLite
- **Payments:** Stripe
- **Email:** Resend
- **AI integration:** OpenAI
- **Testing:** Vitest
- **UI:** React + Tailwind CSS + Radix UI

## Main App Areas

### Public
- Landing page
- Signup flow
- Login

### Client
- Dashboard
- Billing
- Disputes
- Messages

### Admin
- Dashboard
- Clients
- Client detail views
- Disputes
- Contracts
- Billing
- Settings

### API
Key route groups include:
- `/api/auth/*`
- `/api/clients`
- `/api/disputes`
- `/api/contracts`
- `/api/reports`
- `/api/stats`
- `/api/invoices`
- `/api/stripe/checkout`
- `/api/stripe/portal`
- `/api/stripe/webhook`

## Local Development

### 1. Install dependencies
```bash
npm install
```

### 2. Configure environment variables
Create a `.env` file with the values your environment needs.

Required variables used by the app include:

```env
DATABASE_URL="file:./dev.db"
NEXTAUTH_SECRET="replace-with-a-secure-random-secret"
NEXTAUTH_URL="https://subscribe.innotel.us"
PUBLIC_APP_URL="https://subscribe.innotel.us"
STRIPE_SECRET_KEY="sk_..."
STRIPE_WEBHOOK_SECRET="whsec_..."
RESEND_API_KEY="re_..."
FROM_EMAIL="onboarding@resend.dev"
OPENAI_API_KEY="..."
```

## Database setup

Generate Prisma client:
```bash
npx prisma generate
```

Apply schema to the local SQLite database:
```bash
npx prisma db push
```

## Seed an admin user

Create or update the default admin:
```bash
npm run seed:admin
```

Default seeded credentials:
- **Email:** `admin@clearcredit.local`
- **Password:** `ClearCreditAdmin!2026`

You can override them:
```bash
ADMIN_EMAIL=you@example.com \
ADMIN_PASSWORD='StrongPasswordHere' \
ADMIN_NAME='Your Name' \
ADMIN_BUSINESS_NAME='Your Company' \
ADMIN_BUSINESS_ID='default' \
npm run seed:admin
```

## Run the app

Development:
```bash
npm run dev
```

Production build:
```bash
npm run build
npm start
```

## Testing and Validation

Run lint:
```bash
npm run lint
```

Run tests:
```bash
npm test
```

Run typecheck:
```bash
npx tsc --noEmit
```

## Stripe Webhook

Production webhook endpoint:
```text
https://subscribe.innotel.us/api/stripe/webhook
```

Recommended subscribed events:
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.deleted`

## Security Notes

This repository includes role-based access-control fixes for protected API routes and tighter Stripe redirect validation. Keep production secrets out of git and rotate any secret that has ever been exposed.

## Current Status

The app currently passes:
- `npm run lint`
- `npm test`
- `npx tsc --noEmit`
- `npm run build`

## License

No license file has been added yet. If you want this repository to be open for reuse, add an explicit license.
