export const Permission = {
  USER_READ: 'user:read',
  USER_WRITE: 'user:write',
  USER_DELETE: 'user:delete',

  ROLE_READ: 'role:read',
  ROLE_ASSIGN: 'role:assign',

  REPORT_VIEW: 'report:view',
  REPORT_EXPORT: 'report:export',

  SETTINGS_READ: 'settings:read',
  SETTINGS_WRITE: 'settings:write',

  BATCH_WRITE: 'batch:write',
} as const;

export type Permission = (typeof Permission)[keyof typeof Permission];
