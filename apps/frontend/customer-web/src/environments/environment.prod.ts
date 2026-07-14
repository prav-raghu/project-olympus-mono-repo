interface RuntimeEnv {
    apiBaseUrl?: string;
    azureClientId?: string;
    azureAuthority?: string;
    azureRedirectUri?: string;
}

declare global {
    interface Window {
        __env?: RuntimeEnv;
    }
}

const runtimeEnv = window.__env ?? {};

export const environment = {
    production: true,
    apiBaseUrl: runtimeEnv.apiBaseUrl ?? "/api/v1",
    msalConfig: {
        auth: {
            clientId: runtimeEnv.azureClientId ?? "",
            authority: runtimeEnv.azureAuthority ?? "",
            redirectUri: runtimeEnv.azureRedirectUri ?? "/",
        },
    },
    apiScopes: [] as string[],
};
