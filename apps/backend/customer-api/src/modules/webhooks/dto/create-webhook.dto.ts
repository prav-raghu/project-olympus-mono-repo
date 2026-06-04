import { IsArray, IsInt, IsOptional, IsString, IsUrl, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateWebhookDto {
  @ApiProperty()
  @IsUrl()
  url: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  secret?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  events: string[] = [];

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  retryCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  timeoutSeconds?: number;
}
