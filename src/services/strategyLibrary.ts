import { supabase } from "@/integrations/supabase/client";
import { 
  Playbook, 
  SizingStrategy, 
  ManagementRule, 
  RegimeSignal, 
  MarketEvent, 
  ExecutionTactic, 
  NicheEdge,
  StrategySet,
  STRATEGY_ELIGIBILITY
} from "@/types/strategyLibrary";
import { DailyTargetMode } from "@/types/botProfile";

// Load all playbooks
export const getPlaybooks = async (): Promise<Playbook[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('playbooks')
      .select('*')
      .eq('enabled', true)
      .order('name');

    if (error) {
      console.error('Error loading playbooks:', error);
      return [];
    }

    return (data as any[])?.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      setup_rules_json: item.setup_rules_json,
      confirm_rules_json: item.confirm_rules_json,
      exit_rules_json: item.exit_rules_json,
      rr_default: item.rr_default,
      stop_style: item.stop_style,
      enabled: item.enabled
    })) || [];
  } catch (error) {
    console.error('Error loading playbooks:', error);
    return [];
  }
};

// Load eligible playbooks for a mode
export const getEligiblePlaybooks = async (mode: DailyTargetMode): Promise<Playbook[]> => {
  const eligibility = STRATEGY_ELIGIBILITY[mode];
  if (!eligibility) return [];

  try {
    const { data, error } = await (supabase as any)
      .from('playbooks')
      .select('*')
      .in('name', eligibility.playbook_names)
      .eq('enabled', true)
      .order('name');

    if (error) {
      console.error('Error loading eligible playbooks:', error);
      return [];
    }

    return (data as any[])?.map(item => ({
      id: item.id,
      name: item.name,
      description: item.description,
      setup_rules_json: item.setup_rules_json,
      confirm_rules_json: item.confirm_rules_json,
      exit_rules_json: item.exit_rules_json,
      rr_default: item.rr_default,
      stop_style: item.stop_style,
      enabled: item.enabled
    })) || [];
  } catch (error) {
    console.error('Error loading eligible playbooks:', error);
    return [];
  }
};

// Load sizing strategies
export const getSizingStrategies = async (): Promise<SizingStrategy[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('sizing_strategies')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading sizing strategies:', error);
      return [];
    }

    return (data as any[])?.map(item => ({
      name: item.name,
      formula: item.formula,
      constraints_json: item.constraints_json
    })) || [];
  } catch (error) {
    console.error('Error loading sizing strategies:', error);
    return [];
  }
};

// Load management rules for a playbook
export const getManagementRules = async (setup: string): Promise<ManagementRule[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('management_rules')
      .select('*')
      .eq('setup', setup)
      .order('id');

    if (error) {
      console.error('Error loading management rules:', error);
      return [];
    }

    return (data as any[])?.map(item => ({
      id: item.id,
      setup: item.setup,
      triggers_json: item.triggers_json,
      actions_json: item.actions_json
    })) || [];
  } catch (error) {
    console.error('Error loading management rules:', error);
    return [];
  }
};

// Get current regime for symbol class
export const getCurrentRegime = async (symbolClass: string): Promise<RegimeSignal | null> => {
  try {
    const { data, error } = await (supabase as any)
      .from('regime_signals')
      .select('*')
      .eq('symbol_class', symbolClass)
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error('Error loading regime:', error);
      return null;
    }

    if (!data) return null;

    return {
      ts: data.ts,
      symbol_class: data.symbol_class,
      features_json: data.features_json,
      regime_label: data.regime_label
    } as RegimeSignal;
  } catch (error) {
    console.error('Error loading regime:', error);
    return null;
  }
};

// Get active market events (potential blackouts)
export const getActiveMarketEvents = async (): Promise<MarketEvent[]> => {
  try {
    const now = new Date().toISOString();
    const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const dayAhead = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const { data, error } = await (supabase as any)
      .from('market_events')
      .select('*')
      .gte('ts', dayAgo)
      .lte('ts', dayAhead)
      .order('ts');

    if (error) {
      console.error('Error loading market events:', error);
      return [];
    }

    return (data as any[])?.map(item => ({
      ts: item.ts,
      symbol: item.symbol,
      event_type: item.event_type,
      severity: item.severity,
      blackout_rules_json: item.blackout_rules_json
    })) || [];
  } catch (error) {
    console.error('Error loading market events:', error);
    return [];
  }
};

// Load execution tactics
export const getExecutionTactics = async (): Promise<ExecutionTactic[]> => {
  try {
    const { data, error } = await (supabase as any)
      .from('execution_tactics')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error loading execution tactics:', error);
      return [];
    }

    return (data as any[])?.map(item => ({
      name: item.name,
      venue_rules_json: item.venue_rules_json,
      size_buckets_json: item.size_buckets_json
    })) || [];
  } catch (error) {
    console.error('Error loading execution tactics:', error);
    return [];
  }
};

// Load niche edges (enabled only)
export const getNicheEdges = async (enabledOnly: boolean = true): Promise<NicheEdge[]> => {
  try {
    let query = (supabase as any).from('niche_edges').select('*');
    
    if (enabledOnly) {
      query = query.eq('enabled', true);
    }
    
    const { data, error } = await query.order('name');

    if (error) {
      console.error('Error loading niche edges:', error);
      return [];
    }

    return (data as any[])?.map(item => ({
      id: item.id,
      name: item.name,
      hypothesis: item.hypothesis,
      detection_rules_json: item.detection_rules_json,
      guardrails_json: item.guardrails_json,
      backtest_notes: item.backtest_notes,
      enabled: item.enabled
    })) || [];
  } catch (error) {
    console.error('Error loading niche edges:', error);
    return [];
  }
};

// Get eligible niche edges for mode with confidence threshold
export const getEligibleNicheEdges = async (
  mode: DailyTargetMode,
  signalConfidence?: number
): Promise<NicheEdge[]> => {
  const eligibility = STRATEGY_ELIGIBILITY[mode];
  
  if (!eligibility.allow_niche_edges) {
    return [];
  }

  const edges = await getNicheEdges(true);
  
  // Filter by confidence threshold if provided
  if (signalConfidence && eligibility.niche_confidence_threshold) {
    return edges.filter(() => signalConfidence >= (eligibility.niche_confidence_threshold || 1));
  }

  return edges;
};

// Build complete strategy set for a mode
export const buildStrategySet = async (
  mode: DailyTargetMode,
  symbolClass: string = 'equity_largecap',
  signalConfidence?: number
): Promise<StrategySet> => {
  const [playbooks, nicheEdges, regime, blackoutEvents] = await Promise.all([
    getEligiblePlaybooks(mode),
    getEligibleNicheEdges(mode, signalConfidence),
    getCurrentRegime(symbolClass),
    getActiveMarketEvents()
  ]);

  return {
    playbooks,
    nicheEdges,
    regime,
    blackoutEvents
  };
};

// Check if trading is currently blacked out by events
export const isBlackedOut = (events: MarketEvent[], symbol?: string): boolean => {
  const now = new Date();
  
  return events.some(event => {
    // Skip if event is symbol-specific and doesn't match
    if (event.symbol && symbol && event.symbol !== symbol) {
      return false;
    }

    const eventTime = new Date(event.ts);
    const timeDiff = Math.abs(now.getTime() - eventTime.getTime()) / (1000 * 60); // minutes

    // Check blackout rules
    if (event.blackout_rules_json) {
      const rules = event.blackout_rules_json as { no_trade_minutes_before?: number; after?: number };
      const beforeWindow = rules.no_trade_minutes_before || 0;
      const afterWindow = rules.after || 0;

      // Before event
      if (now < eventTime && timeDiff <= beforeWindow) {
        return true;
      }

      // After event
      if (now > eventTime && timeDiff <= afterWindow) {
        return true;
      }
    }

    return false;
  });
};

// Log strategy selection for audit trail
export const logStrategySelection = async (
  workspaceId: string,
  mode: DailyTargetMode,
  selectedPlaybook: string,
  nicheEdges: string[],
  reasoning: string
): Promise<boolean> => {
  const { error } = await supabase.rpc('recorder_log', {
    p_workspace: workspaceId,
    p_event_type: 'strategy.selected',
    p_severity: 1,
    p_entity_type: 'trade_bot',
    p_entity_id: `mode_${mode}`,
    p_summary: `Strategy selected for ${mode} mode`,
    p_payload: {
      mode,
      playbook: selectedPlaybook,
      niche_edges: nicheEdges,
      reasoning,
      timestamp: new Date().toISOString()
    }
  });

  if (error) {
    console.error('Error logging strategy selection:', error);
    return false;
  }

  return true;
};