import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

/**
 * Feature: fact-checker-pipeline, Property 7: UI verdict display mapping
 * 
 * Property 7: UI verdict display mapping
 * For any verification result displayed in the UI, the color coding must correctly 
 * map verdicts (true → green, false → red, uncertain → yellow) and confidence must 
 * be displayed as a percentage (0-100%).
 * Validates: Requirements 7.2, 7.3
 */

// Simulate the UI display logic from the Home component
class UIDisplayMapper {
    getVerdictColor(verdict: string): string {
        switch (verdict) {
            case 'true': return 'green';
            case 'false': return 'red';
            case 'uncertain': return 'yellow';
            default: return 'yellow'; // Default to yellow for unknown verdicts
        }
    }

    getVerdictColorClass(verdict: string): string {
        switch (verdict) {
            case 'true': return 'from-[#10B981] to-[#059669]';
            case 'false': return 'from-[#EF4444] to-[#DC2626]';
            default: return 'from-[#F59E0B] to-[#D97706]';
        }
    }

    getVerdictBgClass(verdict: string): string {
        switch (verdict) {
            case 'true': return 'bg-[#10B981]/10 border-[#10B981]/20';
            case 'false': return 'bg-[#EF4444]/10 border-[#EF4444]/20';
            default: return 'bg-[#F59E0B]/10 border-[#F59E0B]/20';
        }
    }

    getVerdictTextClass(verdict: string): string {
        switch (verdict) {
            case 'true': return 'text-[#10B981]';
            case 'false': return 'text-[#EF4444]';
            default: return 'text-[#F59E0B]';
        }
    }

    formatConfidenceAsPercentage(confidence: number): string {
        // Confidence should be between 0.0 and 1.0
        // Convert to percentage (0-100)
        const percentage = Math.round(confidence * 100);
        return `${percentage}%`;
    }

    isValidConfidenceRange(confidence: number): boolean {
        return confidence >= 0.0 && confidence <= 1.0;
    }

    extractColorFromClass(colorClass: string): string {
        // Extract the hex color from Tailwind class
        if (colorClass.includes('#10B981')) return 'green';
        if (colorClass.includes('#EF4444')) return 'red';
        if (colorClass.includes('#F59E0B')) return 'yellow';
        return 'unknown';
    }
}

describe('Property 7: UI verdict display mapping', () => {
    it('should correctly map "true" verdict to green color for any result', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 1000 }),
                fc.double({ min: 0, max: 1 }),
                fc.string({ minLength: 10, maxLength: 200 }),
                fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
                (claim, confidence, explanation, sources) => {
                    const mapper = new UIDisplayMapper();
                    const verdict = 'true';

                    // Color mapping should be green
                    expect(mapper.getVerdictColor(verdict)).toBe('green');

                    // Color class should contain green hex code
                    const colorClass = mapper.getVerdictColorClass(verdict);
                    expect(mapper.extractColorFromClass(colorClass)).toBe('green');

                    // Background class should contain green hex code
                    const bgClass = mapper.getVerdictBgClass(verdict);
                    expect(mapper.extractColorFromClass(bgClass)).toBe('green');

                    // Text class should contain green hex code
                    const textClass = mapper.getVerdictTextClass(verdict);
                    expect(mapper.extractColorFromClass(textClass)).toBe('green');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should correctly map "false" verdict to red color for any result', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 1000 }),
                fc.double({ min: 0, max: 1 }),
                fc.string({ minLength: 10, maxLength: 200 }),
                fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
                (claim, confidence, explanation, sources) => {
                    const mapper = new UIDisplayMapper();
                    const verdict = 'false';

                    // Color mapping should be red
                    expect(mapper.getVerdictColor(verdict)).toBe('red');

                    // Color class should contain red hex code
                    const colorClass = mapper.getVerdictColorClass(verdict);
                    expect(mapper.extractColorFromClass(colorClass)).toBe('red');

                    // Background class should contain red hex code
                    const bgClass = mapper.getVerdictBgClass(verdict);
                    expect(mapper.extractColorFromClass(bgClass)).toBe('red');

                    // Text class should contain red hex code
                    const textClass = mapper.getVerdictTextClass(verdict);
                    expect(mapper.extractColorFromClass(textClass)).toBe('red');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should correctly map "uncertain" verdict to yellow color for any result', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 1000 }),
                fc.double({ min: 0, max: 1 }),
                fc.string({ minLength: 10, maxLength: 200 }),
                fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
                (claim, confidence, explanation, sources) => {
                    const mapper = new UIDisplayMapper();
                    const verdict = 'uncertain';

                    // Color mapping should be yellow
                    expect(mapper.getVerdictColor(verdict)).toBe('yellow');

                    // Color class should contain yellow hex code
                    const colorClass = mapper.getVerdictColorClass(verdict);
                    expect(mapper.extractColorFromClass(colorClass)).toBe('yellow');

                    // Background class should contain yellow hex code
                    const bgClass = mapper.getVerdictBgClass(verdict);
                    expect(mapper.extractColorFromClass(bgClass)).toBe('yellow');

                    // Text class should contain yellow hex code
                    const textClass = mapper.getVerdictTextClass(verdict);
                    expect(mapper.extractColorFromClass(textClass)).toBe('yellow');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should display confidence as percentage (0-100%) for any valid confidence value', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 1, noNaN: true }),
                fc.constantFrom('true', 'false', 'uncertain'),
                (confidence, verdict) => {
                    const mapper = new UIDisplayMapper();

                    // Confidence should be in valid range
                    expect(mapper.isValidConfidenceRange(confidence)).toBe(true);

                    // Format as percentage
                    const percentageStr = mapper.formatConfidenceAsPercentage(confidence);

                    // Should end with %
                    expect(percentageStr).toMatch(/%$/);

                    // Extract numeric value
                    const numericValue = parseInt(percentageStr.replace('%', ''), 10);

                    // Should be between 0 and 100
                    expect(numericValue).toBeGreaterThanOrEqual(0);
                    expect(numericValue).toBeLessThanOrEqual(100);

                    // Should match the expected conversion
                    const expectedPercentage = Math.round(confidence * 100);
                    expect(numericValue).toBe(expectedPercentage);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should consistently map the same verdict to the same color across all results', () => {
        fc.assert(
            fc.property(
                fc.constantFrom('true', 'false', 'uncertain'),
                fc.array(
                    fc.record({
                        claim: fc.string({ minLength: 1, maxLength: 1000 }),
                        confidence: fc.double({ min: 0, max: 1 }),
                        explanation: fc.string({ minLength: 10, maxLength: 200 }),
                        sources: fc.array(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 0, maxLength: 5 }),
                    }),
                    { minLength: 2, maxLength: 10 }
                ),
                (verdict, results) => {
                    const mapper = new UIDisplayMapper();

                    // Get the expected color for this verdict
                    const expectedColor = mapper.getVerdictColor(verdict);

                    // All results with the same verdict should map to the same color
                    for (const result of results) {
                        expect(mapper.getVerdictColor(verdict)).toBe(expectedColor);

                        // Color classes should be consistent
                        const colorClass = mapper.getVerdictColorClass(verdict);
                        expect(mapper.extractColorFromClass(colorClass)).toBe(expectedColor);
                    }
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle edge case confidence values correctly', () => {
        fc.assert(
            fc.property(
                fc.constantFrom(0.0, 0.001, 0.5, 0.999, 1.0),
                fc.constantFrom('true', 'false', 'uncertain'),
                (confidence, verdict) => {
                    const mapper = new UIDisplayMapper();

                    // Should be valid
                    expect(mapper.isValidConfidenceRange(confidence)).toBe(true);

                    // Should format correctly
                    const percentageStr = mapper.formatConfidenceAsPercentage(confidence);
                    expect(percentageStr).toMatch(/^\d+%$/);

                    // Extract and verify
                    const numericValue = parseInt(percentageStr.replace('%', ''), 10);
                    expect(numericValue).toBeGreaterThanOrEqual(0);
                    expect(numericValue).toBeLessThanOrEqual(100);
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should map all three verdict types to distinct colors', () => {
        fc.assert(
            fc.property(
                fc.constant(null),
                () => {
                    const mapper = new UIDisplayMapper();

                    const trueColor = mapper.getVerdictColor('true');
                    const falseColor = mapper.getVerdictColor('false');
                    const uncertainColor = mapper.getVerdictColor('uncertain');

                    // All three colors should be different
                    expect(trueColor).not.toBe(falseColor);
                    expect(trueColor).not.toBe(uncertainColor);
                    expect(falseColor).not.toBe(uncertainColor);

                    // Verify the specific mappings
                    expect(trueColor).toBe('green');
                    expect(falseColor).toBe('red');
                    expect(uncertainColor).toBe('yellow');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should format confidence with proper rounding for display', () => {
        fc.assert(
            fc.property(
                fc.double({ min: 0, max: 1, noNaN: true }),
                (confidence) => {
                    const mapper = new UIDisplayMapper();

                    const percentageStr = mapper.formatConfidenceAsPercentage(confidence);
                    const numericValue = parseInt(percentageStr.replace('%', ''), 10);

                    // Manual calculation
                    const expectedValue = Math.round(confidence * 100);

                    // Should match
                    expect(numericValue).toBe(expectedValue);

                    // Should be an integer (no decimals)
                    expect(percentageStr).not.toContain('.');
                }
            ),
            { numRuns: 100 }
        );
    });

    it('should handle unknown verdict types with a default color', () => {
        fc.assert(
            fc.property(
                fc.string({ minLength: 1, maxLength: 20 }).filter(
                    s => s !== 'true' && s !== 'false' && s !== 'uncertain'
                ),
                (unknownVerdict) => {
                    const mapper = new UIDisplayMapper();

                    // Unknown verdicts should default to yellow (uncertain)
                    const color = mapper.getVerdictColor(unknownVerdict);
                    expect(color).toBe('yellow');

                    // Color classes should also default to yellow
                    const colorClass = mapper.getVerdictColorClass(unknownVerdict);
                    expect(mapper.extractColorFromClass(colorClass)).toBe('yellow');
                }
            ),
            { numRuns: 100 }
        );
    });
});
