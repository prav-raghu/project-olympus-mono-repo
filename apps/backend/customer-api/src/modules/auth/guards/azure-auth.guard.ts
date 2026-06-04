import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { MsalTokenValidator } from '@project-olympus/auth';

@Injectable()
export class AzureAuthGuard implements CanActivate {
  private readonly validator: MsalTokenValidator;

  constructor() {
    this.validator = new MsalTokenValidator({
      tenantId: process.env.AZURE_TENANT_ID ?? '',
      clientId: process.env.AZURE_CLIENT_ID ?? '',
      audience: process.env.AZURE_API_AUDIENCE ?? '',
      authority:
        process.env.AZURE_AUTHORITY ??
        `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}`,
    });
  }

  public async canActivate(context: ExecutionContext): Promise<boolean> {
    const http = context.switchToHttp();
    const request = http.getRequest<Record<string, unknown> & { headers: Record<string, string | string[] | undefined> }>();
    const authHeader = request.headers['authorization'];
    const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;

    if (!token) {
      throw new UnauthorizedException('Authorization header missing');
    }

    try {
      const claims = await this.validator.validate(token);
      request['user'] = {
        id: claims.oid,
        email: claims.preferred_username ?? claims.email ?? '',
        role: claims.roles?.[0] ?? 'user',
        permissions: claims.roles ?? [],
        scope: claims.scp ?? '',
        azureOid: claims.oid,
      };
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
