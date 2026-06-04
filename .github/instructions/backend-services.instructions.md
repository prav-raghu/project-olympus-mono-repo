---
applyTo: "apps/backend/**/modules/**"
description: "NestJS backend service conventions — DI, class-validator DTOs, MSAL auth, logging, and CRUD patterns"
---

When creating or editing backend NestJS service classes:

- `@Injectable()` on every service — injected via constructor DI, never instantiated directly
- Logger: `private readonly logger = new Logger(ClassName.name)` (from `@project-olympus/logging`)
- Public methods for business operations, private for internal helpers
- Constructor uses `@Inject(ADMIN_DB)` / `@Inject(CUSTOMER_DB)` etc. for Prisma clients
- Soft delete pattern: set `isActive: false`, never hard delete
- UUIDs generated at app layer: `crypto.randomUUID()`

Paginated list methods return:
- Admin: `{ isSuccessful, data, total, page, pageSize }` (offset pagination)
- Customer-facing: `{ isSuccessful, data, nextCursor, hasMore }` (cursor pagination)

Use `Promise.all` for parallel count + find queries on admin lists.

Enterprise scale requirements:
- **Cache-aside**: Read-heavy methods MUST check Redis before MySQL, cache on miss, invalidate on write
- **Select fields**: List queries MUST use Prisma `select` — never fetch entire rows on lists
- **Cursor pagination**: Customer-facing lists MUST use cursor-based pagination
- **Idempotency**: Create methods MUST accept optional `idempotencyKey`, check for duplicates before insert
- **Optimistic locking**: Entities with concurrent write risk use `version` field
- **Queue offload**: Heavy I/O (email, PDF, webhooks, image processing) dispatched to BullMQ — never in request handler
- **Graceful error handling**: Service methods return `ResponseDto` — never throw for expected business errors

Pattern:
```typescript
@Injectable()
export class EntityService {
  private readonly logger = new Logger(EntityService.name);

  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {}

  public async create(dto: CreateDto, userId: string): Promise<ResponseDto<IEntity>> { ... }
  public async findById(id: string): Promise<ResponseDto<IEntity>> { ... }
  public async findAll(page: number, pageSize: number): Promise<ListResponseDto<IEntity>> { ... }
  public async update(id: string, dto: UpdateDto, userId: string): Promise<ResponseDto<IEntity>> { ... }
  public async softDelete(id: string, userId: string): Promise<ResponseDto<never>> { ... }
}
```
