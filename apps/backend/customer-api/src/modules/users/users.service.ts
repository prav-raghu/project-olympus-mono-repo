import { Injectable, Inject } from '@nestjs/common';
import { ADMIN_DB } from '@project-olympus/database';
import type { AdminPrismaClient as PrismaClient } from '@project-olympus/database';
import { Logger } from '@project-olympus/logging';

export interface UserFilters {
  genderId?: string;
  minAge?: number;
  maxAge?: number;
  limit?: number;
  offset?: number;
}

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {}

  public async getUsers(
    filters: UserFilters = {},
    loggedInUserId?: string,
  ): Promise<{ isSuccessful: boolean; data: unknown[] }> {
    const where: {
      isActive: boolean;
      id?: { not: string };
      genderId?: string;
      age?: { gte?: number; lte?: number };
    } = { isActive: true };

    if (loggedInUserId) {
      where.id = { not: loggedInUserId };
    }

    if (filters.genderId) {
      where.genderId = filters.genderId;
    }

    if (filters.minAge ?? filters.maxAge) {
      where.age = {};
      if (filters.minAge) where.age.gte = filters.minAge;
      if (filters.maxAge) where.age.lte = filters.maxAge;
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        username: true,
        age: true,
        lastSeen: true,
      },
      take: filters.limit ?? 20,
      skip: filters.offset ?? 0,
      orderBy: [{ lastSeen: 'desc' }],
    });

    return { isSuccessful: true, data: users };
  }

  public async getUserById(userId: string): Promise<{ isSuccessful: boolean; data?: unknown; message?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: { id: true, username: true, age: true, lastSeen: true },
    });

    if (!user) {
      return { isSuccessful: false, message: 'User not found' };
    }

    return { isSuccessful: true, data: user };
  }

  public async getAuthorizedUserById(
    userId: string,
  ): Promise<{ isSuccessful: boolean; data?: unknown; message?: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      select: { id: true, username: true, email: true, roleId: true },
    });

    if (!user) {
      return { isSuccessful: false, message: 'User not found or not authorized' };
    }

    return { isSuccessful: true, data: user };
  }
}
