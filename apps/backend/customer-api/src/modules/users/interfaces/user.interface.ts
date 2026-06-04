export interface IUser {
  id: string;
  email: string;
  displayName?: string | null;
  azureOid?: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
