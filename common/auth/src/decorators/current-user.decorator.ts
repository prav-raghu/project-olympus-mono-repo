import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import { type AzureUser } from '../interfaces/azure-user.interface';

export const CurrentUser = createParamDecorator(
    (_data: unknown, ctx: ExecutionContext): AzureUser => {
        const request = ctx.switchToHttp().getRequest<Record<string, unknown>>();
        const user = request['user'] as AzureUser | undefined;
        if (!user) {
            throw new Error('User not found on request — ensure AzureAuthGuard is applied');
        }
        return user;
    },
);
