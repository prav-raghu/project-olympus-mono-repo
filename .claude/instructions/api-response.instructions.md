---
applyTo: "apps/backend/**/modules/**,common/types/**"
description: "Standardized API response envelope — all NestJS services return {isSuccessful, message, data}"
---

All backend services MUST return responses using the standard envelope from `@project-olympus/types`. The global `ResponseTransformInterceptor` wraps controller return values automatically, but service methods must still return the correct shape.

## Response envelope shape

```typescript
interface ResponseDto<T = undefined> {
  isSuccessful: boolean;
  message?: string;
  data?: T;
  dateTimeStamp?: Date;
}

interface ListResponseDto<T> {
  isSuccessful: boolean;
  message?: string;
  data: T[];
  total: number;
  page: number;
  pageSize: number;
}

interface CursorResponseDto<T> {
  isSuccessful: boolean;
  message?: string;
  data: T[];
  nextCursor?: string;
  hasMore: boolean;
}
```

## Rules

- NEVER embed the entity directly at the root — always put it inside `data`
- NEVER return `{ isSuccessful: true, product: {...} }` — return `{ isSuccessful: true, data: {...} }`
- `message` is for human-readable context (errors, confirmations) — not for machine logic
- `data` is `undefined` on failure responses — never `null`

## Service return pattern (NestJS)

```typescript
@Injectable()
export class UsersService {
  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {}

  public async findById(id: string): Promise<ResponseDto<IUser>> {
    const user = await this.prisma.user.findUnique({
      where: { id, isActive: true },
      select: { id: true, email: true, azureOid: true, createdAt: true },
    });
    if (!user) return { isSuccessful: false, message: 'User not found' };
    return { isSuccessful: true, data: user as IUser };
  }

  public async create(dto: CreateUserDto, userId: string): Promise<ResponseDto<IUser>> {
    const user = await this.prisma.user.create({
      data: { id: crypto.randomUUID(), ...dto, createdBy: userId, modifiedBy: userId },
    });
    return { isSuccessful: true, data: user as IUser, dateTimeStamp: new Date() };
  }

  public async findAll(page: number, pageSize: number): Promise<ListResponseDto<IUser>> {
    const skip = (page - 1) * pageSize;
    const [items, total] = await Promise.all([
      this.prisma.user.findMany({ where: { isActive: true }, skip, take: pageSize, select: { /* ... */ } }),
      this.prisma.user.count({ where: { isActive: true } }),
    ]);
    return { isSuccessful: true, data: items as IUser[], total, page, pageSize };
  }

  public async findAllCursor(cursor: string | undefined, take: number): Promise<CursorResponseDto<IUser>> {
    const cursorOption = cursor ? { cursor: { id: cursor }, skip: 1 } : {};
    const items = await this.prisma.user.findMany({
      where: { isActive: true },
      ...cursorOption,
      take: take + 1,
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      select: { /* ... */ },
    });
    const hasMore = items.length > take;
    const results = hasMore ? items.slice(0, take) : items;
    return { isSuccessful: true, data: results as IUser[], nextCursor: hasMore ? results[results.length - 1].id : undefined, hasMore };
  }

  public async softDelete(id: string, userId: string): Promise<ResponseDto<never>> {
    await this.prisma.user.update({ where: { id }, data: { isActive: false, modifiedBy: userId } });
    return { isSuccessful: true, message: 'Deleted successfully' };
  }
}
```

## Controller pattern (NestJS)

Controllers return service results directly — the global `ResponseTransformInterceptor` adds the timestamp wrapper. For not-found cases, throw `NotFoundException` in the controller after checking `isSuccessful`:

```typescript
@Get(':id')
@Version('1')
@ApiOperation({ summary: 'Get user by ID' })
public async findById(@Param('id') id: string) {
  const result = await this.usersService.findById(id);
  if (!result.isSuccessful) throw new NotFoundException(result.message);
  return result;
}

@Post()
@Version('1')
@HttpCode(201)
@ApiOperation({ summary: 'Create user' })
public async create(@Body() dto: CreateUserDto, @CurrentUser() user: AzureUser) {
  return this.usersService.create(dto, user.id);
}
```

## Angular frontend consumption pattern

```typescript
this.api.get<ResponseDto<IUser>>('/users/123').subscribe({
  next: (result) => {
    if (!result.isSuccessful) {
      this.error.set(result.message ?? 'Something went wrong');
      return;
    }
    this.user.set(result.data!);
  },
  error: () => this.error.set('Something went wrong'),
});
```

## NEVER do this

```typescript
return { isSuccessful: true, user: userData };
return { isSuccessful: true, users: [], total: 0 };
return { success: true, data: userData };
return userData;
```
