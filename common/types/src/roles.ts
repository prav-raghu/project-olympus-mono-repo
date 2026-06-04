export const RoleName = {
    CHAT_USER: "Chat User",
    ADMINISTRATOR: "Administrator",
    MODERATOR: "Moderator",
    SUPPORT: "Support",
} as const;

export type RoleName = (typeof RoleName)[keyof typeof RoleName];

export const ADMIN_TIER_ROLES: RoleName[] = [RoleName.ADMINISTRATOR, RoleName.MODERATOR, RoleName.SUPPORT];

export const CUSTOMER_TIER_ROLES: RoleName[] = [RoleName.CHAT_USER];

export type TokenScope = "customer" | "admin";
