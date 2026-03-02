/**
 * AI Provider Configuration
 * 
 * Centralized, environment-driven AI provider setup using @ai-sdk/openai.
 * Supports OpenAI-compatible APIs including:
 * - Third-party providers (development)
 * - Local Qwen inference service (production)
 * - Official OpenAI API
 */
import { createOpenAI } from '@ai-sdk/openai';

/**
 * Validate that all required environment variables are set.
 * @throws Error if any required variable is missing
 */
function validateEnvironment(): void {
  const required = ['OPENAI_BASE_URL', 'OPENAI_API_KEY', 'AI_MODEL_NAME'];
  const missing = required.filter((key) => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}\n` +
      'Please check your .env file and ensure all AI provider variables are set.'
    );
  }
}

/**
 * Create and configure the OpenAI-compatible provider.
 * Reads configuration from environment variables.
 */
function createAIProvider() {
  validateEnvironment();
  
  return createOpenAI({
    baseURL: process.env.OPENAI_BASE_URL!,
    apiKey: process.env.OPENAI_API_KEY!,
    compatibility: 'strict', // Use strict OpenAI compatibility mode
  });
}

/** Singleton provider instance */
let providerInstance: ReturnType<typeof createOpenAI> | null = null;

/**
 * Get the configured AI provider instance.
 * Creates the provider on first call and caches it.
 * 
 * @returns Configured OpenAI-compatible provider
 * @throws Error if environment variables are not set
 */
export function getAIProvider() {
  if (!providerInstance) {
    providerInstance = createAIProvider();
  }
  return providerInstance;
}

/**
 * Get the configured AI model for use with Vercel AI SDK.
 * 
 * @returns Configured model instance ready for generateObject/generateText
 * @throws Error if environment variables are not set
 * 
 * @example
 * ```ts
 * import { generateObject } from 'ai';
 * import { getAIModel } from './provider';
 * 
 * const { object } = await generateObject({
 *   model: getAIModel(),
 *   schema: mySchema,
 *   prompt: 'Extract data...'
 * });
 * ```
 */
export function getAIModel() {
  const provider = getAIProvider();
  const modelName = process.env.AI_MODEL_NAME!;
  return provider(modelName);
}

/**
 * Clear the cached provider instance (useful for testing).
 */
export function clearProviderCache(): void {
  providerInstance = null;
}
