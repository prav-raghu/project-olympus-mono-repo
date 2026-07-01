---
applyTo: "apps/backend/**/modules/**,apps/backend/**/main.ts"
description: "OpenAPI/Swagger documentation using @nestjs/swagger decorators — NestJS pattern"
---

Every backend service exposes Swagger UI at `/api-docs` in non-production environments. `@nestjs/swagger` reads decorators on controllers and DTOs automatically.

## Bootstrap configuration (`main.ts`)

Gated by `NODE_ENV !== 'production'`:

```typescript
if (EnvConfig.get('NODE_ENV') !== 'production') {
  const config = new DocumentBuilder()
    .setTitle('Admin API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document);
}
```

## Controller decorators

Every controller MUST have:

```typescript
@ApiTags('Users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {}
```

Every route method MUST have:

```typescript
@ApiOperation({ summary: 'List users' })
@ApiResponse({ status: 200, description: 'Returns paginated users' })
@Get()
public async findAll() { /* ... */ }
```

## DTO decorators

Every DTO class property MUST be decorated:

```typescript
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  email: string = '';

  @ApiPropertyOptional({ example: 'John Doe' })
  @IsOptional()
  @IsString()
  displayName?: string;
}
```

Use `@ApiProperty` for required fields and `@ApiPropertyOptional` for optional fields.

## Swagger UI per service

| Service | Port | Docs URL |
| --- | --- | --- |
| api-gateway | 4000 | <http://localhost:4000/api-docs> |
| admin-api | 4001 | <http://localhost:4001/api-docs> |
| customer-api | 4002 | <http://localhost:4002/api-docs> |
| schedule-api | 4003 | <http://localhost:4003/api-docs> |

## Rules

- NEVER expose `/api-docs` in production — gated by `NODE_ENV !== 'production'` in `main.ts`
- ALWAYS add `@ApiTags` to every controller
- ALWAYS add `@ApiBearerAuth()` to protected controllers
- ALWAYS add `@ApiProperty`/`@ApiPropertyOptional` to every DTO property
- ALWAYS add `@ApiOperation({ summary })` to every route handler
