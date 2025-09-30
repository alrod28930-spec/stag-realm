import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Bot, TrendingUp, TrendingDown, DollarSign, Activity, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface LiveTrade {
  id: string;
  bot_id: string;
  bot_name: string;
  symbol: string;
  action: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: Date;
  pnl?: number;
  status: 'pending' | 'filled' | 'cancelled';
}

interface LiveBotTradeOverlayProps {
  symbol: string;
  onTradeExecuted?: (trade: LiveTrade) => void;
  isActive?: boolean;
  botName?: string;
}

export function LiveBotTradeOverlay({ symbol, onTradeExecuted, isActive = false, botName }: LiveBotTradeOverlayProps) {
  const [recentTrades, setRecentTrades] = useState<LiveTrade[]>([]);
  const [totalPnL, setTotalPnL] = useState<number>(0);

  useEffect(() => {
    if (!isActive) {
      setRecentTrades([]);
      setTotalPnL(0);
      return;
    }
    
    loadLiveTrades();
  }, [symbol, isActive]);

  const loadLiveTrades = () => {
    // Generate mock recent trades for the symbol
    const mockTrades: LiveTrade[] = Array.from({ length: Math.floor(Math.random() * 2) + 1 }, (_, i) => ({
      id: `trade-${symbol}-${i}`,
      bot_id: `bot-${i}`,
      bot_name: botName || 'Trading Bot',
      symbol,
      action: Math.random() > 0.5 ? 'buy' : 'sell',
      quantity: Math.floor(Math.random() * 100) + 10,
      price: Math.random() * 50 + 100,
      timestamp: new Date(Date.now() - Math.random() * 300000), // Last 5 minutes
      pnl: (Math.random() - 0.4) * 500, // Slightly positive bias
      status: 'filled'
    }));

    setRecentTrades(mockTrades);
    setTotalPnL(mockTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0));
  };


  if (!isActive) {
    return null;
  }

  return (
    <div className="absolute top-2 right-2 z-10 space-y-2">
      {/* Bot Status Card */}
      <Card className="bg-background/90 backdrop-blur-sm shadow-lg">
        <CardContent className="p-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <Bot className="w-4 h-4" />
              <span className="text-sm font-medium">{botName || 'Bot Active'}</span>
            </div>
            <div className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              <span className={`text-sm font-semibold ${totalPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(0)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Recent Trades */}
      {recentTrades.length > 0 && (
        <Card className="bg-background/90 backdrop-blur-sm shadow-lg min-w-[280px]">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4" />
              <span className="text-sm font-medium">Live Trades - {symbol}</span>
            </div>
            <div className="space-y-2 max-h-32 overflow-y-auto">
              {recentTrades.slice(0, 3).map((trade) => (
                <div key={trade.id} className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <div className={`p-1 rounded ${
                      trade.action === 'buy' 
                        ? 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' 
                        : 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400'
                    }`}>
                      {trade.action === 'buy' ? (
                        <TrendingUp className="w-2 h-2" />
                      ) : (
                        <TrendingDown className="w-2 h-2" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium">
                        {trade.action.toUpperCase()} {trade.quantity}
                      </div>
                      <div className="text-muted-foreground">
                        {trade.bot_name}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${trade.price.toFixed(2)}</div>
                    {trade.pnl !== undefined && (
                      <div className={`${trade.pnl >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {trade.pnl >= 0 ? '+' : ''}{trade.pnl.toFixed(0)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}