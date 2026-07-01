---
applyTo: "apps/backend/**/dto/**,apps/frontend/**/*.ts,apps/mobile/**/*.ts"
description: "End-to-end validation chain — Prisma schema drives the class-validator DTO, which drives Angular reactive form Validators, which drives UI error behaviour"
---

# End-to-end validation chain

The Prisma schema is the **single source of truth**. Every constraint defined there must propagate to the backend DTO's `class-validator` decorators and the Angular `Validators` — in that order, with nothing invented or omitted at either layer.

## The chain

```
Prisma schema
    ↓  (required, @db.VarChar, format implied by field name)
class-validator DTO (backend)
    ↓  on validation failure (global ValidationPipe)
400 Bad Request  { isSuccessful: false, message, errors: [{ field, message }] }
    ↓
Angular component subscribe({ error / next with isSuccessful: false })
    ↓
serverError signal rendered near the submit button (or toast if wired)  ← NOT an inline field error

Meanwhile, client-side:
Angular reactive form Validators (mirrors the DTO decorators)
    ↓  on validation failure
form.controls.field.invalid && form.controls.field.touched
    ↓
inline error text below the field  ← NO server round-trip needed
```

## Error behaviour rules

| Source | UI behaviour |
|---|---|
| Angular `Validators` failure | Inline error below the field, driven by `form.controls.x.invalid && form.controls.x.touched`. No server call, no toast. |
| Server 400 (`class-validator` / business rule) | `serverError` signal or toast with the server message. No inline field error — the form already passed client-side validation, so a 400 here means something the client couldn't check locally (e.g. a cross-field business rule). |
| Server 409 (unique constraint) | `serverError`/toast with a specific conflict message. |
| Server 500 | `serverError`/toast: "Something went wrong. Please try again." |
| Network error | `serverError`/toast: "Network error. Please check your connection." |

## Prisma → class-validator → Angular Validators mapping table

| Prisma field | `class-validator` (backend DTO) | Angular `Validators` (frontend) |
|---|---|---|
| `String` required | `@IsString()` (property has no `?`, no `@IsOptional()`) | `Validators.required` |
| `String?` optional | `@IsOptional() @IsString()` | no `Validators.required` |
| `@db.VarChar(N)` | `@MaxLength(N)` | `Validators.maxLength(N)` |
| email field name | `@IsEmail()` | `Validators.email` |
| phone field name | `@Matches(/^(\+27|0)[6-8][0-9]{8}$/)` | `Validators.pattern(/^(\+27|0)[6-8][0-9]{8}$/)` |
| `Decimal @db.Decimal(10,2)` | `@IsNumber() @Min(0)` | `Validators.min(0)` |
| Prisma `enum` | `@IsEnum(EnumName)` | `Validators.required` + a `<select>` constrained to the enum's values |
| `Boolean` required | `@IsBoolean()` | n/a (checkbox has no invalid state) |
| `Int` | `@IsInt() @Min(0)` | `Validators.min(0)` |
| UUID FK | `@IsUUID()` | `Validators.required` (selection from a populated list) |
| URL field | `@IsUrl()` | `Validators.pattern(URL_REGEX)` or a dedicated URL validator |
| `@unique` | No `class-validator` rule (DB enforces) | No Angular rule | → returns 409 Conflict |

## Backend — DTO with decorators, enforced by the global ValidationPipe

```typescript
export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email: string = '';

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  name: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @Matches(/^(\+27|0)[6-8][0-9]{8}$/, { message: 'Invalid phone number' })
  phone?: string;

  @ApiProperty({ enum: ['ADMINISTRATOR', 'MODERATOR', 'SUPPORT', 'CHAT_USER'] })
  @IsEnum(['ADMINISTRATOR', 'MODERATOR', 'SUPPORT', 'CHAT_USER'])
  role: string = '';
}
```

`main.ts` registers a global `ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true })`, and `common/filters/http-exception.filter.ts` shapes `class-validator` failures into:

```json
{
  "isSuccessful": false,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "email must be an email" },
    { "field": "name", "message": "name should not be empty" }
  ]
}
```

Unique constraint violations are checked explicitly in the service and return 409, not 400:

```typescript
public async create(dto: CreateUserDto, userId: string): Promise<ResponseDto<IUser>> {
  const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
  if (existing) {
    throw new ConflictException('An account with this email already exists');
  }
  // ...
}
```

## Frontend — Angular reactive form (mirrors the DTO exactly)

```typescript
export class CreateUserFormComponent {
  private readonly fb = inject(FormBuilder);
  private readonly usersService = inject(UsersService);

  public readonly submitting = signal(false);
  public readonly serverError = signal<string | null>(null);

  public readonly form = this.fb.group({
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    name: ['', [Validators.required, Validators.maxLength(100)]],
    phone: ['', [Validators.pattern(/^(\+27|0)[6-8][0-9]{8}$/)]],
    role: ['', [Validators.required]],
  });

  public submit(): void {
    if (this.form.invalid) return;
    this.submitting.set(true);
    this.serverError.set(null);

    this.usersService.create(this.form.value as CreateUserPayload).subscribe({
      next: (res) => {
        if (!res.isSuccessful) {
          this.serverError.set(res.message ?? 'Please check your input and try again');
          this.submitting.set(false);
          return;
        }
        this.router.navigate(['/users']);
      },
      error: (err) => {
        const status = err?.status;
        this.serverError.set(
          status === 409 ? 'An account with this email already exists' :
          status === 400 ? 'Please check your input and try again' :
          'Something went wrong. Please try again.'
        );
        this.submitting.set(false);
      },
    });
  }
}
```

```html
<div>
  <input formControlName="email" placeholder="Email address" />
  @if (form.controls.email.invalid && form.controls.email.touched) {
    <span class="text-destructive text-sm mt-1 block">
      @if (form.controls.email.hasError('required')) { Email is required }
      @else if (form.controls.email.hasError('email')) { Invalid email address }
    </span>
  }
</div>

@if (serverError()) {
  <p class="text-destructive text-sm">{{ serverError() }}</p>
}
```

## Rules — always enforced

- Angular `Validators` are derived FROM the `class-validator` decorators. Never write one without updating the other.
- Client-side `Validators` failure → inline error, no server round-trip, no toast.
- Server 400/409/500 → `serverError` signal or toast, no inline field error.
- The `errors` array in a 400 response always includes the `field` name so future field-level mapping is possible.
- Every form submit button reflects a `submitting` signal and is disabled while pending or while the form is invalid.
- Unique constraint violations (`@unique` in Prisma) always return 409, not 400.
- Monetary `Decimal` fields use a numeric Angular form control; the service converts to `Decimal` before the Prisma write.
