/**
 * Gap Analysis API Route
 * 
 * POST /api/gap-analysis
 * Accepts sales rep input and optional existing profile, returns gap analysis result.
 * 
 * GET /api/gap-analysis
 * Returns API documentation and health check.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runGapAnalysis } from '@/lib/ai/gap-analysis';
import type { CustomerProfile } from '@/lib/ai/types';

// Request validation schema
const gapAnalysisRequestSchema = z.object({
  input: z.string().min(1, 'Input cannot be empty'),
  existingProfile: z.record(z.unknown()).optional(),
});

/**
 * POST /api/gap-analysis
 * Run gap analysis on sales rep input
 */
export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validation = gapAnalysisRequestSchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json(
        {
          error: 'Invalid request',
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }
    
    const { input, existingProfile } = validation.data;
    
    // Run gap analysis
    const result = await runGapAnalysis(
      input,
      existingProfile as Partial<CustomerProfile> | undefined
    );
    
    return NextResponse.json({
      success: true,
      data: result,
    });
    
  } catch (error) {
    console.error('Gap analysis error:', error);
    
    // Handle configuration errors
    if (error instanceof Error && error.message.includes('environment variables')) {
      return NextResponse.json(
        {
          error: 'Configuration error',
          message: 'AI provider is not properly configured. Please check environment variables.',
        },
        { status: 500 }
      );
    }
    
    // Handle AI provider errors
    if (error instanceof Error && (
      error.message.includes('API') ||
      error.message.includes('model') ||
      error.message.includes('provider')
    )) {
      return NextResponse.json(
        {
          error: 'AI provider error',
          message: 'Failed to communicate with AI service. Please try again.',
        },
        { status: 503 }
      );
    }
    
    // Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/gap-analysis
 * API documentation and health check
 */
export async function GET() {
  return NextResponse.json({
    name: 'Gap Analysis API',
    version: '1.0.0',
    description: 'Extract structured customer profile data and identify missing information gaps',
    endpoints: {
      POST: {
        description: 'Run gap analysis on sales rep input',
        body: {
          input: 'string (required) - Natural language input from sales rep',
          existingProfile: 'object (optional) - Existing customer profile to merge with',
        },
        response: {
          success: 'boolean',
          data: {
            extractedProfile: 'CustomerProfile - Newly extracted data',
            mergedProfile: 'CustomerProfile - Complete merged profile',
            gaps: 'ProfileGap[] - List of missing required fields',
            followUpPrompt: 'string - Generated follow-up question',
            completeness: 'number - Profile completeness percentage (0-100)',
          },
        },
      },
    },
    status: 'healthy',
  });
}
