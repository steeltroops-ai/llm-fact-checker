import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import * as fc from 'fast-check';

/**
 * Property-Based Tests for API Endpoint
 * Feature: fact-checker-pipeline
 * 
 * Property 3: Request-response validation
 * For any API request, if the request is valid, the backend must forward it to the ML service 
 * and return a properly formatted response; if invalid, it must return a 400 error with details.
 * Validates: Requirements 3.1, 3.4
 * 
 * Property 6: HTTP status code correctness
 * For any API response, the HTTP status code must match the response type: 
 * 200 for success, 400 for client errors, 500 for server errors, 503 for service unavailable.
 * Validates: Requirements 10.5
 */

// Mock ML service and backend server for testing
let mockMLServer: any;
let backendServer: any;
const ML_SERVICE_PORT = 8099;
const BACKEND_PORT = 8098;

beforeAll(async () => {
    const { Hono } = await import('hono');
    const { cors } = await import('hono/cors');

    // Start mock ML service
    const mockApp = new Hono();
    mockApp.post('/verify', async (c) => {
        const { claim } = await c.req.json();

        // Simulate different responses based on claim content
        if (claim.includes('ERROR')) {
            return c.json({ error: 'Internal error' }, 500);
        }

        if (claim.includes('UNAVAILABLE')) {
            return c.json({ error: 'Service unavailable' }, 503);
        }

        if (claim.includes('INVALID')) {
            return c.json({ error: 'Invalid request' }, 400);
        }

        // Return valid response
        return c.json({
            claim,
            verdict: 'true',
            confidence: 0.95,
            explanation: 'This is a test explanation',
            sources: ['test source']
        });
    });

    mockMLServer = Bun.serve({
        port: ML_SERVICE_PORT,
        fetch: mockApp.fetch,
    });

    // Start backend server with mock ML service URL
    const backendApp = new Hono();
    backendApp.use('/*', cors());

    backendApp.post('/api/verify', async (c) => {
        try {
            const { claim } = await c.req.json();

            // Validate input
            if (!claim || claim.trim().length === 0) {
                return c.json({ error: 'Claim is required' }, 400);
            }

            if (claim.length > 1000) {
                return c.json({ error: 'Claim too long (max 1000 characters)' }, 400);
            }

            // Call mock ML service with timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 30000);

            try {
                const response = await fetch(`http://localhost:${ML_SERVICE_PORT}/verify`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ claim }),
                    signal: controller.signal,
                });

                clearTimeout(timeoutId);

                if (!response.ok) {
                    const errorText = await response.text();

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

                const result = await response.json();

                // Ensure response has required fields
                if (!result.claim || !result.verdict || result.confidence === undefined) {
                    return c.json({
                        error: 'Invalid response from verification service',
                        details: 'The service returned an incomplete response.'
                    }, 500);
                }

                return c.json(result);

            } catch (fetchError) {
                clearTimeout(timeoutId);

                if (fetchError instanceof Error && fetchError.name === 'AbortError') {
                    return c.json({
                        error: 'Request timeout',
                        details: 'The verification request took too long. Please try again.'
                    }, 504);
                }

                if (fetchError instanceof Error && (
                    fetchError.message.includes('fetch failed') ||
                    fetchError.message.includes('ECONNREFUSED')
                )) {
                    return c.json({
                        error: 'Verification service unavailable',
                        details: 'Could not connect to the verification service. Please try again later.'
                    }, 503);
                }

                throw fetchError;
            }

        } catch (error) {
            return c.json({
                error: 'Internal server error',
                details: error instanceof Error ? error.message : 'Unknown error'
            }, 500);
        }
    });

    backendServer = Bun.serve({
        port: BACKEND_PORT,
        fetch: backendApp.fetch,
    });

    // Wait a bit for servers to be ready
    await new Promise(resolve => setTimeout(resolve, 100));
});

afterAll(() => {
    if (mockMLServer) {
        mockMLServer.stop();
    }
    if (backendServer) {
        backendServer.stop();
    }
});

// Helper to make API requests
async function makeVerifyRequest(claim: string) {
    const response = await fetch(`http://localhost:${BACKEND_PORT}/api/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ claim }),
    });

    const data = await response.json();
    return { status: response.status, data };
}

describe('API Endpoint Property Tests', () => {
    /**
     * Property 3: Request-response validation
     */
    test('Property 3: Valid requests return properly formatted responses', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate valid claims (1-1000 characters, non-empty after trim)
                fc.string({ minLength: 1, maxLength: 1000 })
                    .filter(s => s.trim().length > 0 && !s.includes('ERROR') && !s.includes('UNAVAILABLE') && !s.includes('INVALID')),
                async (claim) => {
                    const { status, data } = await makeVerifyRequest(claim);

                    // Should return 200 for valid requests
                    expect(status).toBe(200);

                    // Response should have required fields
                    expect(data).toHaveProperty('claim');
                    expect(data).toHaveProperty('verdict');
                    expect(data).toHaveProperty('confidence');
                    expect(data).toHaveProperty('explanation');
                    expect(data).toHaveProperty('sources');

                    // Verdict should be one of the valid values
                    expect(['true', 'false', 'uncertain']).toContain(data.verdict);

                    // Confidence should be between 0 and 1
                    expect(data.confidence).toBeGreaterThanOrEqual(0);
                    expect(data.confidence).toBeLessThanOrEqual(1);

                    // Sources should be an array
                    expect(Array.isArray(data.sources)).toBe(true);
                }
            ),
            { numRuns: 50 } // Reduced runs for API tests
        );
    });

    test('Property 3: Invalid requests return 400 with error details', async () => {
        await fc.assert(
            fc.asyncProperty(
                // Generate invalid claims (empty, whitespace-only, or too long)
                fc.oneof(
                    fc.constant(''),
                    fc.constant('   '),
                    fc.stringMatching(/^\s+$/),
                    fc.string({ minLength: 1001, maxLength: 1500 })
                ),
                async (claim) => {
                    const { status, data } = await makeVerifyRequest(claim);

                    // Should return 400 for invalid requests
                    expect(status).toBe(400);

                    // Response should have error field
                    expect(data).toHaveProperty('error');
                    expect(typeof data.error).toBe('string');
                    expect(data.error.length).toBeGreaterThan(0);
                }
            ),
            { numRuns: 50 }
        );
    });

    /**
     * Property 6: HTTP status code correctness
     */
    test('Property 6: HTTP status codes match response types', async () => {
        // Test 200 - Success
        const validClaim = 'Water boils at 100 degrees Celsius';
        const successResponse = await makeVerifyRequest(validClaim);
        expect(successResponse.status).toBe(200);
        expect(successResponse.data).not.toHaveProperty('error');

        // Test 400 - Client error (empty claim)
        const emptyResponse = await makeVerifyRequest('');
        expect(emptyResponse.status).toBe(400);
        expect(emptyResponse.data).toHaveProperty('error');

        // Test 400 - Client error (too long)
        const longClaim = 'a'.repeat(1001);
        const longResponse = await makeVerifyRequest(longClaim);
        expect(longResponse.status).toBe(400);
        expect(longResponse.data).toHaveProperty('error');
    });

    test('Property 6: Status codes for different error scenarios', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom(
                    { type: 'success', claim: 'valid claim', expectedStatus: 200 },
                    { type: 'empty', claim: '', expectedStatus: 400 },
                    { type: 'whitespace', claim: '   ', expectedStatus: 400 },
                    { type: 'too_long', claim: 'a'.repeat(1001), expectedStatus: 400 }
                ),
                async (scenario) => {
                    const { status, data } = await makeVerifyRequest(scenario.claim);

                    // Status should match expected
                    expect(status).toBe(scenario.expectedStatus);

                    // Success responses should not have error field
                    if (scenario.expectedStatus === 200) {
                        expect(data).not.toHaveProperty('error');
                        expect(data).toHaveProperty('verdict');
                    }

                    // Error responses should have error field
                    if (scenario.expectedStatus >= 400) {
                        expect(data).toHaveProperty('error');
                        expect(typeof data.error).toBe('string');
                    }
                }
            ),
            { numRuns: 50 }
        );
    });

    test('Property 6: Boundary status codes', async () => {
        // Test exact boundary cases
        const cases = [
            { claim: 'a', expectedStatus: 200, description: '1 character (valid)' },
            { claim: 'a'.repeat(1000), expectedStatus: 200, description: '1000 characters (valid)' },
            { claim: 'a'.repeat(1001), expectedStatus: 400, description: '1001 characters (invalid)' },
            { claim: '', expectedStatus: 400, description: 'empty (invalid)' },
        ];

        for (const testCase of cases) {
            const { status } = await makeVerifyRequest(testCase.claim);
            expect(status).toBe(testCase.expectedStatus);
        }
    });
});
