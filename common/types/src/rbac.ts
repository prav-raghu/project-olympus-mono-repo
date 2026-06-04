import { RoleName } from './roles';
import { Permission } from './permissions';

export const RolePermissions: Record<RoleName, Permission[]> = {
  [RoleName.ADMINISTRATOR]: Object.values(Permission) as Permission[],

  [RoleName.MODERATOR]: [
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.ROLE_READ,
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.BATCH_WRITE,
  ],

  [RoleName.SUPPORT]: [
    Permission.USER_READ,
    Permission.ROLE_READ,
    Permission.REPORT_VIEW,
  ],

  [RoleName.CHAT_USER]: [
    Permission.USER_READ,
  ],
};

export function getPermissionsForRole(role: RoleName): Permission[] {
  return RolePermissions[role] ?? [];
}

export function roleHasPermission(role: RoleName, permission: Permission): boolean {
  return RolePermissions[role]?.includes(permission) ?? false;
}
