import { NextRequest, NextResponse } from 'next/server';
import Redis from 'ioredis';
import crypto from 'crypto';

/**
 * Cache manager for storing verification results
 * Gracefully handles Redis unavailability
 */
class CacheManager {
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

// Create singleton cache instance
const cache = new CacheManager();

/**
 * Environment Validation
 */
function validateEnvironment() {
    console.log('🔍 Validating environment configuration...');

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check ML Service URL
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    console.log(`   ML Service URL: ${mlServiceUrl}`);

    // Check LLM Provider (optional for API, but good to know)
    const llmProvider = process.env.LLM_PROVIDER;
    if (llmProvider) {
        if (!['gemini', 'openai'].includes(llmProvider.toLowerCase())) {
            warnings.push(`Invalid LLM_PROVIDER: '${llmProvider}'. Should be 'gemini' or 'openai'`);
        } else {
            console.log(`   LLM Provider: ${llmProvider}`);
        }
    }

    // Check Redis URL (optional)
    const redisUrl = process.env.REDIS_URL;
    if (redisUrl) {
        console.log(`   Redis: ${redisUrl}`);
    } else {
        console.log('   Redis: Not configured (caching disabled)');
    }

    // Display warnings
    if (warnings.length > 0) {
        console.log('\n⚠️  Warnings:');
        warnings.forEach(warning => console.log(`   - ${warning}`));
    }

    // Display errors and exit if any
    if (errors.length > 0) {
        console.error('\n❌ Environment validation failed:');
        errors.forEach(error => console.error(`   - ${error}`));
        console.error('\nPlease check your .env file and ensure all required variables are set.');
        console.error('See .env.example for reference.\n');
        throw new Error('Environment validation failed');
    }

    console.log('✅ Environment validation passed\n');
}

// Validate environment on module load
try {
    validateEnvironment();
} catch (error) {
    console.error('Environment validation failed:', error);
}

export async function POST(request: NextRequest) {
    try {
        const { claim } = await request.json();

        // Validate input
        if (!claim || claim.trim().length === 0) {
            return NextResponse.json({ error: 'Claim is required' }, { status: 400 });
        }

        if (claim.length > 1000) {
            return NextResponse.json({ error: 'Claim too long (max 1000 characters)' }, { status: 400 });
        }

        console.log('📨 Received claim:', claim.substring(0, 100) + '...');

        // Check cache first
        const cachedResult = await cache.get(claim);
        if (cachedResult) {
            console.log('⚡ Returning cached result');
            return NextResponse.json(cachedResult);
        }

        // Call ML service with timeout
        const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
        console.log('🔗 Calling ML service:', mlServiceUrl);

        // Create AbortController for timeout handling
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout

        try {
            const response = await fetch(`${mlServiceUrl}/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ claim }),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ ML service error:', errorText);

                // Handle specific HTTP status codes
                if (response.status === 503) {
                    return NextResponse.json({
                        error: 'Verification service unavailable',
                        details: 'The ML service is currently unavailable. Please try again later.'
                    }, { status: 503 });
                }

                if (response.status >= 500) {
                    return NextResponse.json({
                        error: 'ML service error',
                        details: 'The verification service encountered an error. Please try again.'
                    }, { status: 500 });
                }

                if (response.status >= 400) {
                    return NextResponse.json({
                        error: 'Invalid request',
                        details: errorText || 'The request could not be processed.'
                    }, { status: 400 });
                }

                throw new Error(`ML service failed with status: ${response.status}`);
            }

            const result = await response.json() as any;
            console.log('✅ Verification complete:', result.verdict, `(${(result.confidence * 100).toFixed(0)}%)`);

            // Ensure response has required fields
            if (!result.claim || !result.verdict || result.confidence === undefined) {
                console.error('❌ Invalid response format from ML service');
                return NextResponse.json({
                    error: 'Invalid response from verification service',
                    details: 'The service returned an incomplete response.'
                }, { status: 500 });
            }

            // Cache the result
            await cache.set(claim, result);

            return NextResponse.json(result);

        } catch (fetchError) {
            clearTimeout(timeoutId);

            // Handle timeout
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                console.error('⏱️ Request timeout');
                return NextResponse.json({
                    error: 'Request timeout',
                    details: 'The verification request took too long. Please try again.'
                }, { status: 504 });
            }

            // Handle connection errors
            if (fetchError instanceof Error && (
                fetchError.message.includes('fetch failed') ||
                fetchError.message.includes('ECONNREFUSED')
            )) {
                console.error('🔌 ML service connection failed');
                return NextResponse.json({
                    error: 'Verification service unavailable',
                    details: 'Could not connect to the verification service. Please try again later.'
                }, { status: 503 });
            }

            throw fetchError;
        }

    } catch (error) {
        console.error('❌ Error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}

export async function GET() {
    return NextResponse.json({
        message: 'LLM Fact Checker API',
        status: 'ready',
        version: '1.0.0'
    });
}