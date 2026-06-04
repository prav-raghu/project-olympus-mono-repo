import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AzureAuthGuard } from './guards/azure-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AzureAuthGuard],
  exports: [AuthService, AzureAuthGuard],
})
export class AuthModule {}
