import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { ADMIN_DB } from '@project-olympus/database';
import type { PrismaClient } from '@project-olympus/database';
import { RedisService } from '@project-olympus/cache';
import { RoleName } from '@project-olympus/types';
import crypto from 'node:crypto';
import { EnvConfig } from '../../config/env.config';

const BOOTSTRAP_LOCK_ID = 'singleton';
const BOOTSTRAP_USER_STATUS = 'Verified';

@Injectable()
export class AuthService {
  private readonly redis = RedisService.getInstance();

  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {}

  public async logoutAllSessions(userId: string): Promise<void> {
    await this.redis.invalidateAllSessions(userId);
  }

  // #region Admin bootstrap (first-run only)

  public async bootstrapAdmin(azureOid: string, email: string): Promise<void> {
    if (!EnvConfig.get('ADMIN_BOOTSTRAP_ENABLED')) {
      throw new ForbiddenException('Admin bootstrap is disabled');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.systemBootstrap.upsert({
        where: { id: BOOTSTRAP_LOCK_ID },
        create: { id: BOOTSTRAP_LOCK_ID },
        update: {},
      });

      const lockResult = await tx.systemBootstrap.updateMany({
        where: { id: BOOTSTRAP_LOCK_ID, adminBootstrapped: false },
        data: {
          adminBootstrapped: true,
          bootstrappedAt: new Date(),
          bootstrappedByAzureObjectId: azureOid,
        },
      });
      if (lockResult.count === 0) {
        throw new ForbiddenException('Admin bootstrap has already been completed');
      }

      const administratorRole = await tx.role.findUnique({
        where: { name: RoleName.ADMINISTRATOR },
      });
      if (!administratorRole) {
        throw new Error(
          `"${RoleName.ADMINISTRATOR}" role is not seeded — run the database seed before bootstrapping`,
        );
      }

      const verifiedStatus = await tx.userStatus.findUnique({
        where: { name: BOOTSTRAP_USER_STATUS },
      });
      if (!verifiedStatus) {
        throw new Error(
          `"${BOOTSTRAP_USER_STATUS}" user status is not seeded — run the database seed before bootstrapping`,
        );
      }

      const existingUser = await tx.user.findUnique({ where: { azureOid } });
      if (existingUser) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: { roleId: administratorRole.id, modifiedBy: existingUser.id },
        });
        return;
      }

      await tx.user.create({
        data: {
          id: crypto.randomUUID(),
          username: email.split('@')[0] ?? email,
          email,
          ipAddress: '',
          userStatusId: verifiedStatus.id,
          roleId: administratorRole.id,
          azureOid,
          createdBy: 'SYSTEM',
          modifiedBy: 'SYSTEM',
        },
      });
    });
  }

  // #endregion
}
