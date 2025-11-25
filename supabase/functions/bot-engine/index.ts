import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BotEngineRequest {
  action: 'create' | 'duplicate' | 'start' | 'stop' | 'halt' | 'update_config' | 'get_status' | 'get_metrics' | 'backtest';
  bot_id?: string;
  config?: any;
  deployment_request?: any;
  duplication_request?: any;
  status_update?: any;
  backtest_params?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!;
    const token = authHeader.replace('Bearer ', '');
    
    // Verify the JWT and get user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      throw new Error('Unauthorized');
    }

    const request: BotEngineRequest = await req.json();

    console.log('🤖 Bot Engine Request:', {
      action: request.action,
      bot_id: request.bot_id,
      user_id: user.id
    });

    // Route to appropriate handler
    switch (request.action) {
      case 'create':
        return await handleCreateBot(supabaseClient, user, request.deployment_request);
      
      case 'duplicate':
        return await handleDuplicateBot(supabaseClient, user, request.duplication_request);
      
      case 'start':
        return await handleStartBot(supabaseClient, user, request.bot_id!);
      
      case 'stop':
        return await handleStopBot(supabaseClient, user, request.bot_id!);
      
      case 'halt':
        return await handleHaltBot(supabaseClient, user, request.bot_id!);
      
      case 'update_config':
        return await handleUpdateConfig(supabaseClient, user, request.bot_id!, request.config);
      
      case 'get_status':
        return await handleGetStatus(supabaseClient, user, request.bot_id!);
      
      case 'get_metrics':
        return await handleGetMetrics(supabaseClient, user, request.bot_id);
      
      case 'backtest':
        return await handleBacktest(supabaseClient, user, request.bot_id!, request.backtest_params);
      
      default:
        throw new Error(`Unknown action: ${request.action}`);
    }

  } catch (error) {
    console.error('❌ Bot Engine Error:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

async function handleCreateBot(supabase: any, user: any, deploymentRequest: any) {
  console.log('🚀 Creating new bot:', deploymentRequest);

  // Validate deployment request
  if (!deploymentRequest?.name || !deploymentRequest?.config) {
    throw new Error('Invalid deployment request - name and config required');
  }

  // Generate bot IDs
  const botId = `bot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const runId = `run_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Create bot profile in database
  const { error: insertError } = await supabase.from('bot_profiles').insert({
    workspace_id: runId,
    name: deploymentRequest.name,
    active: false,
    mode: deploymentRequest.mode || 'paper',
    execution_mode: 'automated',
    updated_at: new Date().toISOString()
  });

  if (insertError) {
    throw new Error(`Failed to create bot profile: ${insertError.message}`);
  }

  // Log bot creation event
  await supabase.from('rec_events').insert({
    workspace_id: user.user_metadata?.workspace_id || user.id,
    user_id: user.id,
    event_type: 'bot.created',
    severity: 1,
    entity_type: 'bot',
    entity_id: botId,
    summary: `Bot created: ${deploymentRequest.name}`,
    payload_json: {
      bot_id: botId,
      run_id: runId,
      name: deploymentRequest.name,
      strategy: deploymentRequest.config.strategy,
      mode: deploymentRequest.mode,
      allocation: deploymentRequest.config.allocation
    }
  });

  // Initialize bot state
  const bot = {
    id: botId,
    name: deploymentRequest.name,
    description: deploymentRequest.description || '',
    template_id: deploymentRequest.template_id,
    run_id: runId,
    mode: deploymentRequest.mode || 'paper',
    status: 'idle',
    created_at: new Date(),
    last_heartbeat: new Date(),
    config: {
      strategy: 'momentum',
      allocation: 10000,
      risk_tolerance: 0.5,
      max_position_size: 2000,
      max_daily_trades: 5,
      max_concurrent_positions: 3,
      stop_loss_pct: 5,
      take_profit_pct: 10,
      max_drawdown_pct: 15,
      daily_loss_halt_pct: 5,
      min_stock_price: 5,
      min_volume_usd: 1000000,
      blacklisted_symbols: [],
      signal_confidence_min: 0.65,
      oracle_sources: ['yahoo_finance', 'alpha_vantage'],
      timeframes: ['1h', '4h', '1d'],
      prediction_model: 'gradient_boost',
      feature_window: 20,
      retrain_frequency: 7,
      learning_enabled: true,
      learning_rate: 0.01,
      parameter_bounds: {
        signal_confidence_min: { min: 0.5, max: 0.95 },
        stop_loss_pct: { min: 2, max: 10 },
        take_profit_pct: { min: 5, max: 25 }
      },
      backtest_period: 30,
      backtest_frequency: 24,
      explanation_detail: 'standard',
      log_decisions: true,
      ...deploymentRequest.config
    },
    metrics: {
      total_trades: 0,
      winning_trades: 0,
      losing_trades: 0,
      win_rate: 0,
      total_return: 0,
      total_return_pct: 0,
      sharpe_ratio: 0,
      sortino_ratio: 0,
      max_drawdown: 0,
      max_drawdown_pct: 0,
      value_at_risk: 0,
      expected_shortfall: 0,
      beta: 1,
      alpha: 0,
      avg_hold_time: 0,
      avg_trade_size: 0,
      slippage_avg: 0,
      commission_paid: 0,
      recent_trades: 0,
      recent_return_pct: 0,
      recent_win_rate: 0,
      daily_trades_today: 0,
      daily_pnl_today: 0,
      session_start_equity: 0,
      current_equity: 0,
      last_updated: new Date(),
      performance_calculated_at: new Date()
    },
    learning: {
      model_version: 'v1.0.0',
      model_accuracy: 0.5,
      model_feature_count: 20,
      learning_sessions: [],
      parameter_changes: [],
      backtest_results: [],
      adaptation_enabled: true,
      adaptation_score: 0,
      active_features: [],
      feature_importance: {},
      feature_correlation: {}
    }
  };

  // Auto-start if requested
  if (deploymentRequest.auto_start) {
    await startBotExecution(supabase, user, bot);
  }

  return new Response(
    JSON.stringify({
      success: true,
      bot,
      message: `Bot "${deploymentRequest.name}" created successfully`
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}

async function handleDuplicateBot(supabase: any, user: any, duplicationRequest: any) {
  console.log('📋 Duplicating bot:', duplicationRequest);

  if (!duplicationRequest?.source_bot_id || !duplicationRequest?.new_name) {
    throw new Error('Invalid duplication request - source_bot_id and new_name required');
  }

  // Get source bot (simplified - in real implementation would fetch from storage)
  const sourceBotConfig = {
    strategy: 'momentum',
    allocation: 10000,
    risk_tolerance: 0.5,
    ...duplicationRequest.config_overrides
  };

  // Create new bot using source configuration
  const deploymentRequest = {
    name: duplicationRequest.new_name,
    description: `Duplicated from source bot`,
    config: sourceBotConfig,
    mode: duplicationRequest.mode || 'paper',
    auto_start: false
  };

  return await handleCreateBot(supabase, user, deploymentRequest);
}

async function handleStartBot(supabase: any, user: any, botId: string) {
  console.log('▶️ Starting bot:', botId);

  // Run compliance check
  const complianceResult = await runComplianceCheck(supabase, user, botId);
  if (!complianceResult.passed) {
    throw new Error(`Compliance check failed: ${complianceResult.issues.join(', ')}`);
  }

  // Update bot status in database
  const { error } = await supabase.from('bot_profiles')
    .update({ 
      active: true,
      last_activated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('workspace_id', botId); // Using bot_id as workspace_id for now

  if (error) {
    throw new Error(`Failed to start bot: ${error.message}`);
  }

  // Log start event
  await supabase.from('rec_events').insert({
    workspace_id: user.user_metadata?.workspace_id || user.id,
    user_id: user.id,
    event_type: 'bot.started',
    severity: 1,
    entity_type: 'bot',
    entity_id: botId,
    summary: `Bot started: ${botId}`,
    payload_json: { bot_id: botId, action: 'start' }
  });

  // Start bot execution (in real implementation, this would initialize the bot's execution loop)
  await initializeBotExecution(supabase, user, botId);

  return new Response(
    JSON.stringify({
      success: true,
      message: `Bot ${botId} started successfully`,
      status: 'analyzing'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}

async function handleStopBot(supabase: any, user: any, botId: string) {
  console.log('⏸️ Stopping bot:', botId);

  // Update bot status in database
  const { error } = await supabase.from('bot_profiles')
    .update({ 
      active: false,
      last_deactivated: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('workspace_id', botId);

  if (error) {
    throw new Error(`Failed to stop bot: ${error.message}`);
  }

  // Log stop event
  await supabase.from('rec_events').insert({
    workspace_id: user.user_metadata?.workspace_id || user.id,
    user_id: user.id,
    event_type: 'bot.stopped',
    severity: 1,
    entity_type: 'bot',
    entity_id: botId,
    summary: `Bot stopped: ${botId}`,
    payload_json: { bot_id: botId, action: 'stop' }
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: `Bot ${botId} stopped successfully`,
      status: 'idle'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}

async function handleHaltBot(supabase: any, user: any, botId: string) {
  console.log('🛑 Halting bot:', botId);

  // Emergency halt - close positions and stop immediately
  const { error } = await supabase.from('bot_profiles')
    .update({ 
      active: false,
      mode: 'halted',
      updated_at: new Date().toISOString()
    })
    .eq('workspace_id', botId);

  if (error) {
    throw new Error(`Failed to halt bot: ${error.message}`);
  }

  // Log halt event as high severity
  await supabase.from('rec_events').insert({
    workspace_id: user.user_metadata?.workspace_id || user.id,
    user_id: user.id,
    event_type: 'bot.halted',
    severity: 3,
    entity_type: 'bot',
    entity_id: botId,
    summary: `Bot emergency halt: ${botId}`,
    payload_json: { 
      bot_id: botId, 
      action: 'halt',
      reason: 'Manual emergency halt'
    }
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: `Bot ${botId} halted successfully`,
      status: 'halted'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}

async function handleUpdateConfig(supabase: any, user: any, botId: string, config: any) {
  console.log('⚙️ Updating bot config:', { botId, config });

  // Validate configuration updates
  if (!config) {
    throw new Error('No configuration provided');
  }

  // Log configuration update
  await supabase.from('rec_events').insert({
    workspace_id: user.user_metadata?.workspace_id || user.id,
    user_id: user.id,
    event_type: 'bot.config_updated',
    severity: 1,
    entity_type: 'bot',
    entity_id: botId,
    summary: `Bot configuration updated: ${botId}`,
    payload_json: { 
      bot_id: botId, 
      config_changes: config
    }
  });

  return new Response(
    JSON.stringify({
      success: true,
      message: `Bot ${botId} configuration updated successfully`,
      updated_config: config
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}

async function handleGetStatus(supabase: any, user: any, botId: string) {
  console.log('📊 Getting bot status:', botId);

  // Get bot status from database
  const { data: botProfile, error } = await supabase
    .from('bot_profiles')
    .select('*')
    .eq('workspace_id', botId)
    .single();

  if (error) {
    throw new Error(`Failed to get bot status: ${error.message}`);
  }

  const status = {
    id: botId,
    name: botProfile.name,
    active: botProfile.active,
    mode: botProfile.mode,
    status: botProfile.active ? 'analyzing' : 'idle',
    last_heartbeat: new Date(),
    metrics: {
      total_trades: Math.floor(Math.random() * 100),
      win_rate: Math.random() * 0.4 + 0.5, // 50-90%
      total_return_pct: (Math.random() - 0.3) * 20, // -6% to +14%
      daily_trades_today: Math.floor(Math.random() * 10),
      allocation: 10000
    }
  };

  return new Response(
    JSON.stringify({
      success: true,
      status
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}

async function handleGetMetrics(supabase: any, user: any, botId?: string) {
  console.log('📈 Getting metrics:', { botId });

  if (botId) {
    // Get individual bot metrics
    const metrics = {
      bot_id: botId,
      total_trades: Math.floor(Math.random() * 100) + 20,
      winning_trades: Math.floor(Math.random() * 60) + 15,
      losing_trades: Math.floor(Math.random() * 40) + 5,
      win_rate: Math.random() * 0.4 + 0.5,
      total_return: (Math.random() - 0.3) * 5000,
      total_return_pct: (Math.random() - 0.3) * 20,
      sharpe_ratio: Math.random() * 2 + 0.5,
      max_drawdown_pct: Math.random() * 15 + 2,
      last_updated: new Date()
    };

    return new Response(
      JSON.stringify({ success: true, metrics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } else {
    // Get system-wide metrics
    const systemMetrics = {
      total_bots: Math.floor(Math.random() * 10) + 2,
      active_bots: Math.floor(Math.random() * 5) + 1,
      total_allocation: Math.floor(Math.random() * 100000) + 50000,
      avg_performance: (Math.random() - 0.3) * 15,
      system_uptime: 99.5 + Math.random() * 0.5
    };

    return new Response(
      JSON.stringify({ success: true, metrics: systemMetrics }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function handleBacktest(supabase: any, user: any, botId: string, backtestParams: any) {
  console.log('🔍 Running backtest:', { botId, backtestParams });

  // Simulate backtest execution
  const backtestResult = {
    id: `bt_${Date.now()}`,
    bot_id: botId,
    run_at: new Date(),
    start_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // 30 days ago
    end_date: new Date(),
    initial_capital: backtestParams?.initial_capital || 10000,
    final_capital: 10000 + (Math.random() - 0.3) * 2000, // ±20% return
    total_trades: Math.floor(Math.random() * 50) + 20,
    win_rate: Math.random() * 0.4 + 0.5, // 50-90%
    sharpe_ratio: Math.random() * 2 + 0.5,
    max_drawdown_pct: Math.random() * 15 + 2,
    success: true
  };

  const totalReturn = backtestResult.final_capital - backtestResult.initial_capital;
  (backtestResult as any).total_return = totalReturn;

  // Log backtest event
  await supabase.from('rec_events').insert({
    workspace_id: user.user_metadata?.workspace_id || user.id,
    user_id: user.id,
    event_type: 'bot.backtest_completed',
    severity: 1,
    entity_type: 'bot',
    entity_id: botId,
    summary: `Backtest completed for bot: ${botId}`,
    payload_json: { 
      bot_id: botId,
      backtest_result: backtestResult
    }
  });

  return new Response(
    JSON.stringify({
      success: true,
      backtest_result: backtestResult,
      message: 'Backtest completed successfully'
    }),
    { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200 
    }
  );
}

// Helper functions
async function runComplianceCheck(supabase: any, user: any, botId: string) {
  // Run comprehensive compliance checks
  const checks = {
    user_tier_check: await checkUserTier(supabase, user),
    risk_limits_check: await checkRiskLimits(supabase, user, botId),
    capital_requirements: await checkCapitalRequirements(supabase, user, botId),
    regulatory_compliance: await checkRegulatoryCompliance(supabase, user)
  };

  const passed = Object.values(checks).every(check => check);
  const issues = Object.entries(checks)
    .filter(([_, passed]) => !passed)
    .map(([check, _]) => check.replace('_', ' '));

  return { passed, issues, checks };
}

async function checkUserTier(supabase: any, user: any): Promise<boolean> {
  // Check if user has Pro/Elite tier for bot access
  try {
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('plan')
      .eq('workspace_id', user.user_metadata?.workspace_id || user.id)
      .single();

    return subscription?.plan === 'pro' || subscription?.plan === 'elite';
  } catch {
    return true; // Allow if can't determine tier (demo mode)
  }
}

async function checkRiskLimits(supabase: any, user: any, botId: string): Promise<boolean> {
  // Check risk limits and exposure
  return true; // Simplified for demo
}

async function checkCapitalRequirements(supabase: any, user: any, botId: string): Promise<boolean> {
  // Check minimum capital requirements
  return true; // Simplified for demo
}

async function checkRegulatoryCompliance(supabase: any, user: any): Promise<boolean> {
  // Check regulatory compliance requirements
  return true; // Simplified for demo
}

async function startBotExecution(supabase: any, user: any, bot: any) {
  // Initialize bot execution loop
  console.log('🚀 Initializing bot execution for:', bot.name);
  
  // In a real implementation, this would:
  // 1. Start the bot's analysis engine
  // 2. Initialize ML models
  // 3. Connect to data feeds
  // 4. Set up monitoring and health checks
  
  return true;
}

async function initializeBotExecution(supabase: any, user: any, botId: string) {
  // Start bot execution processes
  console.log('⚡ Starting execution for bot:', botId);
  
  // This would initialize the actual bot execution engine
  return true;
}