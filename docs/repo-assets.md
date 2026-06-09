# Repo release assets

Generated brand/release assets live in the repository so they can be reused in the GitHub UI, README, release notes, and external announcements.

## Social preview image

- SVG source: `public/repo-social-preview.svg`
- PNG export: `public/repo-social-preview.png`

Recommended GitHub repo social preview upload target:
- `public/repo-social-preview.png`

## Badge set

Reusable SVG badges:
- `public/badges/release.svg`
- `public/badges/portable.svg`
- `public/badges/stack.svg`
- `public/badges/llm.svg`

These are intended for README/docs usage or release-note embeds via raw GitHub URLs.

## Regeneration

Rebuild the PNG preview and badges with:

```bash
node scripts/generate-repo-assets.mjs
```
