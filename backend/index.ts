import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { cache } from './cache';

// ============================================
// Environment Validation
// ============================================

function validateEnvironment() {
    console.log('🔍 Validating environment configuration...');

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check ML Service URL
    const mlServiceUrl = process.env.ML_SERVICE_URL || 'http://localhost:8001';
    console.log(`   ML Service URL: ${mlServiceUrl}`);

    // Check LLM Provider (optional for backend, but good to know)
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

    // Check Port
    const port = process.env.PORT || '8000';
    console.log(`   Port: ${port}`);

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
        process.exit(1);
    }

    console.log('✅ Environment validation passed\n');
}

// Validate environment on startup
validateEnvironment();

const app = new Hono();

app.use('/*', cors());

app.get('/', (c) => {
    return c.json({
        message: 'LLM Fact Checker API',
        status: 'ready',
        version: '1.0.0'
    });
});

app.get('/health', (c) => {
    return c.json({ status: 'ok' });
});

app.post('/api/verify', async (c) => {
    try {
        const { claim } = await c.req.json();

        // Validate input
        if (!claim || claim.trim().length === 0) {
            return c.json({ error: 'Claim is required' }, 400);
        }

        if (claim.length > 1000) {
            return c.json({ error: 'Claim too long (max 1000 characters)' }, 400);
        }

        console.log('📨 Received claim:', claim.substring(0, 100) + '...');

        // Check cache first
        const cachedResult = await cache.get(claim);
        if (cachedResult) {
            console.log('⚡ Returning cached result');
            return c.json(cachedResult);
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
                    return c.json({
                        error: 'Verification service unavailable',
                        details: 'The ML service is currently unavailable. Please try again later.'
                    }, 503);
                }

                if (response.status >= 500) {
                    return c.json({
                        error: 'ML service error',
                        details: 'The verification service encountered an error. Please try again.'
                    }, 500);
                }

                if (response.status >= 400) {
                    return c.json({
                        error: 'Invalid request',
                        details: errorText || 'The request could not be processed.'
                    }, 400);
                }

                throw new Error(`ML service failed with status: ${response.status}`);
            }

            const result = await response.json() as any;
            console.log('✅ Verification complete:', result.verdict, `(${(result.confidence * 100).toFixed(0)}%)`);

            // Ensure response has required fields
            if (!result.claim || !result.verdict || result.confidence === undefined) {
                console.error('❌ Invalid response format from ML service');
                return c.json({
                    error: 'Invalid response from verification service',
                    details: 'The service returned an incomplete response.'
                }, 500);
            }

            // Cache the result
            await cache.set(claim, result);

            return c.json(result);

        } catch (fetchError) {
            clearTimeout(timeoutId);

            // Handle timeout
            if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                console.error('⏱️ Request timeout');
                return c.json({
                    error: 'Request timeout',
                    details: 'The verification request took too long. Please try again.'
                }, 504);
            }

            // Handle connection errors
            if (fetchError instanceof Error && (
                fetchError.message.includes('fetch failed') ||
                fetchError.message.includes('ECONNREFUSED')
            )) {
                console.error('🔌 ML service connection failed');
                return c.json({
                    error: 'Verification service unavailable',
                    details: 'Could not connect to the verification service. Please try again later.'
                }, 503);
            }

            throw fetchError;
        }

    } catch (error) {
        console.error('❌ Error:', error);
        return c.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        }, 500);
    }
});

console.log('🚀 Starting backend server on port 8000...');

export default {
    port: 8000,
    fetch: app.fetch,
};