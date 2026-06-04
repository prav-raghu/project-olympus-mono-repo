---
description: "Add Angular frontend pages for a domain - list page, detail page, form, and feature service"
agent: "Frontend Page Builder Agent"
argument-hint: "Domain and target app, e.g. 'product management pages in admin-web'"
---

Generate complete Angular frontend pages for:

**Request:** {{ input }}

## What to Generate

1. **Feature service** using `ApiClientService` for all operations (list, getById, create, update, delete)
2. **List component** with data table, pagination, search, filters, loading skeleton, error state, empty state
3. **Detail component** showing entity information
4. **Form component** for create and edit using Angular reactive forms with `Validators`
5. **Route registration** in `app.routes.ts` using `loadComponent` with `MsalGuard`

Every component must have:
- Loading skeleton (animated pulse placeholders)
- Error state with retry button
- Empty state with call-to-action

Never use `alert()`, `confirm()`, native HTML validation, React, Zod, or React Query.
