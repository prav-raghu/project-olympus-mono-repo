export interface AzureUser {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    scope: string;
    azureOid: string;
}

export interface MsalTokenClaims {
    oid: string;
    preferred_username?: string;
    email?: string;
    roles?: string[];
    scp?: string;
    sub: string;
    iss: string;
    aud: string | string[];
    exp: number;
    iat: number;
}
