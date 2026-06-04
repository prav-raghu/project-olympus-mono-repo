---
name: API Builder Agent
description: >
  Use when creating REST API endpoints for a domain — NestJS modules, controllers, services, DTOs,
  and interfaces from an existing Prisma model. Also use when asked to generate CRUD endpoints, add
  new API routes, or build backend logic for a feature. Reads the Prisma schema to understand
  models and generates all backend layers following exact project patterns.
tools:
  - read
  - edit
  - search
  - execute
user-invocable: false
---

# API Builder Agent

## Target Services

| Service | Path | Purpose |
|---|---|---|
| customer-api | `apps/backend/customer-api/src/` | Customer-facing endpoints |
| admin-api | `apps/backend/admin-api/src/` | Admin management endpoints |

## File Generation Order

For each domain entity, create files in this order:

### 1. Interface (`modules/[domain]/interfaces/[domain].interface.ts`)

```typescript
export interface IDomain {
  id: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
```

### 2. DTOs (`modules/[domain]/dto/`)

```typescript
// create-[domain].dto.ts
import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDomainDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(200)
  name: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}
```

```typescript
// update-[domain].dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateDomainDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;
}
```

### 3. Service (`modules/[domain]/[domain].service.ts`)

```typescript
import { Injectable, Inject } from '@nestjs/common';
import { Logger } from '@project-olympus/logging';
import { ADMIN_DB } from '@project-olympus/database';
import type { PrismaClient } from '@prisma/client/admin';
import type { ResponseDto, ListResponseDto } from '@project-olympus/types';
import type { CreateDomainDto } from './dto/create-domain.dto';
import type { UpdateDomainDto } from './dto/update-domain.dto';
import type { IDomain } from './interfaces/domain.interface';

@Injectable()
export class DomainService {
  private readonly logger = new Logger(DomainService.name);

  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {}

  public async findAll(page = 1, pageSize = 20): Promise<ListResponseDto<IDomain>> {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.domain.findMany({
        where: { isActive: true },
        select: { id: true, name: true, createdAt: true },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.domain.count({ where: { isActive: true } }),
    ]);
    return { isSuccessful: true, data: items as IDomain[], total, page, pageSize };
  }

  public async findById(id: string): Promise<ResponseDto<IDomain>> {
    const item = await this.prisma.domain.findUnique({
      where: { id, isActive: true },
    });
    if (!item) return { isSuccessful: false, message: 'Not found' };
    return { isSuccessful: true, data: item as IDomain };
  }

  public async create(dto: CreateDomainDto, userId: string): Promise<ResponseDto<IDomain>> {
    const item = await this.prisma.domain.create({
      data: { id: crypto.randomUUID(), ...dto, createdBy: userId, modifiedBy: userId },
    });
    return { isSuccessful: true, data: item as IDomain };
  }

  public async update(id: string, dto: UpdateDomainDto, userId: string): Promise<ResponseDto<IDomain>> {
    const existing = await this.prisma.domain.findUnique({ where: { id, isActive: true } });
    if (!existing) return { isSuccessful: false, message: 'Not found' };
    const item = await this.prisma.domain.update({
      where: { id },
      data: { ...dto, modifiedBy: userId },
    });
    return { isSuccessful: true, data: item as IDomain };
  }

  public async softDelete(id: string, userId: string): Promise<ResponseDto<never>> {
    const existing = await this.prisma.domain.findUnique({ where: { id, isActive: true } });
    if (!existing) return { isSuccessful: false, message: 'Not found' };
    await this.prisma.domain.update({
      where: { id },
      data: { isActive: false, modifiedBy: userId },
    });
    return { isSuccessful: true, message: 'Deleted successfully' };
  }
}
```

### 4. Controller (`modules/[domain]/[domain].controller.ts`)

```typescript
import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { DomainService } from './domain.service';
import { CreateDomainDto } from './dto/create-domain.dto';
import { UpdateDomainDto } from './dto/update-domain.dto';
import { AzureAuthGuard } from '../auth/guards/azure-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AzureUser } from '@project-olympus/auth';

@ApiTags('Domain')
@ApiBearerAuth()
@UseGuards(AzureAuthGuard)
@Controller('domain')
export class DomainController {
  constructor(private readonly domainService: DomainService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List' })
  public async findAll(@Query('page') page?: string, @Query('pageSize') pageSize?: string) {
    return this.domainService.findAll(Number(page ?? 1), Number(pageSize ?? 20));
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get by ID' })
  public async findById(@Param('id') id: string) {
    return this.domainService.findById(id);
  }

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create' })
  public async create(@Body() dto: CreateDomainDto, @CurrentUser() user: AzureUser) {
    return this.domainService.create(dto, user.id);
  }

  @Put(':id')
  @Version('1')
  @ApiOperation({ summary: 'Update' })
  public async update(@Param('id') id: string, @Body() dto: UpdateDomainDto, @CurrentUser() user: AzureUser) {
    return this.domainService.update(id, dto, user.id);
  }

  @Delete(':id')
  @Version('1')
  @ApiOperation({ summary: 'Delete' })
  public async remove(@Param('id') id: string, @CurrentUser() user: AzureUser) {
    return this.domainService.softDelete(id, user.id);
  }
}
```

### 5. Module (`modules/[domain]/[domain].module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { DomainController } from './domain.controller';
import { DomainService } from './domain.service';

@Module({
  controllers: [DomainController],
  providers: [DomainService],
  exports: [DomainService],
})
export class DomainModule {}
```

### 6. Wire into AppModule

Import `DomainModule` in `src/app.module.ts`.

## Critical Rules

- Never use AJV — `class-validator` only
- DTOs are always classes with decorators — never plain interfaces
- Soft delete via `isActive: false` — never hard delete
- UUIDs generated at app layer: `crypto.randomUUID()`
- All monetary values use `Decimal` in Prisma, `number` in DTOs
- List responses include `{ isSuccessful, data, total, page, pageSize }`
- Always use Prisma `select` on list queries
