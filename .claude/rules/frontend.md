---
paths:
  - "apps/frontend/**/*.ts"
  - "apps/frontend/**/*.html"
---

# Frontend Rules

You are working on an Angular application. These rules apply to all files under `apps/frontend/`.

## Stack

- `admin-web`: Angular standalone components + Signals + Tailwind v4
- `customer-web`: Angular standalone components + Signals + Tailwind v4, plus SEO via `Title`/`Meta`

Both apps are Angular — there is no React or Next.js anywhere on the web frontend.

## Validation — read validation-chain.instructions.md first

Every form must implement the full validation chain. The two rules that govern error display:

- **Angular `Validators` failure** → inline error text below the field. No server round-trip, no toast.
- **Server 400/409/500** → `serverError` signal or toast. Never inline.

This distinction is non-negotiable. See `validation-chain.instructions.md` for the complete chain, the Prisma → DTO → `Validators` mapping, and a worked example.

## Other non-negotiables

- No `any` type
- No comments in code
- No `alert()`, `confirm()`, or reliance on native HTML form validation attributes
- No `localStorage` for tokens — MSAL manages its own token cache
- No `HttpClient` injected directly in a component or service other than `ApiClientService` itself
- No inline styles — always Tailwind utility classes
- No RxJS `BehaviorSubject` as a component-level store — use Signals
- No NgModules — standalone components only
- Every API-driven component must have a loading skeleton, an error state with retry, and an empty state

## Tailwind v4 conventions

- `postcss.config.js` with `@tailwindcss/postcss`
- `styles.scss`/`globals.css` uses `@import "tailwindcss"` (not v3's `@tailwind base`)
- Colors defined as CSS variables in `hsl()` format under `:root`
- `@theme` directive maps CSS vars to Tailwind tokens
- `data-theme` on `<html>` for light/dark/system
- Use semantic token classes: `bg-background`, `text-foreground`, `bg-primary`, `text-destructive` — never raw color classes like `bg-blue-500`

## Before marking complete

Run `pnpm --filter <app-name> typecheck` — zero errors required.
