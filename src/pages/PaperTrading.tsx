import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  PlayCircle, 
  PauseCircle,
  RotateCcw,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DemoModeIndicator } from '@/components/demo/DemoModeIndicator';

interface PayloadData {
  side?: string;
  quantity?: number;
  price?: number;
  status?: string;
  pnl?: number;
}

interface PaperTrade {
  id: string;
  symbol: string;
  side: 'buy' | 'sell';
  quantity: number;
  price: number;
  timestamp: string;
  status: 'pending' | 'filled' | 'cancelled';
  pnl?: number;
}

interface PaperPosition {
  symbol: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  unrealizedPnl: number;
  realizedPnl: number;
}

export default function PaperTrading() {
  const [isActive, setIsActive] = useState(false);
  const [portfolio, setPortfolio] = useState({
    cash: 100000,
    equity: 100000,
    totalValue: 100000,
    dayPnL: 0,
    totalPnL: 0
  });
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [trades, setTrades] = useState<PaperTrade[]>([]);
  const [orderSymbol, setOrderSymbol] = useState('');
  const [orderQuantity, setOrderQuantity] = useState('');
  const [orderPrice, setOrderPrice] = useState('');
  const [orderSide, setOrderSide] = useState<'buy' | 'sell'>('buy');
  
  const { user } = useAuthStore();
  const { toast } = useToast();

  useEffect(() => {
    loadPaperTradingData();
  }, [user]);

  const loadPaperTradingData = async () => {
    if (!user?.id) return;

    try {
      const { data: profileData } = await supabase
        .from('bot_profiles')
        .select('*')
        .eq('user_id', user.id)
        .eq('name', 'Paper Trading Sandbox')
        .single();

      if (profileData) {
        setIsActive(profileData.active);
      }

      // Load paper trading history from rec_events
      const { data: tradeHistory } = await supabase
        .from('rec_events')
        .select('*')
        .eq('user_id', user.id)
        .eq('event_type', 'paper_trade')
        .order('ts', { ascending: false })
        .limit(50);

      if (tradeHistory) {
        const paperTrades: PaperTrade[] = tradeHistory.map(event => {
          const payload = event.payload_json as PayloadData;
          return {
            id: event.id,
            symbol: event.entity_id || 'UNKNOWN',
            side: (payload?.side as 'buy' | 'sell') || 'buy',
            quantity: payload?.quantity || 0,
            price: payload?.price || 0,
            timestamp: event.ts,
            status: (payload?.status as 'pending' | 'filled' | 'cancelled') || 'filled',
            pnl: payload?.pnl
          };
        });
        setTrades(paperTrades);
      }
    } catch (error) {
      console.error('Error loading paper trading data:', error);
    }
  };

  const togglePaperTrading = async () => {
    if (!user?.id) return;

    try {
      // For now, we'll store paper trading state in local storage
      // In production, this would use the paper trading API
      const newActiveState = !isActive;
      localStorage.setItem('paperTradingActive', JSON.stringify(newActiveState));
      setIsActive(newActiveState);

      // Log the toggle event
      await supabase
        .from('rec_events')
        .insert({
          user_id: user.id,
          event_type: 'paper_trading_toggle',
          entity_type: 'system',
          entity_id: 'paper_sandbox',
          summary: `Paper trading ${newActiveState ? 'activated' : 'deactivated'}`,
          payload_json: { active: newActiveState }
        });

      toast({
        title: `Paper Trading ${newActiveState ? 'Activated' : 'Deactivated'}`,
        description: `Paper trading sandbox is now ${newActiveState ? 'running' : 'stopped'}.`
      });
    } catch (error) {
      console.error('Error toggling paper trading:', error);
      toast({
        title: "Error",
        description: "Failed to toggle paper trading mode.",
        variant: "destructive"
      });
    }
  };

  const placePaperOrder = async () => {
    if (!user?.id || !orderSymbol || !orderQuantity || !orderPrice) return;

    try {
      const tradeData = {
        symbol: orderSymbol.toUpperCase(),
        side: orderSide,
        quantity: parseFloat(orderQuantity),
        price: parseFloat(orderPrice),
        timestamp: new Date().toISOString(),
        status: 'filled' as const
      };

      // Log the paper trade
      await supabase
        .from('rec_events')
        .insert({
          user_id: user.id,
          event_type: 'paper_trade',
          entity_type: 'order',
          entity_id: tradeData.symbol,
          summary: `Paper ${tradeData.side} order: ${tradeData.quantity} shares of ${tradeData.symbol} at $${tradeData.price}`,
          payload_json: tradeData
        });

      // Add to local trades
      const newTrade: PaperTrade = {
        id: Date.now().toString(),
        ...tradeData
      };
      setTrades(prev => [newTrade, ...prev]);

      // Clear form
      setOrderSymbol('');
      setOrderQuantity('');
      setOrderPrice('');

      toast({
        title: "Paper Order Placed",
        description: `${tradeData.side.toUpperCase()} ${tradeData.quantity} shares of ${tradeData.symbol} at $${tradeData.price}`
      });
    } catch (error) {
      console.error('Error placing paper order:', error);
      toast({
        title: "Error",
        description: "Failed to place paper order.",
        variant: "destructive"
      });
    }
  };

  const resetPaperAccount = async () => {
    if (!user?.id) return;

    try {
      await supabase
        .from('rec_events')
        .insert({
          user_id: user.id,
          event_type: 'paper_account_reset',
          entity_type: 'account',
          entity_id: 'paper_sandbox',
          summary: 'Paper trading account reset to $100,000',
          payload_json: { reset_amount: 100000 }
        });

      setPortfolio({
        cash: 100000,
        equity: 100000,
        totalValue: 100000,
        dayPnL: 0,
        totalPnL: 0
      });
      setPositions([]);
      setTrades([]);

      toast({
        title: "Account Reset",
        description: "Paper trading account has been reset to $100,000."
      });
    } catch (error) {
      console.error('Error resetting paper account:', error);
      toast({
        title: "Error",
        description: "Failed to reset paper account.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            Paper Trading Sandbox
            <DemoModeIndicator variant="badge" />
          </h1>
          <p className="text-muted-foreground mt-2">
            Practice trading strategies with virtual money in a risk-free environment
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Button
            onClick={resetPaperAccount}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
            Reset Account
          </Button>
          <Button
            onClick={togglePaperTrading}
            variant={isActive ? "destructive" : "default"}
            className="flex items-center gap-2"
          >
            {isActive ? (
              <>
                <PauseCircle className="w-4 h-4" />
                Stop Trading
              </>
            ) : (
              <>
                <PlayCircle className="w-4 h-4" />
                Start Trading
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-primary" />
              {portfolio.totalValue.toLocaleString()}
            </div>
            <p className={`text-sm flex items-center ${
              portfolio.totalPnL >= 0 ? 'text-accent' : 'text-destructive'
            }`}>
              {portfolio.totalPnL >= 0 ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
              {portfolio.totalPnL >= 0 ? '+' : ''}${portfolio.totalPnL.toFixed(2)} Total P&L
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Buying Power</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${portfolio.cash.toLocaleString()}</div>
            <p className="text-sm text-muted-foreground">Available Cash</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Day P&L</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              portfolio.dayPnL >= 0 ? 'text-accent' : 'text-destructive'
            }`}>
              {portfolio.dayPnL >= 0 ? '+' : ''}${portfolio.dayPnL.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground">Today's Performance</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              {isActive ? (
                <>
                  <CheckCircle className="w-5 h-5 text-accent" />
                  <span className="text-accent font-semibold">Active</span>
                </>
              ) : (
                <>
                  <Clock className="w-5 h-5 text-muted-foreground" />
                  <span className="text-muted-foreground">Inactive</span>
                </>
              )}
            </div>
            <p className="text-sm text-muted-foreground">Trading Status</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="trading" className="space-y-6">
        <TabsList>
          <TabsTrigger value="trading">Trading Interface</TabsTrigger>
          <TabsTrigger value="positions">Positions</TabsTrigger>
          <TabsTrigger value="history">Trade History</TabsTrigger>
        </TabsList>

        <TabsContent value="trading">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Order Entry */}
            <Card className="lg:col-span-1 bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Place Paper Order</CardTitle>
                <CardDescription>
                  Practice placing orders with virtual money
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2">
                  <Button
                    variant={orderSide === 'buy' ? "default" : "outline"}
                    onClick={() => setOrderSide('buy')}
                    className="flex-1"
                  >
                    Buy
                  </Button>
                  <Button
                    variant={orderSide === 'sell' ? "destructive" : "outline"}
                    onClick={() => setOrderSide('sell')}
                    className="flex-1"
                  >
                    Sell
                  </Button>
                </div>

                <div>
                  <label className="text-sm font-medium">Symbol</label>
                  <Input
                    value={orderSymbol}
                    onChange={(e) => setOrderSymbol(e.target.value.toUpperCase())}
                    placeholder="e.g., AAPL"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Quantity</label>
                  <Input
                    type="number"
                    value={orderQuantity}
                    onChange={(e) => setOrderQuantity(e.target.value)}
                    placeholder="Number of shares"
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Price</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={orderPrice}
                    onChange={(e) => setOrderPrice(e.target.value)}
                    placeholder="Price per share"
                    className="mt-1"
                  />
                </div>

                <Button
                  onClick={placePaperOrder}
                  disabled={!isActive || !orderSymbol || !orderQuantity || !orderPrice}
                  className="w-full"
                  variant={orderSide === 'buy' ? "default" : "destructive"}
                >
                  <Target className="w-4 h-4 mr-2" />
                  Place {orderSide.toUpperCase()} Order
                </Button>

                {!isActive && (
                  <div className="flex items-center gap-2 text-warning text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Paper trading is currently inactive
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Market Overview */}
            <Card className="lg:col-span-2 bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Paper Trading Guidelines</CardTitle>
                <CardDescription>
                  Best practices for effective paper trading
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-accent" />
                      Learning Objectives
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Test strategies without risk</li>
                      <li>• Learn order types and execution</li>
                      <li>• Practice risk management</li>
                      <li>• Build trading confidence</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <Target className="w-4 h-4 text-primary" />
                      Key Features
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• $100,000 virtual capital</li>
                      <li>• Real-time market simulation</li>
                      <li>• Complete trade history</li>
                      <li>• Performance analytics</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      Important Notes
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• No real money involved</li>
                      <li>• Prices may differ from live markets</li>
                      <li>• Perfect for strategy testing</li>
                      <li>• Reset anytime to start fresh</li>
                    </ul>
                  </div>

                  <div className="p-4 rounded-lg bg-muted/30">
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <DollarSign className="w-4 h-4 text-accent" />
                      Next Steps
                    </h4>
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Connect real brokerage account</li>
                      <li>• Upgrade to live trading</li>
                      <li>• Access advanced features</li>
                      <li>• Use automated strategies</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="positions">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Open Positions</CardTitle>
              <CardDescription>Current paper trading positions</CardDescription>
            </CardHeader>
            <CardContent>
              {positions.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No open positions</p>
                  <p className="text-sm">Place some trades to see positions here</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {positions.map((position, index) => (
                    <div 
                      key={index}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div>
                        <p className="font-semibold">{position.symbol}</p>
                        <p className="text-sm text-muted-foreground">
                          {position.quantity} shares @ ${position.avgPrice.toFixed(2)}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${
                          position.unrealizedPnl >= 0 ? 'text-accent' : 'text-destructive'
                        }`}>
                          {position.unrealizedPnl >= 0 ? '+' : ''}${position.unrealizedPnl.toFixed(2)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          ${position.currentPrice.toFixed(2)} current
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Trade History</CardTitle>
              <CardDescription>All paper trading transactions</CardDescription>
            </CardHeader>
            <CardContent>
              {trades.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No trades yet</p>
                  <p className="text-sm">Start trading to build your history</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {trades.map((trade) => (
                    <div 
                      key={trade.id}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/30"
                    >
                      <div className="flex items-center gap-3">
                        <Badge variant={trade.side === 'buy' ? 'default' : 'destructive'}>
                          {trade.side.toUpperCase()}
                        </Badge>
                        <div>
                          <p className="font-semibold">{trade.symbol}</p>
                          <p className="text-sm text-muted-foreground">
                            {trade.quantity} shares @ ${trade.price.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">
                          {new Date(trade.timestamp).toLocaleString()}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {trade.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}