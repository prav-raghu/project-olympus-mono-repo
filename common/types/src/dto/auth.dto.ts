export interface AzureAuthenticatedUser {
    id: string;
    email: string;
    role: string;
    permissions: string[];
    scope: string;
    azureOid: string;
}

export interface LoginResponse {
    token: string;
}

export interface AuthState {
    user: AzureAuthenticatedUser | null;
    isLoading: boolean;
    isAuthenticated: boolean;
}

export interface AuthError {
    message: string;
    code?: string;
    details?: Record<string, unknown>;
}
