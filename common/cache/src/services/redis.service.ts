import Redis from "ioredis";
import { Logger } from "@project-olympus/logging";

const logger = new Logger("RedisService");

const redis: Redis | null = (() => {
    try {
        const instance = new Redis({
            host: process.env.REDIS_HOST || "127.0.0.1",
            port: Number(process.env.REDIS_PORT) || 6379,
            password: process.env.REDIS_PASSWORD || undefined,
            maxRetriesPerRequest: 3,
            enableReadyCheck: true,
            lazyConnect: false,
            retryStrategy: (times) => {
                if (times > 3) {
                    logger.warn('Redis unavailable - running without cache');
                    return null;
                }
                return Math.min(times * 100, 2000);
            },
        });

        instance.on('error', (err) => {
            logger.warn('Redis connection error', { message: err.message });
        });

        instance.on('ready', () => {
            logger.info('Redis connected successfully');
        });

        return instance;
    } catch (error) {
        logger.warn('Redis initialization failed - running without cache', { error });
        return null;
    }
})();

export { redis };

export class RedisService {
    private static instance: RedisService;
    private readonly logger = new Logger(RedisService.name);
    public client: Redis | null;
    private readonly isAvailable: boolean;

    private constructor() {
        this.client = redis;
        this.isAvailable = redis !== null;
    }

    public static getInstance(): RedisService {
        if (!RedisService.instance) {
            RedisService.instance = new RedisService();
        }
        return RedisService.instance;
    }

    private async safeExecute<T>(operation: () => Promise<T>, fallback: T): Promise<T> {
        if (!this.isAvailable || !this.client) {
            return fallback;
        }
        try {
            return await operation();
        } catch (error) {
            this.logger.warn('Redis operation failed, using fallback', { error });
            return fallback;
        }
    }

    // Presence caching
    async setUserOnline(userId: string, socketId: string, ttl = 86400): Promise<void> {
        await this.safeExecute(async () => {
            const key = `presence:${userId}`;
            await this.client!.setex(key, ttl, JSON.stringify({ socketId, lastSeen: Date.now() }));
            await this.client!.sadd('online_users', userId);
        }, undefined);
    }

    async setUserOffline(userId: string): Promise<void> {
        await this.safeExecute(async () => {
            const key = `presence:${userId}`;
            await this.client!.del(key);
            await this.client!.srem('online_users', userId);
        }, undefined);
    }

    async isUserOnline(userId: string): Promise<boolean> {
        return this.safeExecute(async () => {
            return (await this.client!.exists(`presence:${userId}`)) === 1;
        }, false);
    }

    async getOnlineUsers(): Promise<string[]> {
        return this.safeExecute(async () => {
            return this.client!.smembers('online_users');
        }, []);
    }

    async getUserPresence(userId: string): Promise<{ socketId: string; lastSeen: number } | null> {
        return this.safeExecute(async () => {
            const data = await this.client!.get(`presence:${userId}`);
            return data ? JSON.parse(data) : null;
        }, null);
    }

    // Conversation caching
    async cacheConversations(userId: string, conversations: unknown[], ttl = 300): Promise<void> {
        await this.safeExecute(async () => {
            const key = `conversations:${userId}`;
            await this.client!.setex(key, ttl, JSON.stringify(conversations));
        }, undefined);
    }

    async getCachedConversations(userId: string): Promise<unknown[] | null> {
        return this.safeExecute(async () => {
            const data = await this.client!.get(`conversations:${userId}`);
            return data ? JSON.parse(data) : null;
        }, null);
    }

    async invalidateConversations(userId: string): Promise<void> {
        await this.safeExecute(async () => {
            await this.client!.del(`conversations:${userId}`);
        }, undefined);
    }

    // Message caching
    async cacheMessages(roomId: string, messages: unknown[], ttl = 600): Promise<void> {
        await this.safeExecute(async () => {
            const key = `messages:${roomId}`;
            await this.client!.setex(key, ttl, JSON.stringify(messages));
        }, undefined);
    }

    async getCachedMessages(roomId: string): Promise<unknown[] | null> {
        return this.safeExecute(async () => {
            const data = await this.client!.get(`messages:${roomId}`);
            return data ? JSON.parse(data) : null;
        }, null);
    }

    async invalidateMessages(roomId: string): Promise<void> {
        await this.safeExecute(async () => {
            await this.client!.del(`messages:${roomId}`);
        }, undefined);
    }

    // User data caching
    async cacheUser(userId: string, userData: unknown, ttl = 3600): Promise<void> {
        await this.safeExecute(async () => {
            const key = `user:${userId}`;
            await this.client!.setex(key, ttl, JSON.stringify(userData));
        }, undefined);
    }

    async getCachedUser(userId: string): Promise<Record<string, unknown> | null> {
        return this.safeExecute(async () => {
            const data = await this.client!.get(`user:${userId}`);
            return data ? JSON.parse(data) : null;
        }, null);
    }

    async getCachedUsers(userIds: string[]): Promise<Map<string, Record<string, unknown>>> {
        if (userIds.length === 0) {
            return new Map();
        }
        
        return this.safeExecute(async () => {
            const keys = userIds.map(id => `user:${id}`);
            const values = await this.client!.mget(...keys);
            
            const userMap = new Map<string, Record<string, unknown>>();
            values.forEach((value, index) => {
                if (value) {
                    try {
                        userMap.set(userIds[index], JSON.parse(value));
                    } catch {
                        // Skip invalid JSON entries
                    }
                }
            });
            return userMap;
        }, new Map());
    }
}
