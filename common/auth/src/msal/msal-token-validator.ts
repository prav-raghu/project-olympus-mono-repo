import jwt from 'jsonwebtoken';
import jwksRsa, { type JwksClient } from 'jwks-rsa';
import { type MsalConfig } from './msal-config.interface';
import { type MsalTokenClaims } from '../interfaces/azure-user.interface';

export class MsalTokenValidator {
    private readonly jwksClient: JwksClient;
    private readonly config: MsalConfig;

    constructor(config: MsalConfig) {
        this.config = config;
        this.jwksClient = jwksRsa({
            jwksUri: `${config.authority}/discovery/v2.0/keys`,
            cache: true,
            cacheMaxEntries: 5,
            cacheMaxAge: 600_000,
            rateLimit: true,
        });
    }

    public async validate(bearerToken: string): Promise<MsalTokenClaims> {
        const token = bearerToken.startsWith('Bearer ') ? bearerToken.slice(7) : bearerToken;

        const decoded = jwt.decode(token, { complete: true });
        if (!decoded || typeof decoded === 'string' || !decoded.header.kid) {
            throw new Error('Invalid token format');
        }

        const signingKey = await this.jwksClient.getSigningKey(decoded.header.kid);
        const publicKey = signingKey.getPublicKey();

        const audience = Array.isArray(this.config.audience) ? this.config.audience : [this.config.audience];

        const claims = jwt.verify(token, publicKey, {
            algorithms: ['RS256'],
            audience: audience as [string, ...string[]],
            issuer: [
                `https://login.microsoftonline.com/${this.config.tenantId}/v2.0`,
                `https://sts.windows.net/${this.config.tenantId}/`,
            ],
        }) as unknown as MsalTokenClaims;

        return claims;
    }
}
