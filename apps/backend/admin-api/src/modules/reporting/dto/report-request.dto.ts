import { IsDateString, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReportFormat, ReportType } from '@project-olympus/types';

export class ReportRequestDto {
  @ApiProperty({ enum: ReportType })
  @IsEnum(ReportType)
  type: ReportType = ReportType.USER_ACTIVITY;

  @ApiProperty({ enum: ReportFormat })
  @IsEnum(ReportFormat)
  format: ReportFormat = ReportFormat.CSV;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  includeHeaders?: boolean;
}
