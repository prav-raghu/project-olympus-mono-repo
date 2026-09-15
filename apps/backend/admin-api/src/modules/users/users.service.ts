import { Injectable, Inject } from '@nestjs/common';
import { ADMIN_DB } from '@project-olympus/database';
import type { PrismaClient, User } from '@project-olympus/database';
import { EmailService } from '@project-olympus/email';
import { ADMIN_TIER_ROLES } from '@project-olympus/types';
import crypto from 'node:crypto';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(ADMIN_DB) private readonly prisma: PrismaClient,
    private readonly emailService: EmailService,
  ) {}

  // #region User queries

  public async getOnlineUsers(model: {
    page: number;
    pageSize: number;
    searchQuery?: string;
    sortBy?: string;
    sortOrder?: string;
    rolesToFilterBy?: string[];
  }): Promise<unknown> {
    const {
      page,
      pageSize,
      searchQuery,
      sortBy = 'id',
      sortOrder = 'desc',
      rolesToFilterBy,
    } = model;
    const where = {
      roles: {
        name: {
          in: rolesToFilterBy,
        },
      },
      ...(searchQuery && {
        OR: [
          { email: { contains: searchQuery, mode: 'insensitive' as const } },
          { username: { contains: searchQuery, mode: 'insensitive' as const } },
        ],
      }),
    };
    const orderBy = { [sortBy]: sortOrder };
    const [usersRaw, total] = await Promise.all([
      this.prisma.user.findMany({
        where,
        orderBy,
        skip: (page - 1) * pageSize,
        take: pageSize,
        select: {
          id: true,
          username: true,
          email: true,
          avatar: true,
          ipAddress: true,
          createdAt: true,
          lastSeen: true,
          status: { select: { name: true } },
          roles: { select: { name: true } },
        },
      }),
      this.prisma.user.count({ where }),
    ]);
    const users = usersRaw.map((user) => ({
      ...user,
      createdAt: user.createdAt.toISOString(),
      lastSeen: user.lastSeen?.toISOString(),
    }));
    const totalPages = Math.ceil(total / pageSize);
    return {
      users,
      total,
      page,
      pageSize,
      totalPages,
      isSuccessful: true,
      message: 'Users retrieved successfully',
    };
  }

  public async getOnlineUsersCount(): Promise<number> {
    return this.prisma.user.count({
      where: { status: { name: 'Online' } },
    });
  }

  public async getUserProfile(userId: string): Promise<Partial<User> | null> {
    return this.prisma.user.findUnique({
      where: { id: userId, roles: { name: { in: ADMIN_TIER_ROLES as string[] } } },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        genderId: true,
        age: true,
        allowEmailCommunications: true,
        lastSeen: true,
        isActive: true,
        createdAt: true,
        roles: { select: { id: true, name: true } },
        status: { select: { id: true, name: true } },
      },
    });
  }

  public async getAuthorizedUserById(userId: string): Promise<Partial<User> | null> {
    const user = await this.prisma.user.findUnique({
      where: {
        id: userId,
        status: { name: 'Online' },
        roles: { name: { in: ADMIN_TIER_ROLES as string[] } },
      },
      select: {
        id: true,
        username: true,
        email: true,
        roles: { select: { name: true } },
      },
    });
    if (!user) {
      return null;
    }
    return user as Partial<User>;
  }

  public async getUserRoles(): Promise<unknown> {
    const result: { isSuccessful: boolean; message: string; data: { id: string; name: string }[] } =
      { isSuccessful: false, message: '', data: [] };
    const roles = await this.prisma.role.findMany({ orderBy: { name: 'asc' } });
    result.data = roles.map((role) => ({ id: role.id, name: role.name }));
    result.isSuccessful = true;
    result.message = 'Roles retrieved successfully';
    return result;
  }

  public async getUserStatuses(): Promise<unknown> {
    const result: { isSuccessful: boolean; message: string; data: { id: string; name: string }[] } =
      { isSuccessful: false, message: '', data: [] };
    const statuses = await this.prisma.userStatus.findMany({ orderBy: { name: 'asc' } });
    result.data = statuses.map((status) => ({ id: status.id, name: status.name }));
    result.isSuccessful = true;
    result.message = 'Statuses retrieved successfully';
    return result;
  }

  public async getUserStats(): Promise<{ total: number; growth: number }> {
    const now = new Date();
    const oneMonthAgo = new Date(now);
    oneMonthAgo.setMonth(now.getMonth() - 1);
    const twoMonthsAgo = new Date(now);
    twoMonthsAgo.setMonth(now.getMonth() - 2);
    const thisMonth = await this.prisma.user.count({
      where: { createdAt: { gte: oneMonthAgo } },
    });
    const prevMonth = await this.prisma.user.count({
      where: { createdAt: { gte: twoMonthsAgo, lt: oneMonthAgo } },
    });
    const growth = ((thisMonth - prevMonth) / (prevMonth || 1)) * 100;
    return { total: thisMonth, growth: Math.round(growth) };
  }

  public async getUserDetails(userId: string): Promise<unknown | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        genderId: true,
        age: true,
        acceptTermsAndConditions: true,
        allowEmailCommunications: true,
        ipAddress: true,
        lastSeen: true,
        isActive: true,
        userStatusId: true,
        roleId: true,
        createdAt: true,
        updatedAt: true,
        createdBy: true,
        modifiedBy: true,
        status: true,
        roles: true,
      },
    });
    if (!user) {
      return null;
    }
    const ipAddresses = await this.prisma.user.findMany({
      where: { id: userId },
      select: { ipAddress: true },
      distinct: ['ipAddress'],
    });
    return {
      ...user,
      ipAddresses: ipAddresses.map((ip) => ip.ipAddress),
    };
  }

  // #endregion

  // #region Availability checks

  public async isEmailAvailable(email: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { email } });
    return !user;
  }

  public async isUsernameAvailable(username: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { username } });
    return !user;
  }

  // #endregion

  // #region User mutations

  public async onboardUser(model: CreateUserDto): Promise<unknown> {
    const result: { isSuccessful: boolean; message: string; data: null } = {
      isSuccessful: false,
      message: '',
      data: null,
    };
    const existingUser = await this.prisma.user.findFirst({
      where: { OR: [{ username: model.username }, { email: model.email }] },
    });
    if (existingUser) {
      result.message =
        existingUser.username === model.username
          ? 'Username already exists'
          : 'Email already exists';
      return result;
    }
    const user = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        username: model.username,
        email: model.email,
        roleId: model.roleId,
        genderId: model.gender,
        age: model.age,
        acceptTermsAndConditions: model.acceptTermsAndConditions,
        allowEmailCommunications: model.allowEmailCommunications,
        createdAt: new Date(),
        ipAddress: '',
        userStatusId: model.userStatusId,
      },
    });
    if (!user) {
      result.message = 'Failed to onboard user';
      return result;
    }
    const role = await this.prisma.role.findUnique({ where: { id: user.roleId } });
    if (!role) {
      result.message = 'User role not found';
      return result;
    }
    await this.emailService.sendWelcome(user.email, user.username);
    result.isSuccessful = true;
    result.message = 'User onboarded successfully';
    return result;
  }

  public async updateProfile(
    userId: string,
    data: UpdateUserDto,
  ): Promise<{ isSuccessful: boolean; message: string; data?: Partial<User> }> {
    const result = {
      isSuccessful: false,
      message: '',
      data: undefined as Partial<User> | undefined,
    };
    const existingUser = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!existingUser) {
      result.message = 'User not found';
      return result;
    }
    if (data.username && data.username !== existingUser.username) {
      const usernameExists = await this.prisma.user.findUnique({
        where: { username: data.username },
      });
      if (usernameExists) {
        result.message = 'Username already taken';
        return result;
      }
    }
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await this.prisma.user.findUnique({ where: { email: data.email } });
      if (emailExists) {
        result.message = 'Email already taken';
        return result;
      }
    }
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(data.username && { username: data.username }),
        ...(data.email && { email: data.email }),
        ...(data.avatar !== undefined && { avatar: data.avatar }),
        updatedAt: new Date(),
      },
      select: { id: true, username: true, email: true, avatar: true },
    });
    result.isSuccessful = true;
    result.message = 'Profile updated successfully';
    result.data = updatedUser;
    return result;
  }

  // #endregion
}
