import { IsEmail, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsEmail()
  email: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  displayName?: string;
}
