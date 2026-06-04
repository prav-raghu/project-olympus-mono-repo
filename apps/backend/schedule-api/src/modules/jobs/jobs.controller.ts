import { Controller, Get, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JobsService } from './jobs.service';
import { AzureAuthGuard } from '../auth/guards/azure-auth.guard';

@ApiTags('Jobs')
@ApiBearerAuth()
@UseGuards(AzureAuthGuard)
@Controller('jobs')
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List running jobs' })
  public async findAll() {
    return { isSuccessful: true, data: [] };
  }
}
