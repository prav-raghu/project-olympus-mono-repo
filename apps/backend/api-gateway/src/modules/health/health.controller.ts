import { Controller, Get, VERSION_NEUTRAL } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GatewayHealthService } from '../../services/health.service';

@ApiTags('Health')
@Controller({ path: 'health', version: VERSION_NEUTRAL })
export class HealthController {
  constructor(private readonly gatewayHealthService: GatewayHealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness check' })
  public liveness(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @ApiOperation({ summary: 'Readiness check' })
  public readiness(): { status: string; timestamp: string } {
    return { status: 'ready', timestamp: new Date().toISOString() };
  }

  @Get('services')
  @ApiOperation({ summary: 'Downstream service health' })
  public async services() {
    return this.gatewayHealthService.checkAllServices();
  }
}
