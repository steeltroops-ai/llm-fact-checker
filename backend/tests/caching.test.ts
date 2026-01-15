import { describe, test, expect, beforeAll, afterAll } from 'bun:test';
import { CacheManager } from '../cache';

/**
 * Unit Tests for Caching Functionality
 * 
 * Tests cache hit, cache miss, and cache failure scenarios
 * Validates: Requirements 5.1, 5.3
 */

describe('Cache Manager Unit Tests', () => {
    let cacheManager: CacheManager;

    beforeAll(() => {
        // Create a new cache manager instance for testing
        cacheManager = new CacheManager();
        // Give it a moment to attempt connection
        return new Promise(resolve => setTimeout(resolve, 100));
    });

    afterAll(async () => {
        // Clean up
        await cacheManager.close();
    });

    test('Cache miss scenario - returns null for non-existent key', async () => {
        // Test that getting a non-existent key returns null
        const claim = 'This is a unique test claim that should not exist in cache';
        const result = await cacheManager.get(claim);

        expect(result).toBeNull();
    });

    test('Cache hit scenario - stores and retrieves data correctly', async () => {
        // Skip if Redis is not available
        if (!cacheManager.isReady()) {
            console.log('⚠️ Skipping cache hit test - Redis not available');
            return;
        }

        const claim = 'Water boils at 100 degrees Celsius';
        const testResult = {
            claim: claim,
            verdict: 'true',
            confidence: 0.95,
            explanation: 'This is scientifically accurate',
            sources: ['Science textbook']
        };

        // Store in cache
        await cacheManager.set(claim, testResult);

        // Retrieve from cache
        const cached = await cacheManager.get(claim);

        // Verify the cached result matches what we stored
        expect(cached).not.toBeNull();
        expect(cached.claim).toBe(testResult.claim);
        expect(cached.verdict).toBe(testResult.verdict);
        expect(cached.confidence).toBe(testResult.confidence);
        expect(cached.explanation).toBe(testResult.explanation);
        expect(cached.sources).toEqual(testResult.sources);
    });

    test('Cache key normalization - same claim with different casing', async () => {
        // Skip if Redis is not available
        if (!cacheManager.isReady()) {
            console.log('⚠️ Skipping normalization test - Redis not available');
            return;
        }

        const claim1 = 'The Earth is Round';
        const claim2 = 'the earth is round';
        const claim3 = 'THE EARTH IS ROUND';

        const testResult = {
            claim: claim1,
            verdict: 'true',
            confidence: 0.99,
            explanation: 'The Earth is approximately spherical',
            sources: ['NASA']
        };

        // Store with first variation
        await cacheManager.set(claim1, testResult);

        // All variations should retrieve the same cached result
        const cached1 = await cacheManager.get(claim1);
        const cached2 = await cacheManager.get(claim2);
        const cached3 = await cacheManager.get(claim3);

        expect(cached1).not.toBeNull();
        expect(cached2).not.toBeNull();
        expect(cached3).not.toBeNull();

        // All should have the same verdict
        expect(cached1?.verdict).toBe('true');
        expect(cached2?.verdict).toBe('true');
        expect(cached3?.verdict).toBe('true');
    });

    test('Cache key normalization - same claim with different whitespace', async () => {
        // Skip if Redis is not available
        if (!cacheManager.isReady()) {
            console.log('⚠️ Skipping whitespace test - Redis not available');
            return;
        }

        const claim1 = 'Water is wet';
        const claim2 = '  Water is wet  ';
        const claim3 = 'Water is wet   ';

        const testResult = {
            claim: claim1,
            verdict: 'true',
            confidence: 1.0,
            explanation: 'Water exhibits wetness',
            sources: ['Physics']
        };

        // Store with first variation
        await cacheManager.set(claim1, testResult);

        // All variations should retrieve the same cached result
        const cached1 = await cacheManager.get(claim1);
        const cached2 = await cacheManager.get(claim2);
        const cached3 = await cacheManager.get(claim3);

        expect(cached1).not.toBeNull();
        expect(cached2).not.toBeNull();
        expect(cached3).not.toBeNull();
    });

    test('Cache failure handling - gracefully handles unavailable Redis', async () => {
        // This test verifies that cache operations don't throw errors
        // even when Redis is unavailable

        const claim = 'Test claim for failure handling';
        const testResult = {
            claim: claim,
            verdict: 'uncertain',
            confidence: 0.5,
            explanation: 'Test explanation',
            sources: []
        };

        // These operations should not throw errors
        await expect(cacheManager.set(claim, testResult)).resolves.toBeUndefined();
        await expect(cacheManager.get(claim)).resolves.toBeDefined();
    });

    test('Cache availability check', () => {
        // Test that isReady() returns a boolean
        const isReady = cacheManager.isReady();
        expect(typeof isReady).toBe('boolean');

        // Log the status for debugging
        if (isReady) {
            console.log('✅ Cache is available');
        } else {
            console.log('⚠️ Cache is not available (this is OK for testing)');
        }
    });

    test('Cache stores complex objects correctly', async () => {
        // Skip if Redis is not available
        if (!cacheManager.isReady()) {
            console.log('⚠️ Skipping complex object test - Redis not available');
            return;
        }

        const claim = 'Complex test claim';
        const complexResult = {
            claim: claim,
            verdict: 'false',
            confidence: 0.85,
            explanation: 'This is a detailed explanation with special characters: !@#$%^&*()',
            sources: [
                'Source 1 with special chars: <>&"',
                'Source 2 with unicode: 你好世界',
                'Source 3 with emoji: 🔬🧪'
            ],
            metadata: {
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            }
        };

        // Store complex object
        await cacheManager.set(claim, complexResult);

        // Retrieve and verify
        const cached = await cacheManager.get(claim);

        expect(cached).not.toBeNull();
        expect(cached.verdict).toBe(complexResult.verdict);
        expect(cached.confidence).toBe(complexResult.confidence);
        expect(cached.explanation).toBe(complexResult.explanation);
        expect(cached.sources).toEqual(complexResult.sources);
        expect(cached.metadata).toEqual(complexResult.metadata);
    });

    test('Cache miss after different claim', async () => {
        // Skip if Redis is not available
        if (!cacheManager.isReady()) {
            console.log('⚠️ Skipping different claim test - Redis not available');
            return;
        }

        const claim1 = 'First unique claim for testing';
        const claim2 = 'Second unique claim for testing';

        const result1 = {
            claim: claim1,
            verdict: 'true',
            confidence: 0.9,
            explanation: 'First explanation',
            sources: []
        };

        // Store first claim
        await cacheManager.set(claim1, result1);

        // Second claim should not be in cache
        const cached2 = await cacheManager.get(claim2);
        expect(cached2).toBeNull();

        // First claim should still be in cache
        const cached1 = await cacheManager.get(claim1);
        expect(cached1).not.toBeNull();
        expect(cached1?.verdict).toBe('true');
    });
});
