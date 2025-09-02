// Strategy Library Types - Playbooks, sizing, management rules, etc.

export interface Playbook {
  id: string;
  name: string;
  description?: string;
  setup_rules_json: Record<string, any>;
  confirm_rules_json: Record<string, any>;
  exit_rules_json: Record<string, any>;
  rr_default: number;
  stop_style: 'wide' | 'standard' | 'tight' | 'very_tight';
  enabled: boolean;
}

export interface SizingStrategy {
  name: string;
  formula: string;
  constraints_json?: Record<string, any>;
}

export interface ManagementRule {
  id: string;
  setup: string;
  triggers_json: Record<string, any>;
  actions_json: Record<string, any>;
}

export interface RegimeSignal {
  ts: string;
  symbol_class: string;
  features_json: Record<string, any>;
  regime_label: 'trend' | 'range' | 'high_vol' | 'low_vol';
}

export interface MarketEvent {
  ts: string;
  symbol?: string;
  event_type: 'earnings' | 'CPI' | 'FOMC' | 'opex' | 'rebalance' | 'holiday';
  severity: number;
  blackout_rules_json?: Record<string, any>;
}

export interface ExecutionTactic {
  name: string;
  venue_rules_json?: Record<string, any>;
  size_buckets_json?: Record<string, any>;
}

export interface NicheEdge {
  id: string;
  name: string;
  hypothesis?: string;
  detection_rules_json: Record<string, any>;
  guardrails_json?: Record<string, any>;
  backtest_notes?: string;
  enabled: boolean;
}

// Strategy eligibility for different modes
export interface StrategySet {
  playbooks: Playbook[];
  nicheEdges: NicheEdge[];
  regime: RegimeSignal | null;
  blackoutEvents: MarketEvent[];
}

// Mode-specific strategy configuration
export const STRATEGY_ELIGIBILITY: Record<string, {
  description: string;
  playbook_names: string[];
  allow_niche_edges: boolean;
  niche_confidence_threshold?: number;
}> = {
  '1p': {
    description: 'Conservative: High-quality setups only',
    playbook_names: ['Momentum_Pullback', 'VWAP_Reversion', 'ATR_Channel_Bounce'],
    allow_niche_edges: false
  },
  '2p': {
    description: 'Moderate: Balanced opportunity set',
    playbook_names: ['Momentum_Pullback', 'VWAP_Reversion', 'ATR_Channel_Bounce', 'ORB_Breakout', 'Breakout_Retest', 'Inside_Day_Break'],
    allow_niche_edges: false
  },
  '5p': {
    description: 'Aggressive: High-frequency with select edges',
    playbook_names: ['Momentum_Pullback', 'VWAP_Reversion', 'ATR_Channel_Bounce', 'ORB_Breakout', 'Breakout_Retest', 'Inside_Day_Break', 'Scalp_LiquidityBurst'],
    allow_niche_edges: true,
    niche_confidence_threshold: 0.75
  },
  '10p': {
    description: 'Very Aggressive: Full opportunity set with oversight',
    playbook_names: ['Momentum_Pullback', 'VWAP_Reversion', 'ATR_Channel_Bounce', 'ORB_Breakout', 'Breakout_Retest', 'Inside_Day_Break', 'Scalp_LiquidityBurst', '2B_Reversal'],
    allow_niche_edges: true,
    niche_confidence_threshold: 0.55
  }
};