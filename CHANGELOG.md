# Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-06-09

### Added
- GitHub release assets: social preview image (`.svg` + `.png`) and reusable SVG badge set
- Portable packaged-app systemd unit template and installer script
- Portable install docs for persistent systemd deployment
- Admin-managed pricing editor for one-time packages, monthly plans, and yearly plans
- Editable plan names, prices, dispute credits, Stripe price IDs, sort order, and active state
- Unified pricing catalog consumed by homepage, signup, billing, checkout, and webhook flows
- Portable standalone packaging via versioned `.zip` and `.tar.gz` artifacts
- Portable install and run scripts
- GitHub release workflow and community health files

### Changed
- Switched public package metadata from a private app manifest to a distributable `clearcredit` package manifest
- Enabled Next.js standalone output for portable deployments
