import { Injectable, Inject } from '@nestjs/common';
import { ADMIN_DB } from '@project-olympus/database';
import type { PrismaClient, User } from '@project-olympus/database';
import type { EmailService } from '@project-olympus/email/dist/services/email.service';
import { ADMIN_TIER_ROLES } from '@project-olympus/types';
import { compare, hash } from 'bcrypt';
import crypto from 'node:crypto';
import { generateSecret, generateURI, verify as verifyOtp } from 'otplib';
import { EnvConfig } from '../../config/env.config';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @Inject(ADMIN_DB) private readonly prisma: PrismaClient,
    private readonly emailService: EmailService,
  ) {}

  // #region Encryption helpers

  private encryptTotpSecret(plaintext: string): string {
    const key = Buffer.from(EnvConfig.get('TWO_FACTOR_ENCRYPTION_KEY') ?? '', 'hex');
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`;
  }

  private decryptTotpSecret(encrypted: string): string {
    const [ivHex, authTagHex, ciphertextHex] = encrypted.split(':');
    const key = Buffer.from(EnvConfig.get('TWO_FACTOR_ENCRYPTION_KEY') ?? '', 'hex');
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const ciphertext = Buffer.from(ciphertextHex, 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8');
  }

  // #endregion

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
        twoFactorEnabled: true,
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
        twoFactorEnabled: true,
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
    const authHash = crypto.randomUUID();
    const authHashExpiration = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const user = await this.prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        username: model.username,
        email: model.email,
        password: await hash(model.password, 10),
        roleId: model.roleId,
        genderId: model.gender,
        age: model.age,
        acceptTermsAndConditions: model.acceptTermsAndConditions,
        allowEmailCommunications: model.allowEmailCommunications,
        createdAt: new Date(),
        ipAddress: '',
        userStatusId: model.userStatusId,
        authHash,
        authHashExpiration,
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
    await this.emailService.sendMail(
      user.email,
      `Admin Onboarding`,
      'admin-onboarding-notification',
      {
        username: user.username,
        dateLoggedIn: new Date().toLocaleString(),
        verificationLink: `${EnvConfig.get('ADMIN_WEB_URL') ?? 'http://localhost:4200'}/verify-email?auth_hash=${authHash}`,
      },
    );
    result.isSuccessful = true;
    result.message = 'User onboarded successfully';
    return result;
  }

  public async resendVerificationEmail(model: { email: string }): Promise<unknown> {
    const result: { isSuccessful: boolean; message: string; data: null } = {
      isSuccessful: false,
      message: '',
      data: null,
    };
    const user = await this.prisma.user.findUnique({
      where: { email: model.email },
      include: { status: true },
    });
    if (!user) {
      result.message = 'User not found';
      return result;
    }
    if (user.status.name !== 'Pending Verification') {
      result.message = 'You cannot resend verification email for this user';
      return result;
    }
    const authHash = crypto.randomUUID();
    const authHashExpiration = new Date(Date.now() + 2 * 60 * 60 * 1000);
    await this.prisma.user.update({
      where: { id: user.id },
      data: { authHash, authHashExpiration },
    });
    await this.emailService.sendMail(
      user.email,
      `Admin Onboarding`,
      'admin-onboarding-notification',
      {
        username: user.username,
        dateLoggedIn: new Date().toLocaleString(),
        verificationLink: `${EnvConfig.get('ADMIN_WEB_URL') ?? 'http://localhost:4200'}/verify-email?auth_hash=${authHash}`,
      },
    );
    result.isSuccessful = true;
    result.message = 'Verification email resent successfully';
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

  public async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ isSuccessful: boolean; message: string }> {
    const result = { isSuccessful: false, message: '' };
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      result.message = 'User not found';
      return result;
    }
    const isPasswordValid = await compare(currentPassword, user.password ?? '');
    if (!isPasswordValid) {
      result.message = 'Current password is incorrect';
      return result;
    }
    const hashedPassword = await hash(newPassword, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { password: hashedPassword, updatedAt: new Date() },
    });
    result.isSuccessful = true;
    result.message = 'Password changed successfully';
    return result;
  }

  // #endregion

  // #region 2FA

  public async setup2FA(
    userId: string,
  ): Promise<{ isSuccessful: boolean; message: string; data?: { secret: string; qrCode: string } }> {
    const result: {
      isSuccessful: boolean;
      message: string;
      data?: { secret: string; qrCode: string };
    } = { isSuccessful: false, message: '' };
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      result.message = 'User not found';
      return result;
    }
    const { toDataURL } = await import('qrcode');
    const secret = generateSecret();
    const otpauthUrl = generateURI({ label: user.email, secret, issuer: 'Admin' });
    const qrCode = await toDataURL(otpauthUrl);
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorSecret: this.encryptTotpSecret(secret) },
    });
    result.isSuccessful = true;
    result.message = '2FA setup initiated';
    result.data = { secret, qrCode };
    return result;
  }

  public async verify2FA(
    userId: string,
    token: string,
  ): Promise<{ isSuccessful: boolean; message: string }> {
    const result = { isSuccessful: false, message: '' };
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      result.message = 'User not found or 2FA not set up';
      return result;
    }
    const isValid = await verifyOtp({ token, secret: this.decryptTotpSecret(user.twoFactorSecret) });
    if (!isValid) {
      result.message = 'Invalid verification code';
      return result;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, updatedAt: new Date() },
    });
    result.isSuccessful = true;
    result.message = '2FA enabled successfully';
    return result;
  }

  public async disable2FA(
    userId: string,
    token: string,
  ): Promise<{ isSuccessful: boolean; message: string }> {
    const result = { isSuccessful: false, message: '' };
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorEnabled || !user.twoFactorSecret) {
      result.message = 'User not found or 2FA not enabled';
      return result;
    }
    const isValid = await verifyOtp({ token, secret: this.decryptTotpSecret(user.twoFactorSecret) });
    if (!isValid) {
      result.message = 'Invalid verification code';
      return result;
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, updatedAt: new Date() },
    });
    result.isSuccessful = true;
    result.message = '2FA disabled successfully';
    return result;
  }

  // #endregion
}
