import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Brain, Database, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { useEffect, useState } from 'react';
import { analystCache, CacheStats } from '@/services/analystCache';
import { connectionLifecycle, ConnectionLifecycle } from '@/services/connectionLifecycle';
import { circuitBreaker, CircuitBreakerStats } from '@/services/circuitBreaker';

export function AnalystHealthCard() {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [apiLifecycle, setApiLifecycle] = useState<ConnectionLifecycle | null>(null);
  const [voiceLifecycle, setVoiceLifecycle] = useState<ConnectionLifecycle | null>(null);
  const [apiCircuit, setApiCircuit] = useState<CircuitBreakerStats | null>(null);
  const [voiceCircuit, setVoiceCircuit] = useState<CircuitBreakerStats | null>(null);

  const updateStats = () => {
    setCacheStats(analystCache.getStats());
    setApiLifecycle(connectionLifecycle.getLifecycle('analyst-api'));
    setVoiceLifecycle(connectionLifecycle.getLifecycle('analyst-voice'));
    setApiCircuit(circuitBreaker.getStats('analyst-llm'));
    setVoiceCircuit(circuitBreaker.getStats('analyst-voice'));
  };

  useEffect(() => {
    updateStats();
    const interval = setInterval(updateStats, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleResetCircuit = (circuitId: string) => {
    circuitBreaker.reset(circuitId);
    updateStats();
  };

  const handleClearCache = () => {
    analystCache.clear();
    updateStats();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-primary" />
          Analyst System Health
        </CardTitle>
        <CardDescription>
          Real-time monitoring of AI analyst connections and cache performance
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Cache Statistics */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm flex items-center gap-2">
              <Database className="w-4 h-4" />
              Response Cache
            </h4>
            <Button variant="outline" size="sm" onClick={handleClearCache}>
              Clear Cache
            </Button>
          </div>
          
          {cacheStats && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Hit Rate</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{cacheStats.hitRate}%</p>
                  <Badge variant={cacheStats.hitRate > 40 ? 'default' : 'secondary'}>
                    {cacheStats.hits} hits
                  </Badge>
                </div>
                <Progress value={cacheStats.hitRate} className="h-2" />
              </div>
              
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Cache Size</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-2xl font-bold">{cacheStats.totalEntries}</p>
                  <span className="text-xs text-muted-foreground">
                    ({cacheStats.memoryUsageKB}KB)
                  </span>
                </div>
                <Progress value={(cacheStats.totalEntries / 100) * 100} className="h-2" />
              </div>
            </div>
          )}
        </div>

        {/* API Connection Status */}
        <div className="space-y-3">
          <h4 className="font-semibold text-sm flex items-center gap-2">
            <Zap className="w-4 h-4" />
            API Connections
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Text Chat API */}
            <div className="space-y-2 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Text Chat</span>
                {apiLifecycle && (
                  <Badge variant={
                    apiLifecycle.state === 'connected' ? 'default' :
                    apiLifecycle.state === 'reconnecting' ? 'secondary' :
                    'destructive'
                  }>
                    {apiLifecycle.state}
                  </Badge>
                )}
              </div>
              
              {apiCircuit && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Circuit</span>
                    <Badge 
                      variant={apiCircuit.state === 'closed' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {apiCircuit.state}
                    </Badge>
                  </div>
                  
                  {apiCircuit.state !== 'closed' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleResetCircuit('analyst-llm')}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reset Circuit
                    </Button>
                  )}
                </div>
              )}

              {apiLifecycle && (
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-medium">
                    {connectionLifecycle.getUptimePercentage('analyst-api').toFixed(1)}%
                  </span>
                </div>
              )}
            </div>

            {/* Voice API */}
            <div className="space-y-2 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Voice Chat</span>
                {voiceLifecycle && (
                  <Badge variant={
                    voiceLifecycle.state === 'connected' ? 'default' :
                    voiceLifecycle.state === 'reconnecting' ? 'secondary' :
                    'destructive'
                  }>
                    {voiceLifecycle.state}
                  </Badge>
                )}
              </div>
              
              {voiceCircuit && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Circuit</span>
                    <Badge 
                      variant={voiceCircuit.state === 'closed' ? 'default' : 'destructive'}
                      className="text-xs"
                    >
                      {voiceCircuit.state}
                    </Badge>
                  </div>
                  
                  {voiceCircuit.state !== 'closed' && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="w-full"
                      onClick={() => handleResetCircuit('analyst-voice')}
                    >
                      <RefreshCw className="w-3 h-3 mr-1" />
                      Reset Circuit
                    </Button>
                  )}
                </div>
              )}

              {voiceLifecycle && (
                <div className="flex justify-between text-xs mt-2">
                  <span className="text-muted-foreground">Uptime</span>
                  <span className="font-medium">
                    {connectionLifecycle.getUptimePercentage('analyst-voice').toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Warning for degraded state */}
        {(apiCircuit?.state === 'open' || voiceCircuit?.state === 'open') && (
          <div className="flex items-start gap-2 p-3 border border-warning/50 bg-warning/10 rounded-lg">
            <AlertCircle className="w-4 h-4 text-warning mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium text-warning-foreground">
                Service Temporarily Unavailable
              </p>
              <p className="text-xs text-warning-foreground/80">
                The Analyst is experiencing issues. Cached responses are still available.
                The system will automatically retry the connection.
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
