/**
 * AI Configuration - Cost-Optimized Model Selection
 * 
 * Uses GPT-4o-mini for 90% of tasks to minimize costs while maintaining quality.
 * Reserves GPT-4o for premium features only (drafts, AI clone chat).
 * 
 * Estimated Monthly Cost: $10-15/month (vs $150-200 with GPT-4o for everything)
 */

export type AIModel = 'gpt-4o-mini' | 'gpt-4o' | 'gpt-3.5-turbo';

export type TaskType =
  | 'sentiment'
  | 'engagement'
  | 'topics'
  | 'entities'
  | 'tasks'
  | 'insights'
  | 'context'
  | 'drafts'
  | 'chat'
  | 'mindmap';

/**
 * AI Model Pricing (per 1M tokens)
 */
export const MODEL_PRICING = {
  'gpt-4o-mini': {
    input: 0.15,  // $0.15 per 1M input tokens
    output: 0.60, // $0.60 per 1M output tokens
  },
  'gpt-4o': {
    input: 2.50,  // $2.50 per 1M input tokens
    output: 10.00, // $10.00 per 1M output tokens
  },
  'gpt-3.5-turbo': {
    input: 0.50,  // $0.50 per 1M input tokens
    output: 1.50, // $1.50 per 1M output tokens
  },
};

/**
 * AI Configuration
 */
export const AI_CONFIG = {
  // Default model for 90% of tasks (cost-effective)
  defaultModel: 'gpt-4o-mini' as AIModel,

  // Task-specific model routing
  models: {
    // Ultra-low cost operations (GPT-4o-mini)
    sentiment: 'gpt-4o-mini' as AIModel,
    engagement: 'gpt-4o-mini' as AIModel,
    topics: 'gpt-4o-mini' as AIModel,
    entities: 'gpt-4o-mini' as AIModel,
    tasks: 'gpt-4o-mini' as AIModel,
    insights: 'gpt-4o-mini' as AIModel,
    context: 'gpt-4o-mini' as AIModel,
    mindmap: 'gpt-4o-mini' as AIModel,

    // Premium features (GPT-4o for quality)
    drafts: 'gpt-4o' as AIModel,
    chat: 'gpt-4o' as AIModel,
  },

  // Rate limits and cost controls
  limits: {
    maxTokensPerRequest: 4000,        // Prevent huge requests
    maxRequestsPerMinute: 10,         // Rate limiting
    maxRequestsPerHour: 300,          // Hourly cap
    dailyBudget: 1.00,                // $1/day = $30/month
    monthlyBudget: 20.00,             // Alert if exceeded
    warningThreshold: 0.80,           // Alert at 80% of budget
  },

  // Caching configuration
  cache: {
    enabled: true,
    ttl: 30 * 24 * 60 * 60,          // 30 days in seconds
    prefix: 'ai:',
    maxSize: 10000,                   // Max cached items
  },

  // Batch processing
  batch: {
    enabled: true,
    maxBatchSize: 10,                 // Process up to 10 items together
    batchTimeout: 5000,               // 5 seconds timeout
  },

  // Temperature settings by task
  temperature: {
    sentiment: 0.3,     // Low variance for consistency
    engagement: 0.3,
    topics: 0.5,
    entities: 0.3,
    tasks: 0.4,
    insights: 0.4,
    context: 0.5,
    mindmap: 0.6,
    drafts: 0.7,        // More creative
    chat: 0.8,          // Most creative
  },

  // Max tokens by task (output)
  maxOutputTokens: {
    sentiment: 200,
    engagement: 300,
    topics: 400,
    entities: 500,
    tasks: 600,
    insights: 600,
    context: 400,
    mindmap: 800,
    drafts: 1500,
    chat: 1000,
  },
};

/**
 * Select the appropriate model for a task
 */
export function selectModel(taskType: TaskType): AIModel {
  return AI_CONFIG.models[taskType] || AI_CONFIG.defaultModel;
}

/**
 * Get temperature for a task
 */
export function getTemperature(taskType: TaskType): number {
  return AI_CONFIG.temperature[taskType] || 0.5;
}

/**
 * Get max output tokens for a task
 */
export function getMaxTokens(taskType: TaskType): number {
  return AI_CONFIG.maxOutputTokens[taskType] || 1000;
}

/**
 * Calculate cost of an API call
 */
export function calculateCost(
  model: AIModel,
  inputTokens: number,
  outputTokens: number
): number {
  const pricing = MODEL_PRICING[model];
  const inputCost = (inputTokens / 1_000_000) * pricing.input;
  const outputCost = (outputTokens / 1_000_000) * pricing.output;
  return inputCost + outputCost;
}

/**
 * Cost tracking
 */
export interface CostMetrics {
  date: string;
  model: AIModel;
  taskType: TaskType;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  cached: boolean;
}

/**
 * Generate cache key for AI responses
 */
export function generateCacheKey(
  taskType: TaskType,
  input: string,
  options?: Record<string, any>
): string {
  const hash = require('crypto')
    .createHash('sha256')
    .update(JSON.stringify({ taskType, input, options }))
    .digest('hex')
    .substring(0, 16);

  return `${AI_CONFIG.cache.prefix}${taskType}:${hash}`;
}

/**
 * Check if we're within budget
 */
export function isWithinBudget(currentSpend: number, period: 'daily' | 'monthly'): boolean {
  const limit = period === 'daily' 
    ? AI_CONFIG.limits.dailyBudget 
    : AI_CONFIG.limits.monthlyBudget;
  
  return currentSpend < limit;
}

/**
 * Check if approaching budget limit
 */
export function shouldAlert(currentSpend: number, period: 'daily' | 'monthly'): boolean {
  const limit = period === 'daily' 
    ? AI_CONFIG.limits.dailyBudget 
    : AI_CONFIG.limits.monthlyBudget;
  
  const threshold = limit * AI_CONFIG.limits.warningThreshold;
  return currentSpend >= threshold;
}

export default AI_CONFIG;
