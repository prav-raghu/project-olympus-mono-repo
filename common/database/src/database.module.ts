import { Global, Module, type OnApplicationShutdown } from '@nestjs/common';
import { createAdminClient, disconnectAdminClient } from './clients/admin.client';
import { createCustomerClient, disconnectCustomerClient } from './clients/customer.client';
import { createScheduleClient, disconnectScheduleClient } from './clients/schedule.client';
import { createSharedClient, disconnectSharedClient } from './clients/shared.client';
import { ADMIN_DB, CUSTOMER_DB, SCHEDULE_DB, SHARED_DB } from './tokens';

@Global()
@Module({
    providers: [
        {
            provide: ADMIN_DB,
            useFactory: () => createAdminClient(),
        },
        {
            provide: CUSTOMER_DB,
            useFactory: () => createCustomerClient(),
        },
        {
            provide: SCHEDULE_DB,
            useFactory: () => createScheduleClient(),
        },
        {
            provide: SHARED_DB,
            useFactory: () => createSharedClient(),
        },
    ],
    exports: [ADMIN_DB, CUSTOMER_DB, SCHEDULE_DB, SHARED_DB],
})
export class DatabaseModule implements OnApplicationShutdown {
    public async onApplicationShutdown(): Promise<void> {
        await Promise.all([
            disconnectAdminClient(),
            disconnectCustomerClient(),
            disconnectScheduleClient(),
            disconnectSharedClient(),
        ]);
    }
}
