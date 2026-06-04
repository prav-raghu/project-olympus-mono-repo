import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
  Version,
  HttpCode,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiTags } from '@nestjs/swagger';
import { PartnersService } from './partners.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { UpdatePartnerDto } from './dto/update-partner.dto';
import { AzureAuthGuard } from '../auth/guards/azure-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AzureUser } from '@project-olympus/auth';

@ApiTags('Partners')
@ApiBearerAuth()
@UseGuards(AzureAuthGuard)
@Controller('partners')
export class PartnersController {
  constructor(private readonly partnersService: PartnersService) {}

  // #region Queries

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List partners (paged)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'pageSize', required: false, type: Number })
  @ApiQuery({ name: 'search', required: false, type: String })
  public async findAll(
    @Query('page') page = '1',
    @Query('pageSize') pageSize = '20',
    @Query('search') search?: string,
  ): Promise<unknown> {
    return this.partnersService.findAll(parseInt(page, 10), parseInt(pageSize, 10), search);
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get partner by ID' })
  public async findById(@Param('id') id: string): Promise<unknown> {
    const result = await this.partnersService.findById(id);
    if (!result.isSuccessful) throw new NotFoundException(result.message);
    return result;
  }

  // #endregion

  // #region Mutations

  @Post()
  @Version('1')
  @HttpCode(201)
  @ApiOperation({ summary: 'Create a new partner' })
  public async create(
    @Body() dto: CreatePartnerDto,
    @CurrentUser() user: AzureUser,
  ): Promise<unknown> {
    return this.partnersService.create(dto, user.id);
  }

  @Patch(':id')
  @Version('1')
  @ApiOperation({ summary: 'Update a partner' })
  public async update(
    @Param('id') id: string,
    @Body() dto: UpdatePartnerDto,
    @CurrentUser() user: AzureUser,
  ): Promise<unknown> {
    const result = await this.partnersService.update(id, dto, user.id);
    if (!result.isSuccessful) throw new NotFoundException(result.message);
    return result;
  }

  @Delete(':id')
  @Version('1')
  @ApiOperation({ summary: 'Deactivate a partner' })
  public async remove(
    @Param('id') id: string,
    @CurrentUser() user: AzureUser,
  ): Promise<unknown> {
    const result = await this.partnersService.softDelete(id, user.id);
    if (!result.isSuccessful) throw new NotFoundException(result.message);
    return result;
  }

  // #endregion
}
