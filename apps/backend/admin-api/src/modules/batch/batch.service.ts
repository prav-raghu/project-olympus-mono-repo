import crypto from 'node:crypto';
import { Injectable, Inject } from '@nestjs/common';
import { ADMIN_DB } from '@project-olympus/database';
import type { PrismaClient } from '@project-olympus/database';
import {
  type BatchOperation,
  type BatchOperationResult,
  type BatchOperationSummary,
  BatchOperationType,
} from '@project-olympus/types';

@Injectable()
export class BatchService {
  constructor(@Inject(ADMIN_DB) private readonly prisma: PrismaClient) {}

  // #region Core batch executor

  public async executeBatch<T = unknown, R = unknown>(
    operation: BatchOperation<T>,
    executor: (item: T) => Promise<R>,
  ): Promise<BatchOperationSummary> {
    const maxBatchSize = operation.options?.maxBatchSize || 1000;
    if (operation.items.length > maxBatchSize) {
      throw new Error(`Batch size exceeds maximum allowed (${maxBatchSize})`);
    }
    const results: BatchOperationResult[] = [];
    let successful = 0;
    let failed = 0;
    if (operation.options?.validateBeforeExecute) {
      await this.validateBatch(operation);
    }
    for (const item of operation.items) {
      try {
        const result = await executor(item.data);
        results.push({ id: item.id, success: true, data: result });
        successful++;
      } catch (error) {
        results.push({
          id: item.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
        failed++;
        if (!operation.options?.continueOnError) {
          break;
        }
      }
    }
    return { total: operation.items.length, successful, failed, results };
  }

  public async executeBatchWithTransaction<T = unknown, R = unknown>(
    operation: BatchOperation<T>,
    executor: (item: T, tx: PrismaClient) => Promise<R>,
  ): Promise<BatchOperationSummary> {
    const maxBatchSize = operation.options?.maxBatchSize || 1000;
    if (operation.items.length > maxBatchSize) {
      throw new Error(`Batch size exceeds maximum allowed (${maxBatchSize})`);
    }
    if (operation.options?.validateBeforeExecute) {
      await this.validateBatch(operation);
    }
    try {
      const results = await this.prisma.$transaction(async (tx) => {
        const batchResults: BatchOperationResult[] = [];
        let successful = 0;
        let failed = 0;
        for (const item of operation.items) {
          try {
            const result = await executor(item.data, tx as PrismaClient);
            batchResults.push({ id: item.id, success: true, data: result });
            successful++;
          } catch (error) {
            batchResults.push({
              id: item.id,
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            });
            failed++;
            if (!operation.options?.continueOnError) {
              throw error;
            }
          }
        }
        return { successful, failed, results: batchResults };
      });
      return {
        total: operation.items.length,
        successful: results.successful,
        failed: results.failed,
        results: results.results,
      };
    } catch (error) {
      throw new Error(
        `Batch transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  }

  // #endregion

  // #region Domain operations

  public async bulkCreateUsers(
    users: {
      email: string;
      username: string;
      password: string;
      ipAddress: string;
      roleId: string;
      userStatusId: string;
    }[],
  ): Promise<BatchOperationSummary> {
    interface UserData {
      email: string;
      username: string;
      password: string;
      ipAddress: string;
      roleId: string;
      userStatusId: string;
    }
    const operation: BatchOperation<UserData> = {
      type: BatchOperationType.CREATE,
      items: users.map((user, index) => ({ id: `user-${index}`, data: user })),
      options: { continueOnError: true, validateBeforeExecute: true, maxBatchSize: 500 },
    };
    return this.executeBatch(operation, async (userData) => {
      return this.prisma.user.create({
        data: {
          id: crypto.randomUUID(),
          email: userData.email,
          username: userData.username,
          password: userData.password,
          ipAddress: userData.ipAddress,
          roleId: userData.roleId,
          userStatusId: userData.userStatusId,
        },
        select: { id: true, email: true, username: true },
      });
    });
  }

  public async bulkUpdateUserStatus(
    updates: { userId: string; userStatusId: string }[],
  ): Promise<BatchOperationSummary> {
    interface UpdateData { userId: string; userStatusId: string }
    const operation: BatchOperation<UpdateData> = {
      type: BatchOperationType.UPDATE,
      items: updates.map((update) => ({ id: update.userId, data: update })),
      options: { continueOnError: true, validateBeforeExecute: false, maxBatchSize: 1000 },
    };
    return this.executeBatchWithTransaction(operation, async (updateData, tx) => {
      return tx.user.update({
        where: { id: updateData.userId },
        data: { userStatusId: updateData.userStatusId },
      });
    });
  }

  public async bulkDeleteUsers(userIds: string[]): Promise<BatchOperationSummary> {
    interface DeleteData { userId: string }
    const operation: BatchOperation<DeleteData> = {
      type: BatchOperationType.DELETE,
      items: userIds.map((id) => ({ id, data: { userId: id } })),
      options: { continueOnError: false, validateBeforeExecute: true, maxBatchSize: 500 },
    };
    return this.executeBatchWithTransaction(operation, async (data, tx) => {
      return tx.user.delete({ where: { id: data.userId } });
    });
  }

  // #endregion

  // #region Validation

  private async validateBatch<T>(operation: BatchOperation<T>): Promise<void> {
    if (!operation.items || operation.items.length === 0) {
      throw new Error('Batch operation must contain at least one item');
    }
    const uniqueIds = new Set(operation.items.map((item) => item.id));
    if (uniqueIds.size !== operation.items.length) {
      throw new Error('Batch operation contains duplicate IDs');
    }
    if (operation.type === BatchOperationType.CREATE) {
      await this.validateCreateOperation(operation);
    } else if (operation.type === BatchOperationType.UPDATE) {
      await this.validateUpdateOperation(operation);
    } else if (operation.type === BatchOperationType.DELETE) {
      await this.validateDeleteOperation(operation);
    }
  }

  private async validateCreateOperation<T>(operation: BatchOperation<T>): Promise<void> {
    for (const item of operation.items) {
      if (!item.data) {
        throw new Error(`Item ${item.id} is missing required data`);
      }
    }
  }

  private async validateUpdateOperation<T>(operation: BatchOperation<T>): Promise<void> {
    for (const item of operation.items) {
      if (!item.data || !item.id) {
        throw new Error(`Item ${item.id} is missing required data or ID`);
      }
    }
  }

  private async validateDeleteOperation<T>(operation: BatchOperation<T>): Promise<void> {
    for (const item of operation.items) {
      if (!item.id) {
        throw new Error('Delete operation items must have valid IDs');
      }
    }
  }

  // #endregion
}
