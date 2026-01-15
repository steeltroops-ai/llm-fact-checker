import Redis from 'ioredis';
import crypto from 'crypto';

/**
 * Cache manager for storing verification results
 * Gracefully handles Redis unavailability
 */
export class CacheManager {
    private redis: Redis | null = null;
    private isAvailable: boolean = false;
    private readonly TTL = 3600; // 1 hour in seconds

    constructor() {
        this.initializeRedis();
    }

    /**
     * Initialize Redis connection
     * Fails gracefully if Redis is not available
     */
    private initializeRedis(): void {
        try {
            const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
            console.log('🔌 Attempting to connect to Redis:', redisUrl);

            this.redis = new Redis(redisUrl, {
                maxRetriesPerRequest: 1,
                retryStrategy: () => null, // Don't retry on failure
                lazyConnect: true,
                enableOfflineQueue: false,
            });

            // Handle connection events
            this.redis.on('connect', () => {
                console.log('✅ Redis connected successfully');
                this.isAvailable = true;
            });

            this.redis.on('error', (error) => {
                console.warn('⚠️ Redis error (caching disabled):', error.message);
                this.isAvailable = false;
            });

            this.redis.on('close', () => {
                console.warn('⚠️ Redis connection closed (caching disabled)');
                this.isAvailable = false;
            });

            // Try to connect
            this.redis.connect().catch((error) => {
                console.warn('⚠️ Redis connection failed (caching disabled):', error.message);
                this.isAvailable = false;
            });

        } catch (error) {
            console.warn('⚠️ Redis initialization failed (caching disabled):', error);
            this.isAvailable = false;
        }
    }

    /**
     * Generate cache key from claim
     * Uses SHA-256 hash of normalized claim
     */
    private generateKey(claim: string): string {
        const normalized = claim.toLowerCase().trim();
        const hash = crypto.createHash('sha256').update(normalized).digest('hex');
        return `claim:${hash}`;
    }

    /**
     * Get cached result for a claim
     * Returns null if not found or cache unavailable
     */
    async get(claim: string): Promise<any | null> {
        if (!this.isAvailable || !this.redis) {
            return null;
        }

        try {
            const key = this.generateKey(claim);
            const cached = await this.redis.get(key);

            if (cached) {
                console.log('💾 Cache hit for claim');
                return JSON.parse(cached);
            }

            console.log('🔍 Cache miss for claim');
            return null;

        } catch (error) {
            console.warn('⚠️ Cache get failed:', error);
            return null;
        }
    }

    /**
     * Store result in cache
     * Fails gracefully if cache unavailable
     */
    async set(claim: string, result: any): Promise<void> {
        if (!this.isAvailable || !this.redis) {
            return;
        }

        try {
            const key = this.generateKey(claim);
            await this.redis.setex(key, this.TTL, JSON.stringify(result));
            console.log('💾 Result cached successfully (TTL: 1 hour)');

        } catch (error) {
            console.warn('⚠️ Cache set failed:', error);
            // Don't throw - caching is optional
        }
    }

    /**
     * Check if cache is available
     */
    isReady(): boolean {
        return this.isAvailable;
    }

    /**
     * Close Redis connection
     */
    async close(): Promise<void> {
        if (this.redis && this.isAvailable) {
            try {
                await this.redis.quit();
            } catch (error) {
                // Ignore errors when closing
                console.warn('⚠️ Error closing Redis connection:', error);
            }
        }
    }
}

// Export singleton instance
export const cache = new CacheManager();
