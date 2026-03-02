/**
 * Gap Analysis Integration Service (修复版 v4 - XState 驱动)
 * 
 * 修复：
 * 1. 使用 XState Actor 驱动状态评估和持久化
 * 2. 让状态机做决定，不绕过状态机直接持久化
 * 3. 始终返回 classification（即使无租户）
 */
import { createActor, waitFor } from 'xstate';
import { runGapAnalysis } from '../ai/gap-analysis';
import { evaluateCustomerStatus, detectMomentum } from '../xstate/state-evaluator';
import { createSalesMachine } from '../xstate/sales-machine';
import type { CustomerProfile } from '../ai/types';

export interface GapAnalysisWithStateResult {
  extractedProfile: CustomerProfile;
  mergedProfile: CustomerProfile;
  gaps: Array<{
    section: string;
    sectionTitle: string;
    field: string;
    description: string;
    isRequired: boolean;
    priority: 'critical' | 'high' | 'normal';
  }>;
  followUpPrompt: string;
  completeness: number;
  classification: {
    status: 'A' | 'B' | 'C' | 'D';
    reason: string;
    confidence: 'high' | 'medium' | 'low';
  };
  stateTransition?: {
    from: 'A' | 'B' | 'C' | 'D' | null;
    to: 'A' | 'B' | 'C' | 'D';
    momentum: 'up' | 'down' | 'stable';
    reason: string;
  };
  statePersistenceError?: string;
}

/**
 * Run gap analysis with XState-driven state evaluation.
 * 
 * - Classification is ALWAYS returned (regardless of tenant)
 * - State persistence only occurs when tenant/customer provided
 * - Uses XState Actor for proper event-driven state transitions
 */
export async function runGapAnalysisWithState(
  input: string,
  existingProfile: Partial<CustomerProfile> | undefined,
  tenantId: string | undefined,
  customerId: string | undefined
): Promise<GapAnalysisWithStateResult> {
  // Step 1: Run gap analysis (always)
  const gapResult = await runGapAnalysis(input, existingProfile);
  
  // Step 2: Evaluate classification (always)
  const classification = evaluateCustomerStatus(gapResult.mergedProfile);
  
  // Step 3: If tenant/customer provided, use XState Actor for state management
  let stateTransition: GapAnalysisWithStateResult['stateTransition'] = undefined;
  let statePersistenceError: string | undefined = undefined;
  
  if (tenantId && customerId) {
    try {
      // Create and start XState actor
      const machine = createSalesMachine(tenantId, customerId, gapResult.mergedProfile);
      const actor = createActor(machine);
      
      actor.start();
      
      // Send evaluation event to state machine
      actor.send({ type: 'EVALUATE_PROFILE', profile: gapResult.mergedProfile });
      
      // Wait for machine to reach final state or error
      const finalSnapshot = await waitFor(
        actor,
        (snapshot) => snapshot.status === 'done' || snapshot.matches('error'),
        { timeout: 10000 } // 10 second timeout
      );
      
      // Stop actor
      actor.stop();
      
      // Check if successful
      if (finalSnapshot.status === 'done' && finalSnapshot.context.classification) {
        const previousStatus = finalSnapshot.context.currentStatus;
        const newStatus = finalSnapshot.context.classification.status;
        
        // Only create stateTransition if status actually changed
        if (previousStatus !== newStatus) {
          const momentum = detectMomentum(previousStatus, newStatus);
          
          stateTransition = {
            from: previousStatus,
            to: newStatus,
            momentum,
            reason: finalSnapshot.context.classification.reason,
          };
        }
      } else if (finalSnapshot.matches('error')) {
        statePersistenceError = finalSnapshot.context.error || 'State machine error';
      }
      
    } catch (error) {
      statePersistenceError = error instanceof Error ? error.message : 'Unknown state machine error';
    }
  }
  
  return {
    ...gapResult,
    classification: {
      status: classification.status,
      reason: classification.reason,
      confidence: classification.confidence,
    },
    stateTransition,
    statePersistenceError,
  };
}
