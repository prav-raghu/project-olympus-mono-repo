import { IsArray, IsBoolean, IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { BatchOperationType } from '@project-olympus/types';

export class BatchItemDto {
  @ApiProperty()
  @IsString()
  id: string = '';

  @ApiProperty()
  data: unknown = null;
}

export class ExecuteBatchDto {
  @ApiProperty({ enum: BatchOperationType })
  @IsEnum(BatchOperationType)
  type: BatchOperationType = BatchOperationType.CREATE;

  @ApiProperty({ type: [BatchItemDto] })
  @IsArray()
  items: BatchItemDto[] = [];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  continueOnError?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  validateBeforeExecute?: boolean;
}
