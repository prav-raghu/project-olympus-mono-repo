import { type CanActivate, type ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { RedisService } from "@project-olympus/cache";
import { MsalTokenValidator } from "../msal/msal-token-validator";
import { type MsalConfig } from "../msal/msal-config.interface";
import { type AzureUser } from "../interfaces/azure-user.interface";

@Injectable()
export class AzureAuthGuard implements CanActivate {
    private readonly validator: MsalTokenValidator;
    private readonly redis = RedisService.getInstance();

    constructor(config: MsalConfig) {
        this.validator = new MsalTokenValidator(config);
    }

    public async canActivate(context: ExecutionContext): Promise<boolean> {
        const http = context.switchToHttp();
        const request = http.getRequest<
            Record<string, unknown> & { headers: Record<string, string | string[] | undefined>; user?: AzureUser }
        >();
        const authHeader = request.headers["authorization"];
        const token = Array.isArray(authHeader) ? authHeader[0] : authHeader;

        if (!token) {
            throw new UnauthorizedException("Authorization header missing");
        }

        try {
            const claims = await this.validator.validate(token);

            const isInvalidated = await this.redis.isSessionInvalidated(claims.oid, claims.iat);
            if (isInvalidated) {
                throw new UnauthorizedException("Session has been signed out — please sign in again");
            }

            request["user"] = {
                id: claims.oid,
                email: claims.preferred_username ?? claims.email ?? "",
                role: claims.roles?.[0] ?? "user",
                permissions: claims.roles ?? [],
                scope: claims.scp ?? "",
                azureOid: claims.oid,
            };

            return true;
        } catch (error) {
            if (error instanceof UnauthorizedException) {
                throw error;
            }
            throw new UnauthorizedException("Invalid or expired token");
        }
    }
}
