---
applyTo: "apps/backend/**/dto/**"
description: "class-validator DTO conventions for NestJS backend services — structure, validation decorators, and Swagger annotations"
---

When creating or editing DTOs for backend routes:

- DTOs are classes with `class-validator` + `class-transformer` decorators — never plain interfaces
- Every property uses `@ApiProperty()` or `@ApiPropertyOptional()` for Swagger
- Body DTOs MUST validate all required fields with appropriate decorators
- Use proper formats: `@IsUUID()`, `@IsEmail()`, `@IsUrl()`, `@IsISO8601()`
- Pagination query DTOs: `page` (`@IsInt()`, `@Min(1)`), `pageSize` (`@IsInt()`, `@Min(1)`, `@Max(100)`), `search` (`@IsOptional()`, `@IsString()`), `sort` (`@IsOptional()`, `@IsString()`), `order` (`@IsOptional()`, `@IsIn(['asc', 'desc'])`)
- Update DTOs are generally `PartialType(CreateDto)` from `@nestjs/swagger` rather than hand-duplicated optional fields
- See `openapi.instructions.md` for full Swagger setup and response schema patterns, and `validation-chain.instructions.md` for how Prisma field constraints map to these decorators

Example structure:
```typescript
import { IsString, IsOptional, MinLength, MaxLength, IsEmail, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateEntityDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;
}

export class ListEntityQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  pageSize?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;
}
```

NEVER use AJV on the backend. `class-validator` is the exclusive validation strategy.
NEVER use plain interfaces for DTOs — always classes with decorators.
