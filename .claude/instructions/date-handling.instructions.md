---
applyTo: "apps/**/*.ts,apps/**/*.html,common/**/*.ts"
description: "Date/time convention across DB, service/API, and UI layers — one storage format, one wire format, one display format"
---

# Date & Time Handling — DB → Service → UI

Three layers, three different jobs, three different formats. Never let a display format leak into storage or the wire, and never let storage format leak into the UI.

## 1. Database layer — Prisma `DateTime`, stored UTC

Every timestamp column is Prisma's `DateTime` type (MySQL `DATETIME(0)`, per `rules/prisma.md`), always written and read in UTC. Never store a formatted string (`"25/12/2025"`) in a date column, and never add a parallel `String` column to hold a display-formatted copy of a date — format at render time, not at rest.

```prisma
createdAt DateTime @default(now()) @db.DateTime(0) @map("created_at")
eventDate DateTime @db.DateTime(0) @map("event_date")
```

MySQL's `DATETIME` has no timezone awareness of its own — always write and read it as UTC at the application layer (Prisma does this consistently as long as the app process and MySQL session both run UTC, which is the standard baseline for this project's containers).

## 2. Service / API layer — ISO 8601, always, both directions

- **Outbound** (API response): a `Date` serializes to ISO 8601 UTC automatically via `JSON.stringify` (`2025-12-25T14:30:00.000Z`) — NestJS's default behavior for any `Date` in a response body. Never manually call `.toLocaleDateString()` or hand-format a date before sending it — that's a UI concern, not a service concern.
- **Inbound** (request body): `class-validator` validates incoming date fields as ISO 8601 strings on the DTO:

```typescript
@ApiProperty()
@IsDateString()
eventDate: string = '';
```

- The service layer converts the validated ISO string to a `Date` before writing to Prisma (`new Date(dto.eventDate)`) — never pass a raw string through to a `DateTime` field without validation first.
- Never accept `dd/MM/yyyy` on a backend request body. The `dd/MM/yyyy [HH:mm:ss]` format is a UI presentation concern only — the frontend converts it to ISO 8601 before the request ever leaves the browser (see §3). If a backend DTO is validating `dd/MM/yyyy`, that's a bug — fix the frontend's outbound mapping instead of relaxing the `class-validator` decorator.

## 3. UI layer — display and input as `dd/MM/yyyy`, optional `HH:mm:ss`

Both Angular apps already depend on `date-fns` — use it, not `Date.prototype.toLocaleDateString()` (locale-dependent, not guaranteed `dd/MM/yyyy` across browsers/OS locales) and not a second date library.

```typescript
// src/app/shared/utilities/format-date.util.ts
import { format, parse, isValid } from 'date-fns';

const DATE_FORMAT = 'dd/MM/yyyy';
const DATE_TIME_FORMAT = 'dd/MM/yyyy HH:mm:ss';

export function formatDate(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return format(date, DATE_FORMAT);
}

export function formatDateTime(value: string | Date): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return format(date, DATE_TIME_FORMAT);
}

export function parseDateInput(value: string, withTime = false): Date | null {
  const parsed = parse(value, withTime ? DATE_TIME_FORMAT : DATE_FORMAT, new Date());
  return isValid(parsed) ? parsed : null;
}

export function toApiDate(value: Date): string {
  return value.toISOString();
}
```

- **Display**: every place a date/timestamp is rendered — tables, detail views, PDFs, exports — goes through `formatDate`/`formatDateTime`. Time is appended (`HH:mm:ss`) only when the field is genuinely a timestamp the user cares about to the second (audit trails, activity logs); a plain business date (order date, birthdate) shows date-only.
- **Input**: a native date picker (`<input type="date">` wrapped by a component, or a calendar widget) already returns a real `Date`/ISO value — no parsing needed, and this is the default choice. Only when a field genuinely requires free-text entry does `parseDateInput` come into play, and that field's Angular `Validators` validates the `dd/MM/yyyy` shape before parsing:

```typescript
date: ['', [Validators.pattern(/^\d{2}\/\d{2}\/\d{4}$/)]]
```

with a custom validator calling `parseDateInput` for the "is this an actual calendar date" check `Validators.pattern` can't express on its own.

- **Outbound**: before the value reaches `ApiClientService`, convert with `toApiDate` (or just send the picker's native ISO value straight through) — the wire format is always ISO 8601, never `dd/MM/yyyy`, matching §2.

## Summary

| Layer | Format | Never |
|---|---|---|
| Database | `DateTime` / MySQL `DATETIME(0)`, UTC | A `String` column holding a formatted date |
| Service / API (request + response) | ISO 8601 (`@IsDateString()` on the DTO) | `dd/MM/yyyy` on the wire in either direction |
| UI display | `dd/MM/yyyy`, optional ` HH:mm:ss` via `date-fns` | `toLocaleDateString()`, a second date library, hand-rolled string splitting |
