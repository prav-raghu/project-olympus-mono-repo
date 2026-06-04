import { IsJSON, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateJobDto {
  @ApiProperty()
  @IsString()
  name: string = '';

  @ApiProperty()
  @IsString()
  cronExpr: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsJSON()
  payload?: string;
}
