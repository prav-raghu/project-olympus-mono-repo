import { Body, Controller, Post, Version, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { ReportRequestDto } from './dto/report-request.dto';
import { AzureAuthGuard } from '../auth/guards/azure-auth.guard';

@ApiTags('Reporting')
@ApiBearerAuth()
@UseGuards(AzureAuthGuard)
@Controller('reporting')
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  @Post('generate')
  @Version('1')
  @ApiOperation({ summary: 'Generate a report' })
  public async generate(@Body() dto: ReportRequestDto): Promise<unknown> {
    return this.reportingService.generateReport({
      type: dto.type,
      format: dto.format,
      filters: {
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      includeHeaders: dto.includeHeaders ?? true,
    });
  }
}
