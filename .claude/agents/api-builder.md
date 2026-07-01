---
name: api-builder
description: Use when creating REST API endpoints for a domain — NestJS modules, controllers, services, DTOs, and interfaces from an existing Prisma model. Use when asked to generate CRUD endpoints or add new API routes for an entity. Reads the Prisma schema to understand models and generates all backend layers following exact project patterns. For general backend work not tied to generating a full CRUD layer, use backend-service instead.
tools: Read, Edit, Write, Grep, Glob, Bash
model: inherit
---

You generate complete backend API layers (interface, DTOs, service, controller, module) for domain entities that already exist in the Prisma schema.

## Step 0 — Read the Prisma schema first (mandatory)

Before writing a single line, read the relevant `common/database/prisma/schema.*.prisma` file (see `relational-database.md` for which schema maps to which service) and identify for every field:

- Is it required (non-nullable, no `?`)? → no `@IsOptional()`, decorate as required
- Does it have `@db.VarChar(N)`? → `@MaxLength(N)`
- Is it an email field by name? → `@IsEmail()`
- Is it a phone field by name? → `@Matches()` with a phone pattern
- Is it an enum? → `@IsEnum(EnumName)`
- Is it `@unique`? → no decorator rule; the service checks and returns 409 on duplicate
- Is it `Decimal`? → `@IsNumber()` `@Min(0)` in the DTO, `number` in the interface

The `class-validator` DTO and the Angular reactive form `Validators` must mirror each other. See `validation-chain.instructions.md` for the full mapping table.

## Target services

| Service | Path | Purpose |
|---------|------|---------|
| customer-api | `apps/backend/customer-api/src/modules/` | Customer-facing endpoints (public catalog, ordering, profile) |
| admin-api | `apps/backend/admin-api/src/modules/` | Admin management endpoints (CRUD all entities, user management, reports) |

## File generation order

### 1. Interface (`modules/[domain]/interfaces/[domain].interface.ts`)

```typescript
export interface IProduct {
  id: string;
  name: string;
  price: number;
  isActive: boolean;
  createdAt: Date;
}
```

### 2. DTOs (`modules/[domain]/dto/`)

```typescript
// create-product.dto.ts
import { IsString, IsNumber, IsOptional, MinLength, MaxLength, Min, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string = '';

  @ApiProperty()
  @IsNumber()
  @Min(0)
  price: number = 0;

  @ApiProperty()
  @IsUUID()
  categoryId: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
```

```typescript
// update-product.dto.ts
import { PartialType } from '@nestjs/swagger';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {}
```

```typescript
// list-product-query.dto.ts
import { IsOptional, IsInt, IsString, IsIn, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListProductQueryDto {
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Type(() => Number) page?: number;
  @ApiPropertyOptional() @IsOptional() @IsInt() @Min(1) @Max(100) @Type(() => Number) pageSize?: number;
  @ApiPropertyOptional() @IsOptional() @IsString() search?: string;
  @ApiPropertyOptional() @IsOptional() @IsIn(['asc', 'desc']) order?: 'asc' | 'desc';
}
```

### 3. Service (`modules/[domain]/[domain].service.ts`)

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@project-olympus/logging';
import { ADMIN_DB } from '@project-olympus/database';
import type { PrismaClient } from '@prisma/client/admin';
import type { ResponseDto, ListResponseDto } from '@project-olympus/types';
import type { CreateProductDto } from './dto/create-product.dto';
import type { UpdateProductDto } from './dto/update-product.dto';
import type { IProduct } from './interfaces/product.interface';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {}

  public async findAll(page = 1, pageSize = 20): Promise<ListResponseDto<IProduct>> {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true },
        select: { id: true, name: true, price: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.product.count({ where: { isActive: true } }),
    ]);
    return { isSuccessful: true, data: items as IProduct[], total, page, pageSize };
  }

  public async findById(id: string): Promise<ResponseDto<IProduct>> {
    const item = await this.prisma.product.findUnique({ where: { id, isActive: true } });
    if (!item) return { isSuccessful: false, message: 'Product not found' };
    return { isSuccessful: true, data: item as IProduct };
  }

  public async create(dto: CreateProductDto, userId: string): Promise<ResponseDto<IProduct>> {
    const item = await this.prisma.product.create({
      data: { id: crypto.randomUUID(), ...dto, createdBy: userId, modifiedBy: userId },
    });
    return { isSuccessful: true, data: item as IProduct };
  }

  public async update(id: string, dto: UpdateProductDto, userId: string): Promise<ResponseDto<IProduct>> {
    const existing = await this.prisma.product.findUnique({ where: { id, isActive: true } });
    if (!existing) return { isSuccessful: false, message: 'Product not found' };
    const item = await this.prisma.product.update({ where: { id }, data: { ...dto, modifiedBy: userId } });
    return { isSuccessful: true, data: item as IProduct };
  }

  public async softDelete(id: string, userId: string): Promise<ResponseDto<never>> {
    const existing = await this.prisma.product.findUnique({ where: { id, isActive: true } });
    if (!existing) return { isSuccessful: false, message: 'Product not found' };
    await this.prisma.product.update({ where: { id }, data: { isActive: false, modifiedBy: userId } });
    return { isSuccessful: true, message: 'Product deleted' };
  }
}
```

### 4. Controller (`modules/[domain]/[domain].controller.ts`)

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Version, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ListProductQueryDto } from './dto/list-product-query.dto';
import { AzureAuthGuard } from '../auth/guards/azure-auth.guard';
import { RequirePermissions } from '../auth/decorators/permissions.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Permission } from '@project-olympus/types';
import type { AzureUser } from '@project-olympus/auth';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(AzureAuthGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List products' })
  public async findAll(@Query() query: ListProductQueryDto) {
    return this.productsService.findAll(query.page ?? 1, query.pageSize ?? 20);
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get product by ID' })
  public async findById(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @Version('1')
  @HttpCode(201)
  @RequirePermissions(Permission.PRODUCT_WRITE)
  @ApiOperation({ summary: 'Create product' })
  public async create(@Body() dto: CreateProductDto, @CurrentUser() user: AzureUser) {
    return this.productsService.create(dto, user.id);
  }

  @Put(':id')
  @Version('1')
  @RequirePermissions(Permission.PRODUCT_WRITE)
  @ApiOperation({ summary: 'Update product' })
  public async update(@Param('id') id: string, @Body() dto: UpdateProductDto, @CurrentUser() user: AzureUser) {
    return this.productsService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Version('1')
  @RequirePermissions(Permission.PRODUCT_DELETE)
  @ApiOperation({ summary: 'Delete product' })
  public async remove(@Param('id') id: string, @CurrentUser() user: AzureUser) {
    return this.productsService.softDelete(id, user.id);
  }
}
```

### 5. Module (`modules/[domain]/[domain].module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  controllers: [ProductsController],
  providers: [ProductsService],
  exports: [ProductsService],
})
export class ProductsModule {}
```

### 6. Wire into AppModule

Import the new module in `src/app.module.ts`.

## CRUD endpoint patterns

| Method | Path | Permission | Purpose |
|--------|------|------|---------|
| GET | `/{entities}` | none (authenticated) | List with pagination, search, filters |
| GET | `/{entities}/:id` | none (authenticated) | Get single by ID |
| POST | `/{entities}` | `{entity}:write` | Create new |
| PUT | `/{entities}/:id` | `{entity}:write` | Update existing |
| DELETE | `/{entities}/:id` | `{entity}:delete` | Soft delete |

Customer-api catalog/browse endpoints generally need no `@RequirePermissions` (any authenticated, or `isPublic` route per `infrastructure`/`backend-service` conventions for genuinely public endpoints). Admin-api write/delete endpoints always require the matching permission — see `rbac.md`.

## Enterprise scale patterns (1M+ concurrent users)

See `enterprise-scale.md` for the full cross-cutting reference. Apply at minimum:

- Cache-aside on read-heavy `findById`/`findAll` methods (Redis check → MySQL fallback → cache populate)
- Cursor pagination (`findAllCursor`) on customer-facing lists that may exceed 10K rows
- Idempotency key support on `create` for order/payment-style entities
- `version` optimistic-lock field on concurrent-write entities
- Prisma `select` on every list query — never fetch full rows on a list endpoint

## Critical rules

Never `any`. Never comments in code. Never AJV or Zod on the backend — `class-validator` exclusively. Never offset pagination on customer-facing high-volume endpoints — use cursor. Never execute heavy I/O synchronously in request handlers — dispatch to BullMQ. Always class-based controllers/services with access modifiers. Always `private readonly` for constructor deps. DTOs are always classes with decorators, never plain interfaces. Soft delete via `isActive: false`, never hard delete from the API. UUIDs generated at the application layer with `crypto.randomUUID()` — never `@default(uuid())` in the Prisma schema. Monetary values: `Decimal @db.Decimal(10, 2)` in Prisma, `number` in DTOs/interfaces. List responses include `{ isSuccessful, data, total, page, pageSize }` (admin/offset) or `{ isSuccessful, data, nextCursor, hasMore }` (customer/cursor).
