import { Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AzureUser } from '@project-olympus/auth';
import type { ResponseDto } from '@project-olympus/types';
import { AuthService } from './auth.service';
import { CurrentUser } from './decorators/current-user.decorator';
import { AzureAuthGuard } from './guards/azure-auth.guard';

@ApiTags('Auth')
@ApiBearerAuth()
@UseGuards(AzureAuthGuard)
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('logout-all')
  @HttpCode(200)
  @ApiOperation({ summary: 'Sign out of every active session for the current user' })
  public async logoutAll(@CurrentUser() user: AzureUser): Promise<ResponseDto> {
    await this.authService.logoutAllSessions(user.id);
    return { isSuccessful: true, message: 'Signed out of all sessions', dateTimeStamp: new Date() };
  }

  @Post('bootstrap-admin')
  @HttpCode(200)
  @ApiOperation({
    summary:
      'One-time, env-gated flow that grants the calling (already MSAL-authenticated) user the Administrator role. Permanently locked after first success — see rbac.md.',
  })
  public async bootstrapAdmin(@CurrentUser() user: AzureUser): Promise<ResponseDto> {
    await this.authService.bootstrapAdmin(user.azureOid, user.email);
    return {
      isSuccessful: true,
      message: 'Administrator role granted — bootstrap is now permanently locked',
      dateTimeStamp: new Date(),
    };
  }
}
