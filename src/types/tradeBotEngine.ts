// Enhanced TradeBot Engine Types - Comprehensive autonomous trading system

export type BotRunMode = 'research' | 'paper' | 'live' | 'halted';
export type BotExecutionStatus = 'idle' | 'analyzing' | 'trading' | 'learning' | 'error';
export type LearningMode = 'backtest' | 'forward_test' | 'parameter_optimization' | 'strategy_adaptation';

export interface TradeBotEngine {
  // Core Identity
  id: string;
  name: string;
  description: string;
  template_id?: string;
  run_id: string; // Unique per deployment instance
  
  // Operational State
  mode: BotRunMode;
  status: BotExecutionStatus;
  created_at: Date;
  activated_at?: Date;
  deactivated_at?: Date;
  last_heartbeat: Date;
  
  // Configuration
  config: BotEngineConfig;
  
  // Performance Tracking
  metrics: BotPerformanceMetrics;
  
  // Learning System
  learning: BotLearningState;
  
  // Audit Trail
  audit: BotAuditTrail;
}

export interface BotEngineConfig {
  // Core Strategy
  strategy: BotStrategy;
  allocation: number;
  risk_tolerance: number; // 0-1
  
  // Execution Parameters
  max_position_size: number;
  max_daily_trades: number;
  max_concurrent_positions: number;
  
  // Risk Controls (Validator Integration)
  stop_loss_pct: number;
  take_profit_pct: number;
  max_drawdown_pct: number;
  daily_loss_halt_pct: number;
  
  // Market Filters
  min_stock_price: number;
  min_volume_usd: number;
  blacklisted_symbols: string[];
  whitelisted_symbols?: string[];
  sectors?: string[];
  
  // Signal Thresholds (Oracle Integration)
  signal_confidence_min: number;
  oracle_sources: string[];
  timeframes: string[];
  
  // ML Prediction Settings
  prediction_model: 'logistic_regression' | 'gradient_boost' | 'ensemble';
  feature_window: number; // days of historical data
  retrain_frequency: number; // days between retraining
  
  // Learning Controls
  learning_enabled: boolean;
  learning_rate: number;
  parameter_bounds: Record<string, { min: number; max: number }>;
  
  // Backtesting
  backtest_period: number; // days
  backtest_frequency: number; // hours between backtests
  
  // Explainability (Analyst Integration)
  explanation_detail: 'minimal' | 'standard' | 'detailed';
  log_decisions: boolean;
}

export interface BotPerformanceMetrics {
  // Trade Statistics
  total_trades: number;
  winning_trades: number;
  losing_trades: number;
  win_rate: number;
  
  // Financial Performance
  total_return: number;
  total_return_pct: number;
  sharpe_ratio: number;
  sortino_ratio: number;
  max_drawdown: number;
  max_drawdown_pct: number;
  
  // Risk Metrics
  value_at_risk: number;
  expected_shortfall: number;
  beta: number;
  alpha: number;
  
  // Execution Quality
  avg_hold_time: number; // hours
  avg_trade_size: number;
  slippage_avg: number;
  commission_paid: number;
  
  // Recent Performance (last 30 days)
  recent_trades: number;
  recent_return_pct: number;
  recent_win_rate: number;
  
  // Daily/Session Stats
  daily_trades_today: number;
  daily_pnl_today: number;
  session_start_equity: number;
  current_equity: number;
  
  // Updated Timestamps
  last_updated: Date;
  performance_calculated_at: Date;
}

export interface BotLearningState {
  // Model State
  model_version: string;
  model_trained_at?: Date;
  model_accuracy: number;
  model_feature_count: number;
  
  // Learning History
  learning_sessions: BotLearningSession[];
  parameter_changes: BotParameterChange[];
  
  // Backtest Results
  backtest_results: BotBacktestResult[];
  last_backtest_at?: Date;
  
  // Performance Adaptation
  adaptation_enabled: boolean;
  last_adaptation_at?: Date;
  adaptation_score: number; // How well adaptations are working
  
  // Feature Engineering
  active_features: string[];
  feature_importance: Record<string, number>;
  feature_correlation: Record<string, number>;
}

export interface BotLearningSession {
  id: string;
  started_at: Date;
  completed_at?: Date;
  type: LearningMode;
  
  // Data Used
  data_period_start: Date;
  data_period_end: Date;
  sample_count: number;
  
  // Results
  accuracy_before: number;
  accuracy_after: number;
  parameters_changed: Record<string, any>;
  
  // Validation
  cross_validation_score: number;
  out_of_sample_score: number;
  
  success: boolean;
  error_message?: string;
  
  // Resource Usage
  training_time_ms: number;
  memory_used_mb: number;
}

export interface BotParameterChange {
  id: string;
  timestamp: Date;
  trigger: 'learning' | 'backtest' | 'manual' | 'risk_control';
  
  // Changes Made
  parameter_name: string;
  old_value: any;
  new_value: any;
  reason: string;
  
  // Impact Tracking
  trades_since_change: number;
  performance_impact: number;
  confidence_level: number;
  
  // Approval/Override
  approved_by: 'system' | 'user' | 'risk_system';
  can_revert: boolean;
}

export interface BotBacktestResult {
  id: string;
  run_at: Date;
  
  // Test Parameters
  start_date: Date;
  end_date: Date;
  initial_capital: number;
  
  // Strategy Tested
  config_snapshot: Partial<BotEngineConfig>;
  strategy_version: string;
  
  // Results
  final_capital: number;
  total_return: number;
  total_return_pct: number;
  max_drawdown_pct: number;
  sharpe_ratio: number;
  
  // Trade Analysis
  total_trades: number;
  win_rate: number;
  avg_trade_return: number;
  best_trade: number;
  worst_trade: number;
  
  // Risk Analysis
  value_at_risk_95: number;
  expected_shortfall: number;
  volatility: number;
  
  // Execution Simulation
  avg_slippage: number;
  total_commission: number;
  
  // Comparison to Benchmark
  benchmark_return: number;
  alpha: number;
  beta: number;
  information_ratio: number;
  
  // Confidence Metrics
  statistical_significance: number;
  confidence_interval_lower: number;
  confidence_interval_upper: number;
  
  // Detailed Results
  daily_returns: number[];
  trade_log: BacktestTrade[];
  equity_curve: { date: Date; equity: number }[];
  
  success: boolean;
  error_message?: string;
}

export interface BacktestTrade {
  date: Date;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  commission: number;
  slippage: number;
  pnl: number;
  pnl_pct: number;
  hold_time_hours: number;
  
  // Signal Data
  signal_confidence: number;
  signal_sources: string[];
  
  // Exit Reason
  exit_reason: 'take_profit' | 'stop_loss' | 'time_exit' | 'signal_reversal' | 'risk_control';
}

export interface BotAuditTrail {
  // Decision Log (for Analyst explanations)
  decisions: BotDecision[];
  
  // Risk Events
  risk_events: BotRiskEvent[];
  
  // System Events
  system_events: BotSystemEvent[];
  
  // Compliance Records
  compliance_checks: BotComplianceCheck[];
}

export interface BotDecision {
  id: string;
  timestamp: Date;
  decision_type: 'trade_entry' | 'trade_exit' | 'position_size' | 'risk_adjustment' | 'no_action';
  
  // Context
  symbol?: string;
  market_conditions: Record<string, any>;
  oracle_signals: Array<{
    type: string;
    strength: number;
    confidence: number;
    source: string;
  }>;
  
  // Decision Process
  hypothesis: string;
  supporting_evidence: string[];
  risk_factors: string[];
  
  // Outcome
  action_taken: string;
  confidence_level: number;
  expected_outcome: string;
  
  // Explanation (for Analyst)
  explanation_short: string;
  explanation_detailed: string;
  
  // Actual Result (populated later)
  actual_outcome?: string;
  outcome_accuracy?: number;
}

export interface BotRiskEvent {
  id: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  
  event_type: 'position_limit' | 'loss_limit' | 'drawdown_limit' | 'blacklist_trigger' | 'manual_halt';
  description: string;
  
  // Action Taken
  action: 'warning' | 'position_reduce' | 'position_close' | 'bot_halt' | 'override';
  action_reason: string;
  
  // Impact
  positions_affected: number;
  financial_impact: number;
  
  // Recovery
  resolved: boolean;
  resolved_at?: Date;
  resolution_action?: string;
}

export interface BotSystemEvent {
  id: string;
  timestamp: Date;
  
  event_type: 'startup' | 'shutdown' | 'mode_change' | 'config_update' | 'learning_session' | 'error';
  details: Record<string, any>;
  
  success: boolean;
  error_message?: string;
  
  // Resource Usage
  cpu_usage?: number;
  memory_usage?: number;
  network_usage?: number;
  
  // Performance Impact
  latency_ms?: number;
  throughput?: number;
}

export interface BotComplianceCheck {
  id: string;
  timestamp: Date;
  check_type: 'pre_trade' | 'post_trade' | 'position_review' | 'risk_review';
  
  // Validator Integration
  validator_result: {
    allowed: boolean;
    violations: string[];
    warnings: string[];
    risk_level: 'low' | 'medium' | 'high' | 'critical';
  };
  
  // BID Integration
  bid_approval: boolean;
  bid_reason?: string;
  
  // Recorder Integration
  recorder_entry_id: string;
  
  passed: boolean;
  issues_found: string[];
}

// Bot Management Types
export interface BotDeploymentRequest {
  template_id?: string;
  name: string;
  description?: string;
  config: Partial<BotEngineConfig>;
  mode: BotRunMode;
  auto_start?: boolean;
}

export interface BotDuplicationRequest {
  source_bot_id: string;
  new_name: string;
  config_overrides?: Partial<BotEngineConfig>;
  mode?: BotRunMode;
}

export interface BotStatusUpdate {
  bot_id: string;
  mode?: BotRunMode;
  status?: BotExecutionStatus;
  config_updates?: Partial<BotEngineConfig>;
}

export interface BotMetricsQuery {
  bot_ids?: string[];
  start_date?: Date;
  end_date?: Date;
  metrics?: string[];
  granularity?: 'minute' | 'hour' | 'day';
}

// Learning and Prediction Types
export interface PredictionRequest {
  symbol: string;
  timeframe: string;
  features: Record<string, number>;
  model_version?: string;
}

export interface PredictionResult {
  symbol: string;
  prediction: 'buy' | 'sell' | 'hold';
  confidence: number;
  probability_distribution: {
    buy: number;
    sell: number;
    hold: number;
  };
  
  // Feature Contributions
  feature_importance: Record<string, number>;
  
  // Model Metadata
  model_version: string;
  model_trained_at: Date;
  prediction_generated_at: Date;
  
  // Risk Assessment
  prediction_risk: 'low' | 'medium' | 'high';
  uncertainty: number;
}

export interface MarketFeatures {
  // Price Features
  price_sma_10: number;
  price_sma_50: number;
  price_ema_20: number;
  price_change_1d: number;
  price_change_5d: number;
  price_volatility_20d: number;
  
  // Volume Features
  volume_sma_20: number;
  volume_ratio: number;
  volume_price_trend: number;
  
  // Technical Indicators
  rsi_14: number;
  macd_signal: number;
  bollinger_position: number;
  atr_14: number;
  
  // Market Context
  market_sentiment: number;
  sector_performance: number;
  vix_level: number;
  
  // Oracle Signals
  oracle_signal_count: number;
  oracle_avg_confidence: number;
  oracle_direction_consensus: number;
  
  // Options Flow
  put_call_ratio: number;
  unusual_options_activity: number;
  
  // News Sentiment
  news_sentiment_score: number;
  news_volume: number;
  
  // Timestamp
  feature_timestamp: Date;
}

export type BotStrategy = 'momentum' | 'breakout' | 'mean_reversion' | 'signal_stacking' | 'volatility' | 'arbitrage' | 'scalping' | 'ml_ensemble' | 'risk_parity';

export interface StrategyEngine {
  name: BotStrategy;
  description: string;
  risk_level: 'low' | 'medium' | 'high';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  
  // Core Methods
  analyze(features: MarketFeatures, context: any): Promise<PredictionResult>;
  generateSignal(prediction: PredictionResult, bot: TradeBotEngine): Promise<TradeSignal>;
  updateParameters(performance: BotPerformanceMetrics): Promise<Partial<BotEngineConfig>>;
  backtest(config: BotEngineConfig, start: Date, end: Date): Promise<BotBacktestResult>;
  
  // Learning Integration
  extractFeatures(symbol: string, date: Date): Promise<MarketFeatures>;
  trainModel(trainingData: TrainingDataPoint[]): Promise<ModelTrainingResult>;
  validateModel(testData: TrainingDataPoint[]): Promise<ModelValidationResult>;
}

export interface TradeSignal {
  id: string;
  bot_id: string;
  symbol: string;
  signal_type: 'entry' | 'exit' | 'size_adjustment';
  
  // Trade Details
  action: 'buy' | 'sell';
  quantity: number;
  price?: number;
  order_type: 'market' | 'limit' | 'stop';
  
  // Risk Management
  stop_loss?: number;
  take_profit?: number;
  max_risk_usd: number;
  
  // Signal Metadata
  confidence: number;
  prediction_source: string;
  generated_at: Date;
  expires_at: Date;
  
  // Explanation
  reasoning: string;
  supporting_factors: string[];
  risk_factors: string[];
  
  // Compliance
  pre_trade_checks: BotComplianceCheck;
  
  // Execution
  executed: boolean;
  execution_result?: any;
}

export interface TrainingDataPoint {
  symbol: string;
  date: Date;
  features: MarketFeatures;
  target: 'buy' | 'sell' | 'hold';
  actual_return_1d: number;
  actual_return_5d: number;
  actual_return_20d: number;
  
  // Labels for Learning
  was_profitable: boolean;
  trade_quality_score: number; // 0-1 based on risk-adjusted return
}

export interface ModelTrainingResult {
  model_id: string;
  training_completed_at: Date;
  
  // Training Data
  samples_used: number;
  features_count: number;
  training_period_start: Date;
  training_period_end: Date;
  
  // Performance
  accuracy: number;
  precision: number;
  recall: number;
  f1_score: number;
  
  // Cross Validation
  cv_accuracy_mean: number;
  cv_accuracy_std: number;
  
  // Feature Analysis
  feature_importance: Record<string, number>;
  feature_correlations: Record<string, number>;
  
  // Model Metadata
  algorithm: string;
  hyperparameters: Record<string, any>;
  training_time_ms: number;
  model_size_mb: number;
  
  success: boolean;
  error_message?: string;
}

export interface ModelValidationResult {
  validation_id: string;
  validated_at: Date;
  
  // Test Data
  test_samples: number;
  test_period_start: Date;
  test_period_end: Date;
  
  // Out-of-Sample Performance
  oos_accuracy: number;
  oos_precision: number;
  oos_recall: number;
  oos_f1_score: number;
  
  // Financial Performance (if backtested)
  simulated_return?: number;
  simulated_sharpe?: number;
  simulated_max_drawdown?: number;
  
  // Stability Analysis
  prediction_stability: number;
  feature_drift_score: number;
  
  // Confidence Intervals
  accuracy_ci_lower: number;
  accuracy_ci_upper: number;
  
  // Recommendations
  model_quality: 'excellent' | 'good' | 'acceptable' | 'poor';
  recommended_actions: string[];
  
  passed: boolean;
  issues: string[];
}