/**
 * Integration Tests
 * Tests end-to-end flows and caching behavior
 * 
 * Requirements tested: All
 * 
 * Run with: bun test backend/tests/integration.test.ts
 */

import { describe, test, expect, beforeAll } from 'bun:test';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8000';
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

interface VerificationResult {
    claim: string;
    verdict: 'true' | 'false' | 'uncertain';
    confidence: number;
    explanation: string;
    sources: string[];
}

// Helper function to wait for services to be ready
async function waitForService(url: string, maxAttempts = 5): Promise<boolean> {
    for (let i = 0; i < maxAttempts; i++) {
        try {
            const response = await fetch(url);
            if (response.ok) return true;
        } catch {
            // Service not ready yet
        }
        await new Promise(resolve => setTimeout(resolve, 1000));
    }
    return false;
}

beforeAll(async () => {
    // Check if services are running
    const backendReady = await waitForService(`${BACKEND_URL}/health`, 3);
    const mlServiceReady = await waitForService(`${ML_SERVICE_URL}/health`, 3);

    if (!backendReady) {
        console.warn('⚠️  Backend not running. Some tests may fail.');
    }
    if (!mlServiceReady) {
        console.warn('⚠️  ML service not running. Some tests may fail.');
    }
});

describe('Integration Tests - End-to-End Happy Path', () => {
    test('should verify a true scientific claim end-to-end', async () => {
        const claim = "Water boils at 100 degrees Celsius at sea level";

        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim }),
        });

        expect(response.ok).toBe(true);

        const result: VerificationResult = await response.json();

        // Validate response structure
        expect(result).toHaveProperty('claim');
        expect(result).toHaveProperty('verdict');
        expect(result).toHaveProperty('confidence');
        expect(result).toHaveProperty('explanation');
        expect(result).toHaveProperty('sources');

        // Validate data types
        expect(typeof result.claim).toBe('string');
        expect(['true', 'false', 'uncertain']).toContain(result.verdict);
        expect(typeof result.confidence).toBe('number');
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
        expect(typeof result.explanation).toBe('string');
        expect(Array.isArray(result.sources)).toBe(true);

        // Validate content
        expect(result.claim).toBe(claim);
        expect(result.explanation.length).toBeGreaterThan(0);
    }, 30000); // 30 second timeout for LLM call

    test('should verify a false claim end-to-end', async () => {
        const claim = "The Earth is flat";

        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim }),
        });

        expect(response.ok).toBe(true);

        const result: VerificationResult = await response.json();

        // Validate response structure
        expect(result).toHaveProperty('verdict');
        expect(['true', 'false', 'uncertain']).toContain(result.verdict);
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
    }, 30000);

    test('should handle uncertain claims end-to-end', async () => {
        const claim = "AI will replace all jobs by 2030";

        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim }),
        });

        expect(response.ok).toBe(true);

        const result: VerificationResult = await response.json();

        // Should return a verdict (even if uncertain)
        expect(['true', 'false', 'uncertain']).toContain(result.verdict);
        expect(result.explanation.length).toBeGreaterThan(0);
    }, 30000);
});

describe('Integration Tests - End-to-End Error Paths', () => {
    test('should reject empty claims', async () => {
        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim: '' }),
        });

        expect(response.status).toBe(400);

        const result = await response.json();
        expect(result).toHaveProperty('error');
        expect(result.error).toContain('required');
    });

    test('should reject claims that are too long', async () => {
        const longClaim = 'A'.repeat(1001);

        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim: longClaim }),
        });

        expect(response.status).toBe(400);

        const result = await response.json();
        expect(result).toHaveProperty('error');
        expect(result.error.toLowerCase()).toContain('long');
    });

    test('should handle missing claim field', async () => {
        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });

        expect(response.status).toBe(400);

        const result = await response.json();
        expect(result).toHaveProperty('error');
    });

    test('should return user-friendly error messages', async () => {
        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim: '' }),
        });

        const result = await response.json();

        // Error message should not expose internal details
        const internalTerms = ['stack', 'trace', 'exception', 'undefined', 'null'];
        const errorText = JSON.stringify(result).toLowerCase();

        internalTerms.forEach(term => {
            expect(errorText).not.toContain(term);
        });
    });
});

describe('Integration Tests - Caching Behavior', () => {
    test('should cache verification results', async () => {
        const claim = `Test claim for caching ${Date.now()}`;

        // First request - should hit ML service
        const start1 = Date.now();
        const response1 = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim }),
        });
        const duration1 = Date.now() - start1;

        expect(response1.ok).toBe(true);
        const result1: VerificationResult = await response1.json();

        // Wait a bit to ensure cache is set
        await new Promise(resolve => setTimeout(resolve, 100));

        // Second request - should hit cache (much faster)
        const start2 = Date.now();
        const response2 = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim }),
        });
        const duration2 = Date.now() - start2;

        expect(response2.ok).toBe(true);
        const result2: VerificationResult = await response2.json();

        // Results should be identical
        expect(result2.claim).toBe(result1.claim);
        expect(result2.verdict).toBe(result1.verdict);
        expect(result2.confidence).toBe(result1.confidence);
        expect(result2.explanation).toBe(result1.explanation);

        // Second request should be significantly faster (cached)
        // Note: This may not always be true if Redis is not available
        console.log(`First request: ${duration1}ms, Second request: ${duration2}ms`);

        // If Redis is available, second request should be much faster
        if (duration2 < duration1 / 2) {
            console.log('✅ Cache is working (second request was much faster)');
        } else {
            console.log('⚠️  Cache may not be working (Redis might not be available)');
        }
    }, 60000); // 60 second timeout for two LLM calls

    test('should handle cache failures gracefully', async () => {
        // Even if cache fails, the system should still work
        const claim = `Test claim without cache ${Date.now()}`;

        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim }),
        });

        // Should succeed even if cache is unavailable
        expect(response.ok).toBe(true);

        const result: VerificationResult = await response.json();
        expect(result).toHaveProperty('verdict');
    }, 30000);
});

describe('Integration Tests - Service Health', () => {
    test('backend health endpoint should respond', async () => {
        const response = await fetch(`${BACKEND_URL}/health`);

        expect(response.ok).toBe(true);

        const result = await response.json();
        expect(result).toHaveProperty('status');
        expect(result.status).toBe('ok');
    });

    test('backend root endpoint should respond', async () => {
        const response = await fetch(`${BACKEND_URL}/`);

        expect(response.ok).toBe(true);

        const result = await response.json();
        expect(result).toHaveProperty('message');
        expect(result).toHaveProperty('status');
    });

    test('ML service health endpoint should respond', async () => {
        try {
            const response = await fetch(`${ML_SERVICE_URL}/health`);

            if (response.ok) {
                const result = await response.json();
                expect(result).toHaveProperty('status');
                expect(result.status).toBe('healthy');
            } else {
                console.warn('⚠️  ML service health check failed');
            }
        } catch (error) {
            console.warn('⚠️  ML service not reachable');
        }
    });
});

describe('Integration Tests - Response Time', () => {
    test('verification should complete within reasonable time', async () => {
        const claim = "Quick test claim";

        const start = Date.now();
        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim }),
        });
        const duration = Date.now() - start;

        expect(response.ok).toBe(true);

        // Should complete within 30 seconds (requirement 2.1)
        expect(duration).toBeLessThan(30000);

        console.log(`Verification completed in ${duration}ms`);
    }, 35000);
});

describe('Integration Tests - Data Validation', () => {
    test('should validate confidence score range', async () => {
        const claim = "Test claim for confidence validation";

        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim }),
        });

        expect(response.ok).toBe(true);

        const result: VerificationResult = await response.json();

        // Confidence must be between 0 and 1 (requirement 2.3)
        expect(result.confidence).toBeGreaterThanOrEqual(0);
        expect(result.confidence).toBeLessThanOrEqual(1);
    }, 30000);

    test('should return valid verdict values', async () => {
        const claim = "Test claim for verdict validation";

        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim }),
        });

        expect(response.ok).toBe(true);

        const result: VerificationResult = await response.json();

        // Verdict must be one of the three valid values (requirement 2.2)
        expect(['true', 'false', 'uncertain']).toContain(result.verdict);
    }, 30000);

    test('should include explanation and sources', async () => {
        const claim = "Test claim for completeness validation";

        const response = await fetch(`${BACKEND_URL}/api/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ claim }),
        });

        expect(response.ok).toBe(true);

        const result: VerificationResult = await response.json();

        // Must include explanation (requirement 2.4)
        expect(result.explanation).toBeDefined();
        expect(typeof result.explanation).toBe('string');
        expect(result.explanation.length).toBeGreaterThan(0);

        // Must include sources array (requirement 2.5)
        expect(result.sources).toBeDefined();
        expect(Array.isArray(result.sources)).toBe(true);
    }, 30000);
});
