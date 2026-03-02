/**
 * Gap Analysis API Route
 * 
 * POST /api/gap-analysis
 * Accepts sales rep input and optional existing profile.
 * Runs gap analysis + state evaluation.
 * 
 * SECURITY NOTE: In production, tenantId MUST come from authenticated session,
 * not from request body. Current implementation is for development only.
 * 
 * GET /api/gap-analysis
 * Returns API documentation and health check.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runGapAnalysisWithState } from '@/lib/services/gap-analysis-service';
import type { CustomerProfile } from '@/lib/ai/types';

// Infer types from Zod schemas for type safety
const sceneSchema = z.object({
  usage_scenario: z.string().optional(),
  key_motives: z.array(z.string()).optional(),
  must_haves: z.array(z.string()).optional(),
  compromisable: z.array(z.string()).optional(),
});

const preferenceSchema = z.object({
  intent_model: z.string().optional(),
  config_preference: z.array(z.string()).optional(),
  color_and_inventory: z.string().optional(),
});

const budgetPaymentSchema = z.object({
  budget_limit: z.string().optional(),
  payment_method: z.enum(['全款', '贷款', '分期', '融资租赁', '未知']).optional(),
  price_sensitivity: z.enum(['高', '中', '低', '未知']).optional(),
});

const timingSchema = z.object({
  delivery_timeline: z.enum(['3天', '1周', '本月', '不急', '未知']).optional(),
  trigger_event: z.string().optional(),
});

const decisionUnitSchema = z.object({
  decision_maker_involved: z.boolean().optional(),
  payer: z.string().optional(),
  family_visit_required: z.boolean().optional(),
  objection_source: z.string().optional(),
});

const competitorSchema = z.object({
  competing_models: z.array(z.string()).optional(),
  has_quote: z.boolean().optional(),
  main_conflict: z.enum(['价格', '配置', '品牌', '保值', '续航', '空间', '无', '未知']).optional(),
});

const dealFactorsSchema = z.object({
  trade_in_info: z.string().optional(),
  finance_info: z.string().optional(),
  delivery_acceptance: z.string().optional(),
});

const blockersSchema = z.object({
  main_blocker: z.enum(['价格', '竞品', '决策人', '金融', '置换', '现车', '信任', '时间', '无']).optional(),
  intensity: z.enum(['高', '中', '低', '无']).optional(),
  needs_manager: z.boolean().optional(),
});

const customerProfileSchema = z.object({
  scene: sceneSchema.optional(),
  preference: preferenceSchema.optional(),
  budget_payment: budgetPaymentSchema.optional(),
  timing: timingSchema.optional(),
  decision_unit: decisionUnitSchema.optional(),
  competitor: competitorSchema.optional(),
  deal_factors: dealFactorsSchema.optional(),
  blockers: blockersSchema.optional(),
});

// Request schema - strict mode to reject unknown fields
const gapAnalysisRequestSchema = z.object({
  input: z.string().min(1, 'Input cannot be empty'),
  existingProfile: customerProfileSchema.optional(),
  // SECURITY: In production, remove these from request body
  // tenantId should come from auth context/middleware
  tenantId: z.string().uuid().optional(),
  customerId: z.string().uuid().optional(),
}).strict();

// Type inference from schema
type GapAnalysisRequest = z.infer<typeof gapAnalysisRequestSchema>;

/**
 * POST /api/gap-analysis
 * Run gap analysis and state evaluation on sales rep input
 */
export async function POST(request: NextRequest) {
  try {
    // Parse JSON body with proper error handling
    let body;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON', message: 'Request body must be valid JSON' },
        { status: 400 }
      );
    }
    
    // Validate request with strict schema
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
    
    const { input, existingProfile, tenantId, customerId } = validation.data;
    
    // TODO(Milestone 5): Security - tenantId MUST be extracted from Auth context, not request body.
    // RISK ACCEPTANCE: CEO has acknowledged this security risk and signed off on deferring
    // the fix to Milestone 5 when the global authentication middleware will be implemented.
    // Current implementation is for development/testing only.
    
    // Validate existingProfile with Zod if provided
    let validatedProfile: Partial<CustomerProfile> | undefined = undefined;
    if (existingProfile) {
      const profileValidation = customerProfileSchema.partial().safeParse(existingProfile);
      if (!profileValidation.success) {
        return NextResponse.json(
          {
            error: 'Invalid existingProfile',
            details: profileValidation.error.errors,
          },
          { status: 400 }
        );
      }
      validatedProfile = profileValidation.data;
    }
    
    // Run gap analysis with state evaluation
    const result = await runGapAnalysisWithState(
      input,
      validatedProfile,
      tenantId,
      customerId
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
          message: 'AI provider is not properly configured.',
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
          message: 'Failed to communicate with AI service.',
        },
        { status: 503 }
      );
    }
    
    // Generic error
    return NextResponse.json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
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
    version: '2.0.0',
    description: 'Extract customer profile, identify gaps, evaluate A/B/C/D status',
    endpoints: {
      POST: {
        description: 'Run gap analysis and state evaluation',
        requestBody: {
          input: 'string (required) - Natural language input from sales rep',
          existingProfile: 'CustomerProfile (optional) - Existing profile to merge',
          tenantId: 'string (optional) - Tenant ID for state persistence',
          customerId: 'string (optional) - Customer ID for state persistence',
        },
        response: {
          success: 'boolean',
          data: {
            extractedProfile: 'CustomerProfile - Newly extracted data',
            mergedProfile: 'CustomerProfile - Complete merged profile',
            gaps: 'ProfileGap[] - Missing required fields',
            followUpPrompt: 'string - Follow-up question',
            completeness: 'number - Profile completeness (0-100)',
            classification: {
              status: '"A" | "B" | "C" | "D" - Customer status',
              reason: 'string - Classification reason',
              confidence: '"high" | "medium" | "low"',
            },
            stateTransition: '{ from, to, momentum, reason } | undefined - State transition if status changed',
            statePersistenceError: 'string | undefined - Error if persistence failed',
          },
        },
      },
    },
    status: 'healthy',
  });
}
