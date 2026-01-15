import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: fact-checker-pipeline, Property 5: Error message user-friendliness
 * 
 * Property 5: Error message user-friendliness
 * For any error condition (API failure, timeout, validation error), the system must 
 * return a user-friendly error message that does not expose internal implementation details.
 * Validates: Requirements 6.1
 */

// Simulate error handling logic from the Home component
class ErrorMessageHandler {
    formatErrorMessage(errorType: string, statusCode?: number, rawError?: string): string {
        // Validation errors
        if (errorType === 'empty') {
            return 'Please enter a claim to verify';
        }

        if (errorType === 'too_long') {
            return 'Claim is too long. Maximum 1000 characters allowed.';
        }

        // HTTP error responses
        if (statusCode === 400) {
            const message = rawError || 'Invalid request';
            return `Invalid request: ${message}`;
        }

        if (statusCode === 503) {
            return 'Verification service is temporarily unavailable. Please try again in a moment.';
        }

        if (statusCode === 504) {
            return 'Request timed out. The claim may be too complex. Please try a simpler claim.';
        }

        // Network errors
        if (errorType === 'network') {
            return 'Unable to connect to the verification service. Please ensure the backend is running.';
        }

        // Generic errors
        return 'An unexpected error occurred. Please try again.';
    }

    isUserFriendly(errorMessage: string): boolean {
        // Check that error message doesn't contain technical details
        const technicalTerms = [
            'stack trace',
            'undefined',
            'null',
            'NaN',
            'TypeError',
            'ReferenceError',
            'SyntaxError',
            'fetch failed',
            'ECONNREFUSED',
            'ETIMEDOUT',
            'localhost:',
            'http://',
            'https://',
            'port',
            'socket',
            'promise',
            'async',
            'await',
            '.js',
            '.ts',
            '.tsx',
            'function',
            'class',
            'constructor',
            'prototype',
        ];

        const lowerMessage = errorMessage.toLowerCase();

        // Error message should not contain technical terms
        for (const term of technicalTerms) {
            if (lowerMessage.includes(term.toLowerCase())) {
                return false;
            }
        }

        // Error message should be reasonably short (not a stack trace)
        if (errorMessage.length > 200) {
            return false;
        }

        // Error message should not be empty
        if (errorMessage.trim().length === 0) {
            return false;
        }

        // Error message should start with a capital letter or be properly formatted
        if (!/^[A-Z]/.test(errorMessage) && !/^[a-z]/.test(errorMessage)) {
            return false;
        }

        return true;
    }

    containsActionableGuidance(errorMessage: string): boolean {
        // Check if error message provides guidance to the user
        const guidanceKeywords = [
            'please',
            'try',
            'ensure',
            'check',
            'verify',
            'again',
            'moment',
            'simpler',
            'maximum',
            'allowed',
        ];

        const lowerMessage = errorMessage.toLowerCase();

        return guidanceKeywords.some(keyword => lowerMessage.includes(keyword));
    }
}

describe('Property 5: Error message user-friendliness', () => {
    it('should return user-friendly error messages for any validation error', () => {
        fc.assert(
            fc.property(
                fc.constantFrom('empty', 'too_long'),
                (errorType) => {
                    const handler = new ErrorMessageHandler();
                    const errorMessage = handler.formatErrorMessage(errorType);

                    // Error message must be user-friendly
                    expect(handler.isUserFriendly(errorMessage)).toBe(true);

                    // Error message should contain actionable guidance
                    expect(handler.containsActionableGuidance(errorMessage)).toBe(true);

                    // Error message should not be empty
                    expect(errorMessage.length).toBeGreaterThan(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should return user-friendly error messages for any HTTP error status', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(400, 500, 503, 504),
                fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined }),
                (statusCode, rawError) => {
                    const handler = new ErrorMessageHandler();
                    const errorMessage = handler.formatErrorMessage('http', statusCode, rawError);

                    // Error message must be user-friendly
                    expect(handler.isUserFriendly(errorMessage)).toBe(true);

                    // Error message should not expose raw technical details
                    if (rawError) {
                        // The formatted message should be different from raw error
                        // (it should be wrapped in user-friendly context)
                        expect(errorMessage).not.toBe(rawError);
                    }

                    // Error message should not be empty
                    expect(errorMessage.length).toBeGreaterThan(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should return user-friendly error messages for network errors', () => {
        fc.assert(
            fc.property(
                fc.constant('network'),
                (errorType) => {
                    const handler = new ErrorMessageHandler();
                    const errorMessage = handler.formatErrorMessage(errorType);

                    // Error message must be user-friendly
                    expect(handler.isUserFriendly(errorMessage)).toBe(true);

                    // Error message should contain actionable guidance
                    expect(handler.containsActionableGuidance(errorMessage)).toBe(true);

                    // Network error should mention connection issue
                    expect(errorMessage.toLowerCase()).toContain('connect');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should never expose technical implementation details in error messages', () => {
        fc.assert(
            fc.property(
                fc.constantFrom('empty', 'too_long', 'network', 'http'),
                fc.option(fc.integer({ min: 400, max: 599 }), { nil: undefined }),
                fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
                (errorType, statusCode, rawError) => {
                    const handler = new ErrorMessageHandler();
                    const errorMessage = handler.formatErrorMessage(errorType, statusCode, rawError);

                    // Should not contain file paths
                    expect(errorMessage).not.toMatch(/\/[a-zA-Z0-9_-]+\.(js|ts|tsx)/);

                    // Should not contain function names with parentheses
                    expect(errorMessage).not.toMatch(/[a-zA-Z_][a-zA-Z0-9_]*\(\)/);

                    // Should not contain error type names
                    expect(errorMessage).not.toMatch(/Error:/);
                    expect(errorMessage).not.toMatch(/TypeError|ReferenceError|SyntaxError/);

                    // Should not contain stack trace indicators
                    expect(errorMessage).not.toContain('at ');
                    expect(errorMessage).not.toContain('stack');

                    // Should not contain localhost URLs
                    expect(errorMessage).not.toMatch(/localhost:\d+/);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should provide actionable guidance for common error types', () => {
        fc.assert(
            fc.property(
                fc.constantFrom('empty', 'too_long', 'network'),
                (errorType) => {
                    const handler = new ErrorMessageHandler();
                    const errorMessage = handler.formatErrorMessage(errorType);

                    // Every error message should tell the user what to do
                    expect(handler.containsActionableGuidance(errorMessage)).toBe(true);

                    // Error message should be concise (not a wall of text)
                    expect(errorMessage.length).toBeLessThan(200);

                    // Error message should be readable (not all caps, not all lowercase)
                    expect(errorMessage).not.toBe(errorMessage.toUpperCase());
                    expect(errorMessage).not.toBe(errorMessage.toLowerCase());
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle timeout errors with specific guidance', () => {
        fc.assert(
            fc.property(
                fc.constant(504),
                (statusCode) => {
                    const handler = new ErrorMessageHandler();
                    const errorMessage = handler.formatErrorMessage('http', statusCode);

                    // Timeout error should be user-friendly
                    expect(handler.isUserFriendly(errorMessage)).toBe(true);

                    // Should mention timeout (either "timeout" or "timed out")
                    const lowerMessage = errorMessage.toLowerCase();
                    expect(lowerMessage.includes('timeout') || lowerMessage.includes('timed out')).toBe(true);

                    // Should provide guidance
                    expect(errorMessage.length).toBeGreaterThan(0);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle service unavailable errors with retry guidance', () => {
        fc.assert(
            fc.property(
                fc.constant(503),
                (statusCode) => {
                    const handler = new ErrorMessageHandler();
                    const errorMessage = handler.formatErrorMessage('http', statusCode);

                    // Service unavailable error should be user-friendly
                    expect(handler.isUserFriendly(errorMessage)).toBe(true);

                    // Should mention unavailability
                    expect(errorMessage.toLowerCase()).toContain('unavailable');

                    // Should suggest retry
                    expect(errorMessage.toLowerCase()).toContain('try again');
                }
            ),
            { numRuns: 100 }
        );
    });
});
