# Contributing

Thanks for contributing to ClearCredit.

## Development checklist

1. Install dependencies with `npm ci`
2. Copy `.env.example` to `.env`
3. Run `npx prisma generate`
4. Run `npx prisma db push`
5. Validate before opening a PR:

```bash
npm run lint
npm test
npx tsc --noEmit
npm run build
```

## Pull requests

Please include:

- a summary of the user-visible change
- any schema or environment changes
- screenshots for admin/client UI work
- validation output for lint/test/typecheck/build

## Releases

Portable release artifacts are produced from Git tags like `v0.2.0`.
