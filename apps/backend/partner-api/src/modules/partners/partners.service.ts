import { Injectable, Inject } from '@nestjs/common';
import { ADMIN_DB } from '@project-olympus/database';
import type { PrismaClient } from '@project-olympus/database';
import { Logger } from '@project-olympus/logging';
import type { IPartner, PartnerStatus } from './interfaces/partner.interface';
import type { CreatePartnerDto } from './dto/create-partner.dto';
import type { UpdatePartnerDto } from './dto/update-partner.dto';

interface PartnerListResult {
  isSuccessful: boolean;
  data: IPartner[];
  total: number;
  page: number;
  pageSize: number;
}

interface PartnerResult {
  isSuccessful: boolean;
  data?: IPartner;
  message?: string;
}

const PARTNER_SELECT = {
  id: true,
  username: true,
  email: true,
  isActive: true,
  azureOid: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
  modifiedBy: true,
} as const;

type PartnerRecord = {
  id: string;
  username: string;
  email: string;
  isActive: boolean;
  azureOid: string | null;
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
  modifiedBy: string;
};

function toPartnerStatus(isActive: boolean): PartnerStatus {
  return isActive ? 'active' : 'suspended';
}

function toPartner(record: PartnerRecord): IPartner {
  return {
    id: record.id,
    name: record.username,
    email: record.email,
    contactName: null,
    phone: null,
    website: null,
    status: toPartnerStatus(record.isActive),
    isActive: record.isActive,
    azureOid: record.azureOid,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
    createdBy: record.createdBy,
    modifiedBy: record.modifiedBy,
  };
}

@Injectable()
export class PartnersService {
  private readonly logger = new Logger(PartnersService.name);

  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {}

  // #region Queries

  public async findAll(page = 1, pageSize = 20, search?: string): Promise<PartnerListResult> {
    const skip = (page - 1) * pageSize;
    const where = {
      isActive: true,
      ...(search && {
        OR: [
          { username: { contains: search } },
          { email: { contains: search } },
        ],
      }),
    };

    const [items, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        select: PARTNER_SELECT,
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
        skip,
        take: pageSize,
      }),
      this.prisma.user.count({ where }),
    ]);

    return { isSuccessful: true, data: items.map(toPartner), total, page, pageSize };
  }

  public async findById(id: string): Promise<PartnerResult> {
    const item = await this.prisma.user.findUnique({
      where: { id, isActive: true },
      select: PARTNER_SELECT,
    });
    if (!item) return { isSuccessful: false, message: 'Partner not found' };
    return { isSuccessful: true, data: toPartner(item) };
  }

  // #endregion

  // #region Mutations

  public async create(dto: CreatePartnerDto, userId: string): Promise<PartnerResult> {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) return { isSuccessful: false, message: 'A partner with this email already exists' };

    const item = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: dto.email,
        username: dto.name.toLowerCase().replace(/\s+/g, '-'),
        password: '',
        ipAddress: '',
        roleId: '',
        userStatusId: '',
        createdBy: userId,
        modifiedBy: userId,
      },
      select: PARTNER_SELECT,
    });

    this.logger.info('Partner created', { id: item.id, email: item.email });
    return { isSuccessful: true, data: toPartner(item) };
  }

  public async update(id: string, dto: UpdatePartnerDto, userId: string): Promise<PartnerResult> {
    const existing = await this.prisma.user.findUnique({ where: { id, isActive: true } });
    if (!existing) return { isSuccessful: false, message: 'Partner not found' };

    if (dto.email && dto.email !== existing.email) {
      const emailTaken = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (emailTaken) return { isSuccessful: false, message: 'Email already in use' };
    }

    const item = await this.prisma.user.update({
      where: { id },
      data: { ...(dto.email && { email: dto.email }), modifiedBy: userId },
      select: PARTNER_SELECT,
    });

    return { isSuccessful: true, data: toPartner(item) };
  }

  public async softDelete(id: string, userId: string): Promise<{ isSuccessful: boolean; message?: string }> {
    const existing = await this.prisma.user.findUnique({ where: { id, isActive: true } });
    if (!existing) return { isSuccessful: false, message: 'Partner not found' };

    await this.prisma.user.update({
      where: { id },
      data: { isActive: false, modifiedBy: userId },
    });

    this.logger.info('Partner deactivated', { id });
    return { isSuccessful: true, message: 'Partner deactivated successfully' };
  }

  // #endregion
}
