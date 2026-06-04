export interface IUser {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  genderId?: string | null;
  age?: number | null;
  isActive: boolean;
  twoFactorEnabled: boolean;
  azureOid?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IUserStats {
  total: number;
  growth: number;
}

export interface IUserListItem {
  id: string;
  username: string;
  email: string;
  avatar?: string | null;
  ipAddress: string;
  createdAt: string;
  lastSeen?: string;
  status: { name: string };
  roles: { name: string };
}
