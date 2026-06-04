import { Body, Controller, Post, Version, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { BatchService } from './batch.service';
import { BulkUpdateStatusDto } from './dto/bulk-update-status.dto';
import { BulkDeleteUsersDto } from './dto/bulk-delete-users.dto';
import { AzureAuthGuard } from '../auth/guards/azure-auth.guard';

@ApiTags('Batch')
@ApiBearerAuth()
@UseGuards(AzureAuthGuard)
@Controller('batch')
export class BatchController {
  constructor(private readonly batchService: BatchService) {}

  @Post('users/status')
  @Version('1')
  @ApiOperation({ summary: 'Bulk update user statuses' })
  public async bulkUpdateStatus(@Body() dto: BulkUpdateStatusDto): Promise<unknown> {
    return this.batchService.bulkUpdateUserStatus(dto.updates);
  }

  @Post('users/delete')
  @Version('1')
  @ApiOperation({ summary: 'Bulk soft-delete users' })
  public async bulkDelete(@Body() dto: BulkDeleteUsersDto): Promise<unknown> {
    return this.batchService.bulkDeleteUsers(dto.userIds);
  }
}
