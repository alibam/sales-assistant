/**
 * Sales Lifecycle State Machine
 * 
 * XState v5 machine for managing A/B/C/D customer status transitions.
 * Ensures all state changes go through proper guards and actions.
 */
import { setup, assign, fromPromise } from 'xstate';
import type { CustomerProfile } from '../ai/types';
import { evaluateCustomerStatus, type CustomerStatus, type ClassificationResult } from './state-evaluator';
import { saveStateTransitionWithTransaction, getLatestStatus } from '../db/state-history';

export interface SalesMachineContext {
  tenantId: string;
  customerId: string;
  profile: CustomerProfile;
  currentStatus: CustomerStatus | null;
  classification: ClassificationResult | null;
  error: string | null;
}

export type SalesMachineEvent =
  | { type: 'EVALUATE_PROFILE'; profile: CustomerProfile }
  | { type: 'RETRY' };

/**
 * Create a sales lifecycle state machine instance.
 * 
 * @param tenantId - Tenant ID for multi-tenant isolation
 * @param customerId - Customer ID
 * @param initialProfile - Initial customer profile
 * @returns XState machine instance
 */
export const createSalesMachine = (
  tenantId: string,
  customerId: string,
  initialProfile: CustomerProfile
) => {
  return setup({
    types: {
      context: {} as SalesMachineContext,
      events: {} as SalesMachineEvent,
    },
    actors: {
      fetchCurrentStatus: fromPromise(async ({ input }: { input: { tenantId: string; customerId: string } }) => {
        return await getLatestStatus(input.tenantId, input.customerId);
      }),
      evaluateAndPersist: fromPromise(async ({ input }: { 
        input: { 
          tenantId: string; 
          customerId: string; 
          profile: CustomerProfile; 
          currentStatus: CustomerStatus | null 
        } 
      }) => {
        const { tenantId, customerId, profile, currentStatus } = input;
        
        // Evaluate new status
        const classification = evaluateCustomerStatus(profile);
        
        // Only persist if status changed
        if (currentStatus !== classification.status) {
          const transitionResult = await saveStateTransitionWithTransaction({
            tenantId,
            customerId,
            toState: classification.status,
            reason: classification.reason,
          });
          
          // Use result from transaction
          if (transitionResult.transitionRecorded) {
            // Transition was successfully recorded
          }
        }
        
        return classification;
      }),
    },
  }).createMachine({
    id: 'salesLifecycle',
    initial: 'idle',
    context: {
      tenantId,
      customerId,
      profile: initialProfile,
      currentStatus: null,
      classification: null,
      error: null,
    },
    states: {
      idle: {
        on: {
          EVALUATE_PROFILE: {
            target: 'fetchingCurrentStatus',
            actions: assign({
              profile: ({ event }) => event.profile,
              error: null,
            }),
          },
        },
      },
      fetchingCurrentStatus: {
        invoke: {
          src: 'fetchCurrentStatus',
          input: ({ context }) => ({
            tenantId: context.tenantId,
            customerId: context.customerId,
          }),
          onDone: {
            target: 'evaluating',
            actions: assign({
              currentStatus: ({ event }) => event.output,
            }),
          },
          onError: {
            target: 'error',
            actions: assign({
              error: ({ event }) => 
                event.error instanceof Error ? event.error.message : 'Failed to fetch current status',
            }),
          },
        },
      },
      evaluating: {
        invoke: {
          src: 'evaluateAndPersist',
          input: ({ context }) => ({
            tenantId: context.tenantId,
            customerId: context.customerId,
            profile: context.profile,
            currentStatus: context.currentStatus,
          }),
          onDone: {
            target: 'success',
            actions: assign({
              classification: ({ event }) => event.output,
            }),
          },
          onError: {
            target: 'error',
            actions: assign({
              error: ({ event }) => 
                event.error instanceof Error ? event.error.message : 'Evaluation failed',
            }),
          },
        },
      },
      success: {
        type: 'final',
      },
      error: {
        on: {
          RETRY: 'fetchingCurrentStatus',
        },
      },
    },
  });
};
