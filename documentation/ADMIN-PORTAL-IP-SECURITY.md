# Admin Portal — IP Whitelisting

IP whitelisting for the admin portal is enforced at the NestJS level via a custom guard.

## NestJS IP whitelist guard

Create `src/common/guards/ip-whitelist.guard.ts` in `admin-api`:

```typescript
import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

const ALLOWED_IPS = (process.env.ADMIN_ALLOWED_IPS ?? '').split(',').map((ip) => ip.trim()).filter(Boolean);

@Injectable()
export class IpWhitelistGuard implements CanActivate {
  public canActivate(context: ExecutionContext): boolean {
    if (ALLOWED_IPS.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ ip?: string; headers: Record<string, string> }>();
    const clientIp = request.headers['x-forwarded-for']?.split(',')[0]?.trim() ?? request.ip ?? '';

    if (!ALLOWED_IPS.includes(clientIp)) {
      throw new ForbiddenException('IP not allowed');
    }
    return true;
  }
}
```

Apply globally or per-controller:

```typescript
// Global — in main.ts
app.useGlobalGuards(new IpWhitelistGuard());

// Per-controller
@UseGuards(IpWhitelistGuard)
@Controller('admin/sensitive')
export class SensitiveController {}
```

## Environment variable

```env
# Comma-separated list of allowed IPs (empty = allow all)
ADMIN_ALLOWED_IPS=203.0.113.10,198.51.100.25
```

## Behind a proxy / load balancer

When deployed behind Nginx or a cloud load balancer, NestJS sees the proxy IP in `req.ip`. The guard reads `x-forwarded-for` first to get the real client IP. Ensure `app.set('trust proxy', 1)` or equivalent is configured in your Nginx upstream.

## Angular admin-web

The Angular app is a static SPA — IP protection is enforced at the API layer. Lock the API down tight and the frontend becomes inaccessible without valid MSAL tokens and an allowed IP.
