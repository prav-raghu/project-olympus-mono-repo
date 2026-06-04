import { IsArray, IsString, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UserStatusUpdateDto {
  @ApiProperty()
  @IsString()
  userId: string = '';

  @ApiProperty()
  @IsString()
  userStatusId: string = '';
}

export class BulkUpdateStatusDto {
  @ApiProperty({ type: [UserStatusUpdateDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UserStatusUpdateDto)
  updates: UserStatusUpdateDto[] = [];
}
