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
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { WebhooksService } from './webhooks.service';
import { CreateWebhookDto } from './dto/create-webhook.dto';
import { UpdateWebhookDto } from './dto/update-webhook.dto';
import { AzureAuthGuard } from '../auth/guards/azure-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AzureUser } from '@project-olympus/auth';
import type { CreateWebhookSubscriptionDto, UpdateWebhookSubscriptionDto } from '@project-olympus/types';

@ApiTags('Webhooks')
@ApiBearerAuth()
@UseGuards(AzureAuthGuard)
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly webhooksService: WebhooksService) {}

  @Post()
  @Version('1')
  @ApiOperation({ summary: 'Create webhook subscription' })
  public async create(@Body() dto: CreateWebhookDto, @CurrentUser() user: AzureUser) {
    return this.webhooksService.createSubscription(dto as unknown as CreateWebhookSubscriptionDto, user.id);
  }

  @Get()
  @Version('1')
  @ApiOperation({ summary: 'List webhook subscriptions' })
  public async findAll(@CurrentUser() user: AzureUser, @Query('isActive') isActive?: string) {
    const active = isActive === undefined ? undefined : isActive === 'true';
    return this.webhooksService.listSubscriptions(user.id, active);
  }

  @Get(':id')
  @Version('1')
  @ApiOperation({ summary: 'Get webhook subscription' })
  public async findOne(@Param('id') id: string, @CurrentUser() user: AzureUser) {
    const result = await this.webhooksService.getSubscription(id, user.id);
    if (!result.isSuccessful) throw new NotFoundException(result.message);
    return result;
  }

  @Patch(':id')
  @Version('1')
  @ApiOperation({ summary: 'Update webhook subscription' })
  public async update(
    @Param('id') id: string,
    @CurrentUser() user: AzureUser,
    @Body() dto: UpdateWebhookDto,
  ) {
    const result = await this.webhooksService.updateSubscription(
      id,
      user.id,
      dto as unknown as UpdateWebhookSubscriptionDto,
    );
    if (!result.isSuccessful) throw new NotFoundException(result.message);
    return result;
  }

  @Delete(':id')
  @Version('1')
  @ApiOperation({ summary: 'Delete webhook subscription' })
  public async remove(@Param('id') id: string, @CurrentUser() user: AzureUser) {
    const result = await this.webhooksService.deleteSubscription(id, user.id);
    if (!result.isSuccessful) throw new NotFoundException(result.message);
    return result;
  }

  @Get(':id/deliveries')
  @Version('1')
  @ApiOperation({ summary: 'Get webhook deliveries' })
  public async deliveries(
    @Param('id') id: string,
    @CurrentUser() user: AzureUser,
    @Query('limit') limit?: string,
  ) {
    const result = await this.webhooksService.getDeliveries(
      id,
      user.id,
      limit ? parseInt(limit, 10) : 50,
    );
    if (!result.isSuccessful) throw new NotFoundException(result.message);
    return result;
  }

  @Post(':id/secret/regenerate')
  @Version('1')
  @ApiOperation({ summary: 'Regenerate webhook secret' })
  public async regenerateSecret(@Param('id') id: string, @CurrentUser() user: AzureUser) {
    const result = await this.webhooksService.regenerateSecret(id, user.id);
    if (!result.isSuccessful) throw new NotFoundException(result.message);
    return result;
  }
}
