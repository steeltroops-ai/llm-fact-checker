import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { POST, GET } from './route';
import { NextRequest } from 'next/server';

// Mock Redis
vi.mock('ioredis', () => {
    return {
        default: vi.fn().mockImplementation(() => ({
            on: vi.fn(),
            connect: vi.fn().mockResolvedValue(undefined),
            get: vi.fn().mockResolvedValue(null),
            setex: vi.fn().mockResolvedValue('OK'),
            quit: vi.fn().mockResolvedValue(undefined),
        })),
    };
});

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch as any;

describe('RAG Verify API Route', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        process.env.ML_SERVICE_URL = 'http://localhost:8001';
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('GET /api/rag/verify', () => {
        it('should return API information', async () => {
            const response = await GET();
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe('LLM Fact Checker RAG API');
            expect(data.status).toBe('ready');
            expect(data.version).toBe('1.0.0');
            expect(data.features).toBeInstanceOf(Array);
            expect(data.features.length).toBeGreaterThan(0);
        });

        it('should list RAG pipeline features', async () => {
            const response = await GET();
            const data = await response.json();

            expect(data.features).toContain('Claim and entity extraction using spaCy NER');
            expect(data.features).toContain('Vector-based fact retrieval from PIB database');
            expect(data.features).toContain('Evidence-based LLM comparison');
        });
    });

    describe('POST /api/rag/verify - Input Validation', () => {
        it('should reject empty claim', async () => {
            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: '' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Claim is required');
        });

        it('should reject whitespace-only claim', async () => {
            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: '   \n\t  ' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Claim is required');
        });

        it('should reject claim exceeding 2000 characters', async () => {
            const longClaim = 'a'.repeat(2001);
            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: longClaim }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Claim too long (max 2000 characters)');
        });

        it('should accept valid claim', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    claim: 'Test claim',
                    extracted_claim: {
                        text: 'Test claim',
                        entities: {},
                        confidence: 1.0,
                    },
                    verdict: 'true',
                    confidence: 0.9,
                    explanation: 'Verified',
                    reasoning: 'Confirmed',
                    evidence: [],
                    sources: [],
                    metadata: { total_time: 1.5 },
                }),
            });

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            const response = await POST(request);

            expect(response.status).toBe(200);
        });
    });

    describe('POST /api/rag/verify - ML Service Integration', () => {
        it('should call ML service RAG endpoint', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    claim: 'Test claim',
                    extracted_claim: {
                        text: 'Test claim',
                        entities: {},
                        confidence: 1.0,
                    },
                    verdict: 'true',
                    confidence: 0.9,
                    explanation: 'Verified',
                    reasoning: 'Confirmed',
                    evidence: [],
                    sources: [],
                    metadata: { total_time: 1.5 },
                }),
            });

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            await POST(request);

            expect(mockFetch).toHaveBeenCalledWith(
                'http://localhost:8001/rag/verify',
                expect.objectContaining({
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ claim: 'Test claim' }),
                })
            );
        });

        it('should return RAG response with all fields', async () => {
            const mockResponse = {
                claim: 'Government announced free electricity',
                extracted_claim: {
                    text: 'Government announced free electricity',
                    entities: {
                        ORG: ['Government'],
                        PRODUCT: ['electricity'],
                    },
                    confidence: 0.95,
                },
                verdict: 'true',
                confidence: 0.92,
                explanation: 'The claim is supported by Evidence 1 from PIB',
                reasoning: 'Step-by-step analysis confirms the claim',
                evidence: [
                    {
                        claim: 'Government announces free power for farmers',
                        similarity: 0.94,
                        source_url: 'https://pib.gov.in/001',
                        publication_date: '2024-01-15',
                        category: 'agriculture',
                    },
                ],
                sources: ['https://pib.gov.in/001'],
                metadata: {
                    extraction_time: 0.3,
                    retrieval_time: 0.2,
                    comparison_time: 1.0,
                    total_time: 1.5,
                    facts_retrieved: 1,
                },
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockResponse,
            });

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Government announced free electricity' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.claim).toBe(mockResponse.claim);
            expect(data.extracted_claim).toEqual(mockResponse.extracted_claim);
            expect(data.verdict).toBe(mockResponse.verdict);
            expect(data.confidence).toBe(mockResponse.confidence);
            expect(data.explanation).toBe(mockResponse.explanation);
            expect(data.reasoning).toBe(mockResponse.reasoning);
            expect(data.evidence).toEqual(mockResponse.evidence);
            expect(data.sources).toEqual(mockResponse.sources);
            expect(data.metadata).toEqual(mockResponse.metadata);
        });
    });

    describe('POST /api/rag/verify - Response Validation', () => {
        it('should validate verdict is one of valid values', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    claim: 'Test',
                    extracted_claim: { text: 'Test', entities: {}, confidence: 1.0 },
                    verdict: 'invalid_verdict',
                    confidence: 0.9,
                    explanation: 'Test',
                    reasoning: 'Test',
                    evidence: [],
                    sources: [],
                    metadata: { total_time: 1.0 },
                }),
            });

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toContain('Invalid response');
        });

        it('should validate confidence is in range [0, 1]', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    claim: 'Test',
                    extracted_claim: { text: 'Test', entities: {}, confidence: 1.0 },
                    verdict: 'true',
                    confidence: 1.5,
                    explanation: 'Test',
                    reasoning: 'Test',
                    evidence: [],
                    sources: [],
                    metadata: { total_time: 1.0 },
                }),
            });

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toContain('Invalid response');
        });

        it('should validate required fields are present', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    // Missing claim and verdict
                    confidence: 0.9,
                    explanation: 'Test',
                }),
            });

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toContain('Invalid response');
        });
    });

    describe('POST /api/rag/verify - Error Handling', () => {
        it('should handle 503 service unavailable', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 503,
                text: async () => 'Service unavailable',
            });

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(503);
            expect(data.error).toBe('RAG verification service unavailable');
        });

        it('should handle 500 internal server error', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                text: async () => 'Internal server error',
            });

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('RAG service error');
        });

        it('should handle 400 bad request', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                text: async () => 'Bad request',
            });

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(400);
            expect(data.error).toBe('Invalid request');
        });

        it('should handle network connection errors', async () => {
            mockFetch.mockRejectedValueOnce(new Error('fetch failed'));

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(503);
            expect(data.error).toBe('RAG verification service unavailable');
        });

        it('should handle timeout errors', async () => {
            const abortError = new Error('The operation was aborted');
            abortError.name = 'AbortError';
            mockFetch.mockRejectedValueOnce(abortError);

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(504);
            expect(data.error).toBe('Request timeout');
        });
    });

    describe('POST /api/rag/verify - Verdict Types', () => {
        it('should handle "true" verdict', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    claim: 'Test',
                    extracted_claim: { text: 'Test', entities: {}, confidence: 1.0 },
                    verdict: 'true',
                    confidence: 0.9,
                    explanation: 'Verified',
                    reasoning: 'Confirmed',
                    evidence: [],
                    sources: [],
                    metadata: { total_time: 1.0 },
                }),
            });

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.verdict).toBe('true');
        });

        it('should handle "false" verdict', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    claim: 'Test',
                    extracted_claim: { text: 'Test', entities: {}, confidence: 1.0 },
                    verdict: 'false',
                    confidence: 0.85,
                    explanation: 'Contradicted',
                    reasoning: 'Evidence shows otherwise',
                    evidence: [],
                    sources: [],
                    metadata: { total_time: 1.0 },
                }),
            });

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.verdict).toBe('false');
        });

        it('should handle "unverifiable" verdict', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ({
                    claim: 'Test',
                    extracted_claim: { text: 'Test', entities: {}, confidence: 1.0 },
                    verdict: 'unverifiable',
                    confidence: 0.5,
                    explanation: 'Insufficient evidence',
                    reasoning: 'No matching facts',
                    evidence: [],
                    sources: [],
                    metadata: { total_time: 1.0 },
                }),
            });

            const request = new NextRequest('http://localhost:3000/api/rag/verify', {
                method: 'POST',
                body: JSON.stringify({ claim: 'Test claim' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.verdict).toBe('unverifiable');
        });
    });
});
