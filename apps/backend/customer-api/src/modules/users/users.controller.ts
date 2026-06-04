import { Controller, Get, NotFoundException, Param, Query, UseGuards, Version } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { AzureAuthGuard } from '../auth/guards/azure-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AzureUser } from '@project-olympus/auth';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AzureAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List users' })
  public async findAll(
    @CurrentUser() currentUser: AzureUser,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('genderId') genderId?: string,
    @Query('minAge') minAge?: string,
    @Query('maxAge') maxAge?: string,
  ) {
    return this.usersService.getUsers(
      {
        genderId,
        minAge: minAge ? parseInt(minAge, 10) : undefined,
        maxAge: maxAge ? parseInt(maxAge, 10) : undefined,
        limit: limit ? parseInt(limit, 10) : 20,
        offset: offset ? parseInt(offset, 10) : 0,
      },
      currentUser.id,
    );
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get user by ID' })
  public async findById(@Param('id') id: string) {
    const result = await this.usersService.getUserById(id);
    if (!result.isSuccessful) throw new NotFoundException(result.message);
    return result;
  }
}
