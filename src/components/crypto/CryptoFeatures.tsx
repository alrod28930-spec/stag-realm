import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Coins,
  Activity,
  BarChart3,
  Calculator,
  AlertTriangle,
  Info,
  DollarSign,
  Clock,
  Shield
} from 'lucide-react';

interface CryptoCurrency {
  symbol: string;
  name: string;
  price: number;
  change24h: number;
  marketCap: string;
  volume: string;
  dominance?: number;
}

interface CryptoAlert {
  type: 'price' | 'volume' | 'news';
  message: string;
  timestamp: string;
  severity: 'info' | 'warning' | 'high';
}

export default function CryptoFeatures() {
  const [selectedCrypto, setSelectedCrypto] = useState<string>('BTC');

  // Sample crypto data - in production this would come from an API
  const cryptos: CryptoCurrency[] = [
    {
      symbol: 'BTC',
      name: 'Bitcoin',
      price: 67450.32,
      change24h: 2.45,
      marketCap: '1.32T',
      volume: '28.5B',
      dominance: 54.2
    },
    {
      symbol: 'ETH',
      name: 'Ethereum',
      price: 3890.75,
      change24h: -1.23,
      marketCap: '467.8B',
      volume: '15.2B',
      dominance: 19.1
    },
    {
      symbol: 'BNB',
      name: 'Binance Coin',
      price: 598.44,
      change24h: 0.87,
      marketCap: '87.2B',
      volume: '1.8B',
      dominance: 3.6
    },
    {
      symbol: 'SOL',
      name: 'Solana',
      price: 234.12,
      change24h: 4.56,
      marketCap: '112.3B',
      volume: '4.1B',
      dominance: 4.6
    },
    {
      symbol: 'ADA',
      name: 'Cardano',
      price: 1.12,
      change24h: -2.14,
      marketCap: '39.7B',
      volume: '892M',
      dominance: 1.6
    }
  ];

  const alerts: CryptoAlert[] = [
    {
      type: 'price',
      message: 'Bitcoin broke above $67,000 resistance level',
      timestamp: '5 minutes ago',
      severity: 'high'
    },
    {
      type: 'volume',
      message: 'Unusual volume spike detected in Ethereum',
      timestamp: '12 minutes ago',
      severity: 'warning'
    },
    {
      type: 'news',
      message: 'Major institutional adoption announcement',
      timestamp: '1 hour ago',
      severity: 'info'
    }
  ];

  const correlationData = [
    { asset: 'S&P 500', correlation: 0.65, change: '+0.12' },
    { asset: 'Gold', correlation: -0.23, change: '-0.05' },
    { asset: 'USD Index', correlation: -0.58, change: '-0.08' },
    { asset: 'Nasdaq', correlation: 0.72, change: '+0.15' }
  ];

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'high': return 'text-destructive';
      case 'warning': return 'text-warning';
      case 'info': return 'text-info';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Coins className="w-6 h-6 text-primary" />
          Cryptocurrency Intelligence
        </h2>
        <p className="text-muted-foreground mt-2">
          Advanced crypto analysis and correlation tracking (No external dependencies)
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Market Overview</TabsTrigger>
          <TabsTrigger value="correlations">Traditional Asset Correlations</TabsTrigger>
          <TabsTrigger value="alerts">Smart Alerts</TabsTrigger>
          <TabsTrigger value="calculator">Crypto Calculator</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Market Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Total Market Cap</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$2.48T</div>
                <p className="text-sm text-accent flex items-center">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  +1.8% (24h)
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">24h Volume</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">$89.2B</div>
                <p className="text-sm text-muted-foreground">
                  Across all markets
                </p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Fear & Greed Index</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-accent">72</div>
                <p className="text-sm text-muted-foreground">Greed</p>
              </CardContent>
            </Card>
          </div>

          {/* Top Cryptocurrencies */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Top Cryptocurrencies</CardTitle>
              <CardDescription>
                Market leaders by market capitalization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {cryptos.map((crypto, index) => (
                  <div 
                    key={crypto.symbol}
                    className={`flex items-center justify-between p-3 rounded-lg transition-colors cursor-pointer ${
                      selectedCrypto === crypto.symbol 
                        ? 'bg-primary/10 border border-primary/30' 
                        : 'bg-muted/30 hover:bg-muted/50'
                    }`}
                    onClick={() => setSelectedCrypto(crypto.symbol)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-primary flex items-center justify-center text-xs font-bold text-primary-foreground">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{crypto.symbol}</span>
                          <Badge variant="outline" className="text-xs">
                            {crypto.name}
                          </Badge>
                        </div>
                        {crypto.dominance && (
                          <span className="text-xs text-muted-foreground">
                            {crypto.dominance}% dominance
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="font-semibold">
                        ${crypto.price.toLocaleString()}
                      </div>
                      <div className={`text-sm flex items-center justify-end ${
                        crypto.change24h >= 0 ? 'text-accent' : 'text-destructive'
                      }`}>
                        {crypto.change24h >= 0 ? (
                          <TrendingUp className="w-3 h-3 mr-1" />
                        ) : (
                          <TrendingDown className="w-3 h-3 mr-1" />
                        )}
                        {crypto.change24h >= 0 ? '+' : ''}{crypto.change24h.toFixed(2)}%
                      </div>
                    </div>
                    
                    <div className="text-right text-sm text-muted-foreground">
                      <div>Cap: {crypto.marketCap}</div>
                      <div>Vol: {crypto.volume}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="correlations" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                Bitcoin vs Traditional Assets
              </CardTitle>
              <CardDescription>
                Correlation analysis helps understand crypto behavior relative to traditional markets
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {correlationData.map((item, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <span className="font-medium">{item.asset}</span>
                      <p className="text-sm text-muted-foreground">
                        30-day rolling correlation
                      </p>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <div className={`font-semibold ${
                          Math.abs(item.correlation) > 0.5 ? 'text-warning' : 'text-muted-foreground'
                        }`}>
                          {item.correlation.toFixed(2)}
                        </div>
                        <div className={`text-xs ${
                          item.change.includes('+') ? 'text-accent' : 'text-destructive'
                        }`}>
                          {item.change} (7d)
                        </div>
                      </div>
                      
                      <div className="w-20 h-2 bg-muted rounded-full overflow-hidden">
                        <div 
                          className={`h-full transition-all ${
                            item.correlation > 0 ? 'bg-accent' : 'bg-destructive'
                          }`}
                          style={{ width: `${Math.abs(item.correlation) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="mt-6 p-4 bg-info/10 rounded-lg border border-info/20">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-info" />
                  <h4 className="font-semibold text-info">Correlation Insights</h4>
                </div>
                <ul className="text-sm space-y-1 text-muted-foreground">
                  <li>• Values near +1.0 indicate strong positive correlation</li>
                  <li>• Values near -1.0 indicate strong negative correlation</li>
                  <li>• Values near 0.0 indicate little to no correlation</li>
                  <li>• High correlations may indicate similar risk factors</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-primary" />
                Smart Market Alerts
              </CardTitle>
              <CardDescription>
                Intelligent notifications based on technical patterns and market conditions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-center gap-3 p-3 rounded-lg bg-muted/30">
                  <div className={`p-2 rounded-full ${
                    alert.type === 'price' ? 'bg-accent/20' :
                    alert.type === 'volume' ? 'bg-warning/20' : 'bg-info/20'
                  }`}>
                    {alert.type === 'price' ? (
                      <TrendingUp className="w-4 h-4 text-accent" />
                    ) : alert.type === 'volume' ? (
                      <BarChart3 className="w-4 h-4 text-warning" />
                    ) : (
                      <Info className="w-4 h-4 text-info" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <p className={`font-medium ${getSeverityColor(alert.severity)}`}>
                      {alert.message}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {alert.timestamp}
                    </div>
                  </div>
                  
                  <Badge 
                    variant={alert.severity === 'high' ? 'destructive' : 
                            alert.severity === 'warning' ? 'secondary' : 'outline'}
                  >
                    {alert.severity}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Alert Configuration</CardTitle>
              <CardDescription>
                Customize your crypto market notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-2">Price Alerts</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Support/Resistance breaks</li>
                    <li>• Moving average crossovers</li>
                    <li>• Percentage change thresholds</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-2">Volume Alerts</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Unusual volume spikes</li>
                    <li>• Volume divergences</li>
                    <li>• Accumulation/Distribution signals</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-2">Technical Alerts</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• RSI overbought/oversold</li>
                    <li>• MACD signal changes</li>
                    <li>• Bollinger Band squeezes</li>
                  </ul>
                </div>
                
                <div className="p-3 rounded-lg bg-muted/30">
                  <h4 className="font-medium mb-2">Market Alerts</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Fear & Greed Index changes</li>
                    <li>• Market dominance shifts</li>
                    <li>• Correlation breakdowns</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="calculator" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-primary" />
                  Position Size Calculator
                </CardTitle>
                <CardDescription>
                  Calculate optimal position sizes for crypto trades
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Account Size ($)</label>
                    <div className="mt-1 p-2 rounded border bg-muted/30">
                      <span className="text-sm">100,000</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Risk per Trade (%)</label>
                    <div className="mt-1 p-2 rounded border bg-muted/30">
                      <span className="text-sm">2.0</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Entry Price ($)</label>
                    <div className="mt-1 p-2 rounded border bg-muted/30">
                      <span className="text-sm">67,450</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Stop Loss ($)</label>
                    <div className="mt-1 p-2 rounded border bg-muted/30">
                      <span className="text-sm">65,000</span>
                    </div>
                  </div>
                </div>

                <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                  <h4 className="font-semibold text-accent mb-2">Calculated Position</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Max Risk Amount:</div>
                    <div className="font-medium">$2,000</div>
                    <div>Risk per Unit:</div>
                    <div className="font-medium">$2,450</div>
                    <div>Position Size:</div>
                    <div className="font-medium text-accent">0.816 BTC</div>
                    <div>Position Value:</div>
                    <div className="font-medium">$55,049</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-primary" />
                  Profit/Loss Calculator
                </CardTitle>
                <CardDescription>
                  Calculate potential profits and losses
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Position Size</label>
                    <div className="mt-1 p-2 rounded border bg-muted/30">
                      <span className="text-sm">1.0 BTC</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Entry Price ($)</label>
                    <div className="mt-1 p-2 rounded border bg-muted/30">
                      <span className="text-sm">67,450</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Current Price ($)</label>
                    <div className="mt-1 p-2 rounded border bg-muted/30">
                      <span className="text-sm">69,200</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Fees (%)</label>
                    <div className="mt-1 p-2 rounded border bg-muted/30">
                      <span className="text-sm">0.25</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-accent/10 border border-accent/20">
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Unrealized P&L:</div>
                      <div className="font-medium text-accent">+$1,750.00</div>
                      <div>Percentage Gain:</div>
                      <div className="font-medium text-accent">+2.59%</div>
                    </div>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-muted/30">
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>Entry Fees:</div>
                      <div>$168.63</div>
                      <div>Exit Fees (est.):</div>
                      <div>$173.00</div>
                      <div>Total Fees:</div>
                      <div className="font-medium">$341.63</div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Disclaimer */}
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-semibold text-destructive mb-2">Cryptocurrency Trading Risks</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• Cryptocurrencies are highly volatile and can lose significant value rapidly</p>
                    <p>• Regulatory changes can impact crypto markets dramatically</p>
                    <p>• Technical failures, hacks, or exchange issues can result in total loss</p>
                    <p>• Market manipulation and pump-and-dump schemes are common</p>
                    <p>• Never invest more than you can afford to lose completely</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}