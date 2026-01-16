import { NextRequest, NextResponse } from 'next/server';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:8001';

interface FeedbackRequest {
  claim_id: string;
  claim: string;
  verdict: string;
  helpful: boolean;
  comment?: string;
}

/**
 * POST /api/rag/feedback
 * Submit user feedback for a verification result
 */
export async function POST(request: NextRequest) {
  try {
    const body: FeedbackRequest = await request.json();

    // Validate required fields
    if (!body.claim_id || !body.claim || !body.verdict || typeof body.helpful !== 'boolean') {
      return NextResponse.json(
        { error: 'Missing required fields: claim_id, claim, verdict, helpful' },
        { status: 400 }
      );
    }

    // Forward to ML service
    const response = await fetch(`${ML_SERVICE_URL}/feedback`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        claim_id: body.claim_id,
        claim: body.claim,
        verdict: body.verdict,
        helpful: body.helpful,
        comment: body.comment || ''
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json(
        { error: errorData.detail || 'Failed to submit feedback' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);

  } catch (error) {
    console.error('Feedback API error:', error);
    
    // Handle connection errors gracefully
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { error: 'ML service unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
