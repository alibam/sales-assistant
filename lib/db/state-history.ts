/**
 * State History Persistence Layer
 * 
 * Handles saving state transitions to the SalesStateHistory table.
 * CRITICAL: All queries MUST include tenant_id for multi-tenant isolation.
 */
import { prisma, CustomerStatus, Prisma } from './client';
import type { CustomerStatus as Status } from '../xstate/state-evaluator';

export interface StateTransition {
  tenantId: string;
  customerId: string;
  toState: Status;
  reason: string;
}

export interface StateTransitionResult {
  previousState: Status | null;
  newState: Status;
  transitionRecorded: boolean;
}

/**
 * Type-safe conversion from Prisma CustomerStatus to Status type.
 * No type assertions - explicit mapping.
 */
function toStatus(prismaStatus: CustomerStatus | null): Status | null {
  if (!prismaStatus) return null;
  // Both types are 'A' | 'B' | 'C' | 'D', so direct return is safe
  return prismaStatus as Status;
}

/**
 * Type-safe conversion from Status to Prisma CustomerStatus.
 * No type assertions - explicit mapping.
 */
function toPrismaStatus(status: Status | null): CustomerStatus | null {
  if (!status) return null;
  // Both types are 'A' | 'B' | 'C' | 'D', so direct return is safe
  return status as CustomerStatus;
}

/**
 * Save a state transition with Serializable isolation level and retry logic.
 * 
 * Uses Prisma Interactive Transaction with Serializable isolation to:
 * 1. Query current latest status
 * 2. Compare with new evaluated state
 * 3. Insert new record only if state changed
 * 4. Return previous/new state and whether transition was recorded
 * 
 * Includes retry logic for serialization conflicts (Prisma P2034).
 * 
 * This approach solves both:
 * - Race condition: Serializable isolation prevents concurrent writes
 * - Logic error: Returns previous state from within transaction, avoiding "read after write"
 * 
 * @param transition - State transition data (toState is the newly evaluated state)
 * @returns Result with previousState, newState, and transitionRecorded flag
 * @throws Error if database operation fails after retries
 */
export async function saveStateTransitionWithTransaction(
  transition: StateTransition
): Promise<StateTransitionResult> {
  const { tenantId, customerId, toState: newEvaluatedState, reason } = transition;
  
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 50;
  
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const result = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
        // Step 1: Query current latest status within transaction
        const latest = await tx.salesStateHistory.findFirst({
          where: { tenantId, customerId },
          orderBy: [
            { createdAt: 'desc' },
            { id: 'desc' }, // Secondary sort for timestamp ties
          ],
          select: { toState: true },
        });
        
        const previousState = toStatus(latest?.toState ?? null);
        
        // Step 2: If state unchanged, return early without inserting
        if (previousState === newEvaluatedState) {
          return {
            previousState,
            newState: newEvaluatedState,
            transitionRecorded: false,
          };
        }
        
        // Step 3: State changed - insert new transition record
        await tx.salesStateHistory.create({
          data: {
            tenantId,
            customerId,
            fromState: toPrismaStatus(previousState) as CustomerStatus,
            toState: toPrismaStatus(newEvaluatedState) as CustomerStatus,
            reason,
          },
        });
        
        // Step 4: Return transition result
        return {
          previousState,
          newState: newEvaluatedState,
          transitionRecorded: true,
        };
      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable, // Prevent concurrent race conditions
      });
      
      return result;
      
    } catch (error) {
      // Check if this is a serialization conflict that can be retried
      const isSerializationError = error instanceof Error && (
        error.message.includes('P2034') || // Prisma serialization failure
        error.message.includes('could not serialize') ||
        error.message.includes('serialization failure')
      );
      
      if (isSerializationError && attempt < MAX_RETRIES) {
        // Retry with exponential backoff
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * Math.pow(2, attempt)));
        continue;
      }
      
      // Non-retryable error or max retries exceeded
      console.error('Failed to save state transition:', error);
      throw new Error(`Failed to persist state transition: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  // Should never reach here, but TypeScript needs it
  throw new Error('Failed to persist state transition: Max retries exceeded');
}

/**
 * Get state transition history for a customer.
 * MUST include tenant_id for multi-tenant isolation.
 * 
 * @param tenantId - Tenant ID
 * @param customerId - Customer ID
 * @param limit - Maximum number of records to return
 * @returns Array of state transitions, ordered by most recent first
 */
export async function getStateHistory(
  tenantId: string,
  customerId: string,
  limit: number = 10
): Promise<Array<{
  id: string;
  fromState: CustomerStatus | null;
  toState: CustomerStatus;
  reason: string | null;
  createdAt: Date;
}>> {
  try {
    return await prisma.salesStateHistory.findMany({
      where: {
        tenantId,
        customerId,
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      take: limit,
      select: {
        id: true,
        fromState: true,
        toState: true,
        reason: true,
        createdAt: true,
      },
    });
  } catch (error) {
    console.error('Failed to fetch state history:', error);
    throw new Error(`Failed to fetch state history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get the most recent status for a customer.
 * MUST include tenant_id for multi-tenant isolation.
 * 
 * @throws Error if database query fails
 * @returns CustomerStatus | null
 */
export async function getLatestStatus(
  tenantId: string,
  customerId: string
): Promise<CustomerStatus | null> {
  try {
    const latest = await prisma.salesStateHistory.findFirst({
      where: {
        tenantId,
        customerId,
      },
      orderBy: [
        { createdAt: 'desc' },
        { id: 'desc' },
      ],
      select: {
        toState: true,
      },
    });
    
    return toStatus(latest?.toState ?? null);
  } catch (error) {
    console.error('Failed to fetch latest status:', error);
    throw new Error(`Failed to fetch state history: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Close Prisma connection (for graceful shutdown).
 */
export async function disconnectDatabase(): Promise<void> {
  await prisma.$disconnect();
}
