// deno-lint-ignore-file no-explicit-any
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

type OrderProposal = {
  workspace_id: string;
  run_id?: string;
  symbol: string;
  side: 'buy'|'sell';
  qty: number;
  price?: number;
  notional?: number;
  limits?: { stop_loss_pct?: number; take_profit_pct?: number };
  mode?: 'paper'|'live';
};

function sha1(s: string) {
  const data = new TextEncoder().encode(s);
  const hash = (crypto as any).subtle.digestSync ? (crypto as any).subtle.digestSync('SHA-1', data) : null;
  return hash ? Array.from(new Uint8Array(hash)).map(b=>b.toString(16).padStart(2,'0')).join('') : s;
}

async function getRiskPolicy(supabase:any, wsId:string){
  const { data } = await supabase.from('risk_policies').select('*').eq('workspace_id', wsId).maybeSingle();
  return data ?? {
    max_notional_per_trade: 1000,
    max_positions: 5,
    max_trades_per_day: 20,
    max_daily_loss_pct: 0.05,
    cooldown_after_loss_secs: 180,
    require_stop_loss: true,
    max_spread_pct: 0.005
  };
}

async function getContext(supabase:any, wsId:string, symbol:string){
  return {
    equity: 50000,
    openPositions: 0,
    tradesToday: 0,
    dayPnLPct: 0,
    lastLossAt: 0,
    marketFresh: true,
    spreadPct: 0.001,
    buyingPower: 50000
  };
}

function riskGate(order: OrderProposal & { notional: number }, policy:any, ctx:any){
  if (!ctx.marketFresh) return { pass:false, reason:'market_data_stale' };
  if (ctx.buyingPower < order.notional) return { pass:false, reason:'insufficient_buying_power' };
  const cap = Math.min(policy.max_notional_per_trade, 0.02 * ctx.equity);
  if (order.notional > cap) return { pass:false, reason:'exceeds_max_notional' };
  if (policy.require_stop_loss && !order.limits?.stop_loss_pct) return { pass:false, reason:'stop_loss_required' };
  if ((ctx.spreadPct ?? 0) > policy.max_spread_pct) return { pass:false, reason:'spread_too_wide' };
  return { pass:true };
}

async function record(supabase:any, wsId:string, actor:string, event_type:string, payload?:any){
  await supabase.from('recorder_mirror').insert({ workspace_id: wsId, actor, event_type, payload });
}

Deno.serve(async (req: Request) => {
  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const body: OrderProposal = await req.json();

  const key = sha1(`${body.workspace_id}:${body.run_id ?? 'NA'}:${body.symbol}:${body.side}:${Math.floor(Date.now()/1000)}`);
  const { data: seen } = await supabase.from('idempotency_keys').select('key').eq('key', key).maybeSingle();
  if (seen) return new Response(JSON.stringify({ ok:true, idempotent:true }), { headers: { 'content-type':'application/json' } });
  await supabase.from('idempotency_keys').insert({ key });

  const policy = await getRiskPolicy(supabase, body.workspace_id);
  const ctx = await getContext(supabase, body.workspace_id, body.symbol);
  const price = body.price ?? 100;
  const notional = body.notional ?? (price * body.qty);
  const gate = riskGate({ ...body, notional }, policy, ctx);
  if (!gate.pass) {
    await record(supabase, body.workspace_id, 'validator', 'order.blocked', { order: body, reason: gate.reason });
    return new Response(JSON.stringify({ ok:false, reason: gate.reason }), { status: 400, headers: { 'content-type':'application/json' } });
  }

  const brokerStatus = 'placed';

  const { data: orderId, error } = await supabase.rpc('create_order_record', {
    _ws: body.workspace_id,
    _run: body.run_id ?? null,
    _symbol: body.symbol,
    _side: body.side,
    _qty: body.qty,
    _limits: body.limits ?? {},
    _validator_status: 'pass',
    _broker_status: brokerStatus
  });
  if (error) {
    await record(supabase, body.workspace_id, 'broker', 'order.error', { order: body, error });
    return new Response(JSON.stringify({ ok:false, error }), { status: 500, headers: { 'content-type':'application/json' } });
  }

  await record(supabase, body.workspace_id, 'broker', 'order.placed', { order_id: orderId, order: body });
  return new Response(JSON.stringify({ ok:true, order_id: orderId }), { headers: { 'content-type':'application/json' } });
});