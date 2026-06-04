export interface IPartner {
  id: string;
  name: string;
  email: string;
  contactName?: string | null;
  phone?: string | null;
  website?: string | null;
  status: PartnerStatus;
  isActive: boolean;
  azureOid?: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  modifiedBy: string;
}

export type PartnerStatus = 'pending' | 'active' | 'suspended' | 'terminated';
