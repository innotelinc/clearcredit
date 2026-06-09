# ClearCredit

![Release](./public/badges/release.svg)
![Portable](./public/badges/portable.svg)
![Stack](./public/badges/stack.svg)
![LLM](./public/badges/llm.svg)

AI-powered credit repair and dispute automation built with Next.js, Prisma, Stripe, and configurable LLM backends. ClearCredit now supports an admin-managed pricing catalog for one-time packages plus monthly/yearly subscriptions, and it can be shipped as a portable standalone bundle (`.zip` or `.tar.gz`).

## Highlights

- Admin dashboard for clients, disputes, billing, and automation
- AI-generated FCRA dispute letters
- Stripe checkout, invoices, and customer portal integration
- Admin-editable pricing for:
  - one-time packages
  - monthly plans
  - yearly plans
  - plan names
  - prices
  - dispute credits
  - Stripe price IDs
  - sort order
  - active/inactive visibility
- Configurable LLM backends:
  - direct OpenAI-compatible
  - OpenRouter
  - local Mirrowel API key proxy
- Portable standalone packaging for handoff and offline deployment prep

## Repository

- GitHub: <https://github.com/innotelinc/clearcredit>
- Issues: <https://github.com/innotelinc/clearcredit/issues>
- Releases: create a Git tag like `v0.2.1` to trigger the portable release workflow

## Requirements

- Node.js 20+
- npm
- SQLite by default (`DATABASE_URL=file:./dev.db`) or another Prisma-supported database

## Local development

```bash
npm ci
cp .env.example .env
npx prisma generate
npx prisma db push
npm run build
npm test
npm run dev
```

Open <http://localhost:3000>.

## Environment setup

Copy `.env.example` to `.env` and fill in real values.

Minimum production variables:

- `DATABASE_URL`
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`
- `PUBLIC_APP_URL`
- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Optional integrations:

- `RESEND_API_KEY`
- `FROM_EMAIL`
- `OPENAI_API_KEY`
- proxy/OpenRouter-specific variables already used by this repo

## Admin-managed pricing catalog

From **Admin → Settings**, you can now edit:

### One-time packages
- plan name
- price
- dispute credits
- sort order
- active/inactive visibility
- Stripe price ID

### Monthly and yearly subscriptions
- plan name
- price
- dispute credits
- sort order
- active/inactive visibility
- Stripe price ID

Those values are consumed by:

- homepage pricing cards
- signup flow
- client billing page
- Stripe checkout session creation
- Stripe webhook subscription credit reconciliation

## Portable package creation

This repo supports Next.js standalone output.

Build a portable release bundle:

```bash
npx prisma generate
npx prisma db push
npm run package:portable
```

Artifacts are written to `dist/`:

- `clearcredit-<version>-portable.tar.gz`
- `clearcredit-<version>-portable.zip`
- `clearcredit-<version>-SHA256SUMS.txt`

The extracted bundle contains:

- standalone Next server output
- static assets
- public assets
- `.env.example`
- Prisma schema/seed files
- `scripts/install-portable.sh`
- `scripts/run-portable.sh`

## Portable install

After extracting an artifact:

```bash
cd clearcredit-<version>
./scripts/install-portable.sh /opt/clearcredit
cd /opt/clearcredit
cp .env.example .env   # if needed
./scripts/run-portable.sh
```

Default runtime:

- host: `0.0.0.0`
- port: `3000`

Override with:

```bash
HOSTNAME=127.0.0.1 PORT=4000 ./scripts/run-portable.sh
```

## Validation

Use the same checks as CI:

```bash
npx prisma generate
npx prisma db push
npm run lint
npm test
npx tsc --noEmit
npm run build
```

## Versioning

This project now uses package-based semantic versioning from `package.json`.

Current version:

- `0.2.1`

Recommended release flow:

1. Update code and docs
2. Update `CHANGELOG.md`
3. Bump `package.json` version
4. Commit
5. Tag release: `git tag v0.2.1 && git push origin v0.2.1`
6. GitHub Actions builds the portable archives and attaches them to the release

## GitHub workflows and community files

This repository includes:

- CI validation workflow
- portable release workflow
- issue templates
- pull request template
- contributing guide
- security policy
- changelog

## License

MIT — see `LICENSE`.
