import React from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle, XCircle, AlertCircle } from "lucide-react";

type State = 'idle' | 'busy' | 'ok' | 'error';

export default function BrokerageDock() {
  const [state, setState] = React.useState<State>('idle');
  const [msg, setMsg] = React.useState<string>("");
  const [health, setHealth] = React.useState<any>(null);

  React.useEffect(() => {
    loadHealth();
    const interval = setInterval(loadHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  async function loadHealth() {
    const { data } = await supabase
      .from("broker_health")
      .select("*")
      .eq("broker", "alpaca")
      .single();
    setHealth(data);
  }

  async function connect() {
    setState('busy');
    setMsg("");
    
    const { data, error } = await supabase.functions.invoke('broker-connect');
    
    if (error || !data?.ok) {
      setState('error');
      setMsg(error?.message || data?.error || 'Connect failed');
      return;
    }
    
    setState('ok');
    setMsg(`Connected (${data.mode}), BP: ${data.account?.bp ?? '—'}`);
    loadHealth();
  }

  async function sync() {
    setState('busy');
    setMsg("Syncing market data...");
    
    const { data, error } = await supabase.functions.invoke('market-data-sync', {
      body: { symbols: ['SPY', 'QQQ', 'META'], tf: '1H' }
    });
    
    if (error || !data?.ok) {
      setState('error');
      setMsg(error?.message || data?.error || 'Sync failed');
      return;
    }
    
    setState('ok');
    setMsg(`Inserted ${data.inserted} bars`);
  }

  const getStatusBadge = () => {
    if (!health) return <Badge variant="outline">Unknown</Badge>;
    
    switch (health.status) {
      case 'ok':
        return <Badge variant="default" className="bg-green-600"><CheckCircle className="w-3 h-3 mr-1" />Connected</Badge>;
      case 'down':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Down</Badge>;
      case 'degraded':
        return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" />Degraded</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Brokerage Dock</CardTitle>
            <CardDescription>Connect Alpaca • Check account • Sync market data</CardDescription>
          </div>
          {getStatusBadge()}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {health && (
          <div className="text-sm text-muted-foreground">
            <div>Mode: <span className="font-medium">{health.mode}</span></div>
            <div>Last check: {new Date(health.last_check).toLocaleTimeString()}</div>
            {health.error_message && (
              <div className="text-destructive mt-1">{health.error_message}</div>
            )}
          </div>
        )}
        
        <div className="flex gap-2">
          <Button 
            onClick={connect} 
            disabled={state === 'busy'}
            variant="default"
          >
            {state === 'busy' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Connect
          </Button>
          <Button 
            onClick={sync} 
            disabled={state === 'busy'}
            variant="secondary"
          >
            {state === 'busy' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Sync Market Data
          </Button>
        </div>
        
        {msg && (
          <div className={`text-sm ${state === 'error' ? 'text-destructive' : 'text-green-600'}`}>
            {msg}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
