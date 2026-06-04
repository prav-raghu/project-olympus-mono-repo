import { PrismaClient } from '@prisma/client/shared';
import 'dotenv/config';

const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL_SHARED } },
});

async function main(): Promise<void> {
    await populateRoles();
    await populateUserStatuses();
    console.log('Seeding Complete ✅');
}

export async function populateUserStatuses(): Promise<void> {
    await prisma.userStatus.createMany({
        data: [
            { id: crypto.randomUUID(), name: 'Online' },
            { id: crypto.randomUUID(), name: 'Offline' },
            { id: crypto.randomUUID(), name: 'Pending Verification' },
            { id: crypto.randomUUID(), name: 'Verified' },
        ],
        skipDuplicates: true,
    });
    console.log('User statuses created ✅');
}

export async function populateRoles(): Promise<void> {
    await prisma.role.createMany({
        data: [
            { id: crypto.randomUUID(), name: 'Administrator' },
            { id: crypto.randomUUID(), name: 'Moderator' },
            { id: crypto.randomUUID(), name: 'User' },
            { id: crypto.randomUUID(), name: 'Support' },
        ],
        skipDuplicates: true,
    });
    console.log('Roles created ✅');
}

void (async () => {
    try {
        await main();
    } catch (e) {
        console.error('Seed failed:', e instanceof Error ? e.message : String(e));
        process.exit(1);
    } finally {
        await prisma.$disconnect();
    }
})();
