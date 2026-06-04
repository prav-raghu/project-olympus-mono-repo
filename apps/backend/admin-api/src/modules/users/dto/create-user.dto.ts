import { IsBoolean, IsEmail, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(3)
  username: string = '';

  @ApiProperty()
  @IsEmail()
  email: string = '';

  @ApiProperty()
  @IsString()
  @MinLength(8)
  password: string = '';

  @ApiProperty()
  @IsString()
  roleId: string = '';

  @ApiProperty()
  @IsString()
  userStatusId: string = '';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  age?: number;

  @ApiProperty()
  @IsBoolean()
  acceptTermsAndConditions: boolean = false;

  @ApiProperty()
  @IsBoolean()
  allowEmailCommunications: boolean = false;
}
