import { describe, it, expect, vi } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: fact-checker-pipeline, Property 8: Loading state consistency
 * 
 * Property 8: Loading state consistency
 * For any claim submission, the loading state must be true during API processing 
 * and false after completion (success or error).
 * Validates: Requirements 1.4
 */

// Simulate the loading state behavior from the Home component
class LoadingStateManager {
    private loading: boolean = false;
    private error: string = '';
    private result: any = null;

    async handleVerify(claim: string, apiCall: () => Promise<any>): Promise<void> {
        if (!claim.trim()) {
            this.error = 'Please enter a claim to verify';
            return;
        }

        // Set loading to true at start
        this.loading = true;
        this.error = '';
        this.result = null;

        try {
            const data = await apiCall();
            this.result = data;
        } catch (err) {
            this.error = 'Failed to verify claim';
        } finally {
            // Set loading to false after completion
            this.loading = false;
        }
    }

    getLoading(): boolean {
        return this.loading;
    }

    getError(): string {
        return this.error;
    }

    getResult(): any {
        return this.result;
    }
}

describe('Property 8: Loading state consistency', () => {
    it('should maintain loading state consistency for any claim submission (success case)', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 1000 }),
                fc.constantFrom('true', 'false', 'uncertain'),
                fc.double({ min: 0, max: 1 }),
                fc.string({ minLength: 10, maxLength: 200 }),
                fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
                async (claim, verdict, confidence, explanation, sources) => {
                    const manager = new LoadingStateManager();

                    // Mock successful API call
                    const mockApiCall = async () => {
                        // Simulate network delay
                        await new Promise(resolve => setTimeout(resolve, 10));
                        return {
                            claim,
                            verdict,
                            confidence,
                            explanation,
                            sources,
                        };
                    };

                    // Before verification, loading should be false
                    expect(manager.getLoading()).toBe(false);

                    // Start verification (don't await yet)
                    const verifyPromise = manager.handleVerify(claim, mockApiCall);

                    // During verification, loading should be true
                    // We check immediately after starting
                    expect(manager.getLoading()).toBe(true);

                    // Wait for completion
                    await verifyPromise;

                    // After completion, loading should be false
                    expect(manager.getLoading()).toBe(false);

                    // Result should be set
                    expect(manager.getResult()).toBeDefined();
                    expect(manager.getResult().verdict).toBe(verdict);
                    expect(manager.getError()).toBe('');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should maintain loading state consistency for any claim submission (error case)', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 1000 }),
                async (claim) => {
                    const manager = new LoadingStateManager();

                    // Mock failed API call
                    const mockApiCall = async () => {
                        // Simulate network delay
                        await new Promise(resolve => setTimeout(resolve, 10));
                        throw new Error('Network error');
                    };

                    // Before verification, loading should be false
                    expect(manager.getLoading()).toBe(false);

                    // Start verification (don't await yet)
                    const verifyPromise = manager.handleVerify(claim, mockApiCall);

                    // During verification, loading should be true
                    expect(manager.getLoading()).toBe(true);

                    // Wait for completion
                    await verifyPromise;

                    // After error, loading should be false
                    expect(manager.getLoading()).toBe(false);

                    // Error should be set
                    expect(manager.getError()).toBe('Failed to verify claim');
                    expect(manager.getResult()).toBeNull();
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should set loading to false even if API call takes time', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.string({ minLength: 1, maxLength: 1000 }),
                fc.integer({ min: 10, max: 100 }),
                async (claim, delay) => {
                    const manager = new LoadingStateManager();

                    // Mock API call with variable delay
                    const mockApiCall = async () => {
                        await new Promise(resolve => setTimeout(resolve, delay));
                        return {
                            claim,
                            verdict: 'true',
                            confidence: 0.9,
                            explanation: 'Test',
                            sources: [],
                        };
                    };

                    // Before verification
                    expect(manager.getLoading()).toBe(false);

                    // Start and complete verification
                    await manager.handleVerify(claim, mockApiCall);

                    // After completion, loading must be false
                    expect(manager.getLoading()).toBe(false);
                }
            ),
            { numRuns: 50 }
        );
    });

    it('should not process empty claims and keep loading false', async () => {
        await fc.assert(
            fc.asyncProperty(
                fc.constantFrom('', '   ', '\t', '\n'),
                async (emptyClaim) => {
                    const manager = new LoadingStateManager();

                    const mockApiCall = vi.fn();

                    // Before verification
                    expect(manager.getLoading()).toBe(false);

                    // Try to verify empty claim
                    await manager.handleVerify(emptyClaim, mockApiCall);

                    // Loading should remain false (no API call made)
                    expect(manager.getLoading()).toBe(false);

                    // API should not have been called
                    expect(mockApiCall).not.toHaveBeenCalled();

                    // Error should be set
                    expect(manager.getError()).toBe('Please enter a claim to verify');
                }
            ),
            { numRuns: 50 }
        );
    });
});
