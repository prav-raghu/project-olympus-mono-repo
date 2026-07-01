import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Verify2FADto } from './dto/verify-2fa.dto';
import { AzureAuthGuard } from '../auth/guards/azure-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AzureUser } from '@project-olympus/auth';

@ApiTags('Users')
@ApiBearerAuth()
@UseGuards(AzureAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // #region List & lookups

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List users (paged)' })
  public async findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('searchQuery') searchQuery?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
  ): Promise<unknown> {
    return this.usersService.getOnlineUsers({
      page: parseInt(page, 10),
      pageSize: parseInt(pageSize, 10),
      searchQuery,
      sortBy,
      sortOrder,
    });
  }

  @Get('stats')
  @Version('1')
  @ApiOperation({ summary: 'User statistics' })
  public async stats(): Promise<unknown> {
    return this.usersService.getUserStats();
  }

  @Get('roles')
  @Version('1')
  @ApiOperation({ summary: 'Get all roles' })
  public async roles(): Promise<unknown> {
    return this.usersService.getUserRoles();
  }

  @Get('statuses')
  @Version('1')
  @ApiOperation({ summary: 'Get all user statuses' })
  public async statuses(): Promise<unknown> {
    return this.usersService.getUserStatuses();
  }

  @Get('profile')
  @Version('1')
  @ApiOperation({ summary: 'Get own profile' })
  public async profile(@CurrentUser() user: AzureUser): Promise<unknown> {
    return this.usersService.getUserProfile(user.id);
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get user details by ID' })
  public async findById(@Param('id') id: string): Promise<unknown> {
    return this.usersService.getUserDetails(id);
  }

  // #endregion

  // #region Mutations

  @Post()
  @Version('1')
  @HttpCode(201)
  @ApiOperation({ summary: 'Onboard (create) a new user' })
  public async create(@Body() dto: CreateUserDto): Promise<unknown> {
    return this.usersService.onboardUser(dto);
  }

  @Patch('profile')
  @Version('1')
  @ApiOperation({ summary: 'Update own profile' })
  public async updateProfile(
    @CurrentUser() user: AzureUser,
    @Body() dto: UpdateUserDto,
  ): Promise<unknown> {
    return this.usersService.updateProfile(user.id, dto);
  }

  // #endregion

  // #region 2FA

  @Post('2fa/setup')
  @Version('1')
  @ApiOperation({ summary: 'Setup 2FA' })
  public async setup2FA(@CurrentUser() user: AzureUser): Promise<unknown> {
    return this.usersService.setup2FA(user.id);
  }

  @Post('2fa/verify')
  @Version('1')
  @ApiOperation({ summary: 'Verify and enable 2FA' })
  public async verify2FA(
    @CurrentUser() user: AzureUser,
    @Body() dto: Verify2FADto,
  ): Promise<unknown> {
    return this.usersService.verify2FA(user.id, dto.token);
  }

  @Delete('2fa')
  @Version('1')
  @ApiOperation({ summary: 'Disable 2FA' })
  public async disable2FA(
    @CurrentUser() user: AzureUser,
    @Body() dto: Verify2FADto,
  ): Promise<unknown> {
    return this.usersService.disable2FA(user.id, dto.token);
  }

  // #endregion
}
