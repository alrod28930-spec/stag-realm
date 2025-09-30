/**
 * Centralized Schema Registry
 * Single source of truth for all BID data structures with versioning
 */

import { z } from 'zod';

// ============================================================================
// CORE SCHEMAS (v1)
// ============================================================================

export const SymbolSchema = z.string().regex(/^[A-Z.]{1,10}$/, 'Invalid symbol format');

export const OrderProposalSchema = z.object({
  schema_version: z.literal('v1').default('v1'),
  run_id: z.string(),
  workspace_id: z.string().uuid(),
  symbol: SymbolSchema,
  side: z.enum(['buy', 'sell']),
  qty: z.number().int().positive('Quantity must be positive'),
  price: z.number().positive().optional(),
  stop_price: z.number().positive().optional(),
  limits: z.object({
    stop_loss_pct: z.number().min(0).max(0.2, 'Max stop loss 20%').optional(),
    take_profit_pct: z.number().min(0).max(0.5, 'Max take profit 50%').optional()
  }).optional(),
  order_type: z.enum(['market', 'limit', 'stop', 'stop_limit']),
  mode: z.enum(['paper', 'live']),
  time_in_force: z.enum(['day', 'gtc', 'ioc', 'fok']).optional(),
});

export const OrderRecordSchema = z.object({
  schema_version: z.literal('v1').default('v1'),
  workspace_id: z.string().uuid(),
  order_id: z.string(),
  run_id: z.string().optional(),
  symbol: SymbolSchema,
  side: z.enum(['buy', 'sell']),
  qty: z.number().positive('Quantity must be positive'),
  price: z.number().positive().optional(),
  stop_price: z.number().positive().optional(),
  limits: z.object({
    stop_loss_pct: z.number().min(0).max(0.2).optional(),
    take_profit_pct: z.number().min(0).max(0.5).optional()
  }).optional(),
  validator_status: z.enum(['pass', 'fail']).optional(),
  broker_status: z.enum(['proposed', 'placed', 'filled', 'canceled', 'rejected', 'error']).optional(),
  ts_created: z.string().datetime().optional(),
  ts_updated: z.string().datetime().optional(),
});

export const MarketSnapshotSchema = z.object({
  schema_version: z.literal('v1').default('v1'),
  workspace_id: z.string().uuid(),
  symbol: SymbolSchema,
  tf: z.enum(['1m', '5m', '15m', '1h', '1D']),
  ts: z.string().datetime(),
  o: z.number(),
  h: z.number(),
  l: z.number(),
  c: z.number(),
  v: z.number(),
  vwap: z.number().optional(),
});

export const OracleSignalSchema = z.object({
  schema_version: z.literal('v1').default('v1'),
  workspace_id: z.string().uuid(),
  symbol: SymbolSchema.optional(),
  signal_type: z.string(),
  strength: z.number().min(0).max(1),
  direction: z.number().int().min(-1).max(1),
  source: z.string().optional(),
  summary: z.string().optional(),
  ts: z.string().datetime().optional(),
});

export const RecorderEventSchema = z.object({
  schema_version: z.literal('v1').default('v1'),
  workspace_id: z.string().uuid(),
  user_id: z.string().uuid().optional(),
  event_type: z.string(),
  severity: z.number().int().min(1).max(5).default(1),
  entity_type: z.string().optional(),
  entity_id: z.string().optional(),
  summary: z.string().optional(),
  payload_json: z.record(z.any()).optional(),
  ts: z.string().datetime().optional(),
  correlation_id: z.string().optional(),
});

export const SummarySchema = z.object({
  schema_version: z.literal('v1').default('v1'),
  workspace_id: z.string().uuid(),
  scope: z.enum(['portfolio', 'symbol', 'session', 'system']),
  text: z.string(),
  source_refs: z.array(z.string()).optional(),
  ts: z.string().datetime().optional(),
});

export const StrategySchema = z.object({
  schema_version: z.literal('v1').default('v1'),
  workspace_id: z.string().uuid(),
  strategy_id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  rules: z.array(z.object({
    condition: z.string(),
    action: z.string(),
    weight: z.number().min(0).max(1),
  })),
  risk_params: z.object({
    max_position_pct: z.number().min(0).max(1),
    stop_loss_pct: z.number().min(0).max(1),
    take_profit_pct: z.number().min(0).max(1),
  }),
  active: z.boolean(),
});

// ============================================================================
// TYPE EXPORTS
// ============================================================================

export type OrderProposal = z.infer<typeof OrderProposalSchema>;
export type OrderRecord = z.infer<typeof OrderRecordSchema>;
export type MarketSnapshot = z.infer<typeof MarketSnapshotSchema>;
export type OracleSignal = z.infer<typeof OracleSignalSchema>;
export type RecorderEvent = z.infer<typeof RecorderEventSchema>;
export type Summary = z.infer<typeof SummarySchema>;
export type Strategy = z.infer<typeof StrategySchema>;

// ============================================================================
// VALIDATION UTILITIES
// ============================================================================

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult<T> {
  success: boolean;
  data?: T;
  errors?: ValidationError[];
  version?: string;
}

export function validateSchema<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
  context?: string
): ValidationResult<T> {
  const result = schema.safeParse(data);
  
  if (result.success) {
    return {
      success: true,
      data: result.data,
      version: (result.data as any).schema_version,
    };
  }
  
  const errors: ValidationError[] = result.error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
  }));
  
  console.error(`Schema validation failed${context ? ` (${context})` : ''}:`, errors);
  
  return {
    success: false,
    errors,
  };
}

// ============================================================================
// VERSION COMPATIBILITY
// ============================================================================

export function isCompatibleVersion(recordVersion: string, supportedVersion: string): boolean {
  // Simple version check - could be enhanced for semver
  return recordVersion === supportedVersion;
}

export function getSchemaVersion(data: any): string {
  return data?.schema_version || 'unknown';
}
