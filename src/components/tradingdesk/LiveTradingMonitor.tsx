import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Bot, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  Clock,
  Target,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BotProfile {
  workspace_id: string;
  name: string | null;
  active: boolean;
  mode: string;
  risk_indicator: string;
  daily_return_target_pct: number;
  execution_mode: string;
}

interface LiveTrade {
  id: string;
  bot_id: string;
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  status: 'pending' | 'filled' | 'cancelled';
  bot_name?: string;
}

interface LiveTradingMonitorProps {
  isSystemActive: boolean;
}

export function LiveTradingMonitor({ isSystemActive }: LiveTradingMonitorProps) {
  const [activeBots, setActiveBots] = useState<BotProfile[]>([]);
  const [recentTrades, setRecentTrades] = useState<LiveTrade[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      // Load active bots
      const { data: bots, error: botsError } = await supabase
        .from('bot_profiles')
        .select('*')
        .eq('active', true)
        .order('name');

      if (botsError) throw botsError;
      setActiveBots(bots || []);

      // Generate mock recent trades for demo
      const mockTrades: LiveTrade[] = bots?.flatMap(bot => 
        Array.from({ length: Math.floor(Math.random() * 3) }, (_, i) => ({
          id: `${bot.workspace_id}-${i}`,
          bot_id: bot.workspace_id,
          symbol: ['AAPL', 'SPY', 'TSLA', 'QQQ', 'MSFT'][Math.floor(Math.random() * 5)],
          action: Math.random() > 0.5 ? 'buy' : 'sell',
          quantity: Math.floor(Math.random() * 100) + 10,
          price: Math.random() * 200 + 50,
          timestamp: new Date(Date.now() - Math.random() * 3600000),
          status: ['filled', 'pending'][Math.floor(Math.random() * 2)] as 'filled' | 'pending',
          bot_name: bot.name
        }))
      ) || [];

      setRecentTrades(mockTrades.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()));
      setIsLoading(false);
    } catch (error: any) {
      toast({
        title: "Failed to load trading data",
        description: error.message,
        variant: "destructive"
      });
      setIsLoading(false);
    }
  };

  const totalAllocation = activeBots.reduce((sum, bot) => sum + (1000), 0); // Mock allocation
  const totalTradesToday = recentTrades.filter(t => 
    t.timestamp.toDateString() === new Date().toDateString()
  ).length;

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Live Trading Monitor
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-20 bg-muted rounded" />
            <div className="h-32 bg-muted rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* System Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Activity className="w-5 h-5" />
            Live Trading Monitor
            <Badge variant={isSystemActive ? "default" : "secondary"}>
              {isSystemActive ? 'Active' : 'Inactive'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{activeBots.length}</div>
              <div className="text-sm text-muted-foreground">Active Bots</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">${totalAllocation.toLocaleString()}</div>
              <div className="text-sm text-muted-foreground">Total Allocation</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalTradesToday}</div>
              <div className="text-sm text-muted-foreground">Trades Today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">+2.4%</div>
              <div className="text-sm text-muted-foreground">Daily P&L</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Active Bots Status */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Active Bots ({activeBots.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {activeBots.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Bot className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No active bots</p>
              <p className="text-xs">Switch to automated mode and activate bots in the Trade Bots section</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activeBots.map((bot) => (
                <div key={bot.workspace_id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <div>
                      <div className="font-medium">{bot.name || 'Unnamed Bot'}</div>
                      <div className="text-sm text-muted-foreground">
                        {bot.mode} • Target: {(bot.daily_return_target_pct * 100).toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={bot.risk_indicator === 'high' ? 'destructive' : 'secondary'}>
                      {bot.risk_indicator} risk
                    </Badge>
                    <Badge variant="outline">{bot.execution_mode}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            Recent Trades
          </CardTitle>
        </CardHeader>
        <CardContent>
          {recentTrades.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Activity className="w-12 h-12 mx-auto mb-2 opacity-50" />
              <p>No recent trades</p>
              <p className="text-xs">Trades will appear here when bots execute orders</p>
            </div>
          ) : (
            <ScrollArea className="h-64">
              <div className="space-y-2">
                {recentTrades.slice(0, 10).map((trade) => (
                  <div key={trade.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`p-1 rounded ${
                        trade.action === 'buy' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {trade.action === 'buy' ? (
                          <TrendingUp className="w-3 h-3" />
                        ) : (
                          <TrendingDown className="w-3 h-3" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium text-sm">
                          {trade.action.toUpperCase()} {trade.quantity} {trade.symbol}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {trade.bot_name} • ${trade.price.toFixed(2)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge 
                        variant={trade.status === 'filled' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {trade.status}
                      </Badge>
                      <div className="text-xs text-muted-foreground mt-1">
                        {trade.timestamp.toLocaleTimeString()}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      {isSystemActive && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              <AlertCircle className="w-4 h-4" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={loadData}>
                <Activity className="w-4 h-4 mr-2" />
                Refresh Data
              </Button>
              <Button variant="outline" size="sm">
                <Target className="w-4 h-4 mr-2" />
                View Positions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}