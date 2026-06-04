# @project-olympus/cache

Redis caching service using ioredis. Unchanged from original stack.

## Usage

```typescript
import { RedisService } from '@project-olympus/cache';

const redis = RedisService.getInstance();

await redis.client.set('key', JSON.stringify(data), 'EX', 900);
const raw = await redis.client.get('key');
```

## Cache-aside pattern (services)

```typescript
public async findById(id: string) {
  const cacheKey = `admin:user:${id}`;
  const cached = await this.redis.client.get(cacheKey);
  if (cached) return JSON.parse(cached) as UserData;

  const user = await this.prisma.user.findUnique({ where: { id } });
  if (user) await this.redis.client.set(cacheKey, JSON.stringify(user), 'EX', 300);
  return user;
}
```

## TTL guidelines

| Entity type | TTL |
| --- | --- |
| Reference / catalog data | 900s (15 min) |
| User profiles | 300s (5 min) |
| Configuration / settings | 1800s (30 min) |
| Transactional data | 60s (1 min) or skip |

## Environment

```env
REDIS_URL=redis://localhost:6379
```
