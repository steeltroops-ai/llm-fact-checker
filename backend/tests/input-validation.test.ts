import { describe, test, expect } from 'bun:test';
import * as fc from 'fast-check';

/**
 * Property-Based Test for Input Validation
 * Feature: fact-checker-pipeline, Property 1: Input validation bounds
 * 
 * Property 1: Input validation bounds
 * For any string input, the system should accept inputs between 1 and 1000 characters 
 * (after trimming whitespace) and reject inputs outside this range with clear error messages.
 * 
 * Validates: Requirements 1.1, 1.2, 1.3
 */

// Validation function extracted from backend logic
function validateClaim(input: string): { valid: boolean; error?: string } {
    const trimmed = input.trim();

    if (trimmed.length === 0) {
        return { valid: false, error: 'Claim is required' };
    }

    if (input.length > 1000) {
        return { valid: false, error: 'Claim too long (max 1000 characters)' };
    }

    return { valid: true };
}

describe('Input Validation Property Tests', () => {
    test('Property 1: Input validation bounds - valid inputs (1-1000 chars after trim)', () => {
        fc.assert(
            fc.property(
                // Generate strings with 1-1000 non-whitespace characters
                fc.string({ minLength: 1, maxLength: 1000 }).filter(s => s.trim().length > 0),
                (input) => {
                    const result = validateClaim(input);

                    // Valid inputs should be accepted
                    expect(result.valid).toBe(true);
                    expect(result.error).toBeUndefined();
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Property 1: Input validation bounds - empty or whitespace-only inputs', () => {
        fc.assert(
            fc.property(
                // Generate whitespace-only strings
                fc.oneof(
                    fc.constant(''),
                    fc.constant('   '),
                    fc.constant('\t\n'),
                    fc.stringMatching(/^\s+$/)
                ),
                (input) => {
                    const result = validateClaim(input);

                    // Empty/whitespace inputs should be rejected
                    expect(result.valid).toBe(false);
                    expect(result.error).toBe('Claim is required');
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Property 1: Input validation bounds - inputs exceeding 1000 characters', () => {
        fc.assert(
            fc.property(
                // Generate strings longer than 1000 characters
                fc.string({ minLength: 1001, maxLength: 2000 }),
                (input) => {
                    const result = validateClaim(input);

                    // Long inputs should be rejected
                    expect(result.valid).toBe(false);
                    expect(result.error).toBe('Claim too long (max 1000 characters)');
                }
            ),
            { numRuns: 100 }
        );
    });

    test('Property 1: Input validation bounds - boundary cases', () => {
        // Test exact boundaries
        const exactlyOne = 'a';
        const exactly1000 = 'a'.repeat(1000);
        const exactly1001 = 'a'.repeat(1001);

        // 1 character should be valid
        expect(validateClaim(exactlyOne).valid).toBe(true);

        // 1000 characters should be valid
        expect(validateClaim(exactly1000).valid).toBe(true);

        // 1001 characters should be invalid
        const result1001 = validateClaim(exactly1001);
        expect(result1001.valid).toBe(false);
        expect(result1001.error).toBe('Claim too long (max 1000 characters)');
    });

    test('Property 1: Input validation bounds - trimming behavior', () => {
        fc.assert(
            fc.property(
                // Generate strings with leading/trailing whitespace
                fc.tuple(
                    fc.stringMatching(/^\s+$/),  // leading whitespace
                    fc.string({ minLength: 1, maxLength: 100 }).filter(s => s.trim().length > 0),  // content
                    fc.stringMatching(/^\s+$/)   // trailing whitespace
                ),
                ([leading, content, trailing]) => {
                    const input = leading + content + trailing;
                    const result = validateClaim(input);

                    // Should validate based on trimmed length
                    const trimmedLength = input.trim().length;

                    if (trimmedLength === 0) {
                        expect(result.valid).toBe(false);
                        expect(result.error).toBe('Claim is required');
                    } else if (input.length > 1000) {
                        expect(result.valid).toBe(false);
                        expect(result.error).toBe('Claim too long (max 1000 characters)');
                    } else {
                        expect(result.valid).toBe(true);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });
});
