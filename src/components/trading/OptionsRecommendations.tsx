import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Target, 
  Shield,
  AlertTriangle,
  Calendar,
  DollarSign,
  Percent,
  Activity
} from 'lucide-react';

interface OptionRecommendation {
  symbol: string;
  underlying: string;
  type: 'call' | 'put';
  strike: number;
  expiration: string;
  premium: number;
  impliedVol: number;
  delta: number;
  gamma: number;
  theta: number;
  strategy: string;
  reasoning: string;
  riskLevel: 'low' | 'medium' | 'high';
  maxRisk: number;
  maxReward: number;
}

interface OptionsStrategy {
  name: string;
  description: string;
  marketOutlook: string;
  riskLevel: 'low' | 'medium' | 'high';
  complexity: 'beginner' | 'intermediate' | 'advanced';
  legs: number;
}

export default function OptionsRecommendations() {
  const [recommendations, setRecommendations] = useState<OptionRecommendation[]>([]);
  const [selectedStrategy, setSelectedStrategy] = useState<string>('all');

  const strategies: OptionsStrategy[] = [
    {
      name: 'Long Call',
      description: 'Buy a call option expecting the stock to rise',
      marketOutlook: 'Bullish',
      riskLevel: 'medium',
      complexity: 'beginner',
      legs: 1
    },
    {
      name: 'Long Put',
      description: 'Buy a put option expecting the stock to fall',
      marketOutlook: 'Bearish',
      riskLevel: 'medium',
      complexity: 'beginner',
      legs: 1
    },
    {
      name: 'Covered Call',
      description: 'Own stock and sell call option for income',
      marketOutlook: 'Neutral to Slightly Bullish',
      riskLevel: 'low',
      complexity: 'beginner',
      legs: 2
    },
    {
      name: 'Cash-Secured Put',
      description: 'Sell put option while holding cash to buy stock',
      marketOutlook: 'Neutral to Bullish',
      riskLevel: 'medium',
      complexity: 'beginner',
      legs: 1
    },
    {
      name: 'Bull Call Spread',
      description: 'Buy lower strike call, sell higher strike call',
      marketOutlook: 'Moderately Bullish',
      riskLevel: 'medium',
      complexity: 'intermediate',
      legs: 2
    },
    {
      name: 'Bear Put Spread',
      description: 'Buy higher strike put, sell lower strike put',
      marketOutlook: 'Moderately Bearish',
      riskLevel: 'medium',
      complexity: 'intermediate',
      legs: 2
    },
    {
      name: 'Iron Condor',
      description: 'Sell put spread and call spread for neutral income',
      marketOutlook: 'Neutral',
      riskLevel: 'medium',
      complexity: 'advanced',
      legs: 4
    },
    {
      name: 'Straddle',
      description: 'Buy call and put at same strike for volatility play',
      marketOutlook: 'High Volatility Expected',
      riskLevel: 'high',
      complexity: 'intermediate',
      legs: 2
    }
  ];

  // Sample recommendations data
  useEffect(() => {
    const sampleRecommendations: OptionRecommendation[] = [
      {
        symbol: 'AAPL241220C175',
        underlying: 'AAPL',
        type: 'call',
        strike: 175,
        expiration: '2024-12-20',
        premium: 8.50,
        impliedVol: 0.28,
        delta: 0.65,
        gamma: 0.04,
        theta: -0.12,
        strategy: 'Long Call',
        reasoning: 'Strong earnings momentum and bullish technical patterns suggest upward movement potential',
        riskLevel: 'medium',
        maxRisk: 850,
        maxReward: 9999
      },
      {
        symbol: 'TSLA241220P240',
        underlying: 'TSLA',
        type: 'put',
        strike: 240,
        expiration: '2024-12-20',
        premium: 12.30,
        impliedVol: 0.45,
        delta: -0.42,
        gamma: 0.03,
        theta: -0.18,
        strategy: 'Long Put',
        reasoning: 'Overvalued metrics and potential market correction could drive price lower',
        riskLevel: 'high',
        maxRisk: 1230,
        maxReward: 22770
      },
      {
        symbol: 'MSFT_COVERED_CALL',
        underlying: 'MSFT',
        type: 'call',
        strike: 380,
        expiration: '2024-12-20',
        premium: 4.20,
        impliedVol: 0.22,
        delta: 0.35,
        gamma: 0.02,
        theta: -0.08,
        strategy: 'Covered Call',
        reasoning: 'Generate income on existing position while maintaining upside to $380',
        riskLevel: 'low',
        maxRisk: 0,
        maxReward: 420
      }
    ];
    setRecommendations(sampleRecommendations);
  }, []);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'low': return 'text-accent';
      case 'medium': return 'text-warning';
      case 'high': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'beginner': return 'bg-accent/20 text-accent';
      case 'intermediate': return 'bg-warning/20 text-warning';
      case 'advanced': return 'bg-destructive/20 text-destructive';
      default: return 'bg-muted/20 text-muted-foreground';
    }
  };

  const filteredRecommendations = selectedStrategy === 'all' 
    ? recommendations 
    : recommendations.filter(rec => rec.strategy === selectedStrategy);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold flex items-center gap-3">
          <Target className="w-6 h-6 text-primary" />
          Options Trading Recommendations
        </h2>
        <p className="text-muted-foreground mt-2">
          AI-powered options strategies and trade recommendations
        </p>
      </div>

      <Tabs defaultValue="recommendations" className="space-y-6">
        <TabsList>
          <TabsTrigger value="recommendations">Current Recommendations</TabsTrigger>
          <TabsTrigger value="strategies">Strategy Guide</TabsTrigger>
          <TabsTrigger value="education">Options Education</TabsTrigger>
        </TabsList>

        <TabsContent value="recommendations" className="space-y-6">
          {/* Filter */}
          <Card className="bg-gradient-card shadow-card">
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                <Button
                  variant={selectedStrategy === 'all' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedStrategy('all')}
                >
                  All Strategies
                </Button>
                {Array.from(new Set(recommendations.map(r => r.strategy))).map(strategy => (
                  <Button
                    key={strategy}
                    variant={selectedStrategy === strategy ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedStrategy(strategy)}
                  >
                    {strategy}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {filteredRecommendations.map((rec, index) => (
              <Card key={index} className="bg-gradient-card shadow-card">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {rec.type === 'call' ? (
                          <TrendingUp className="w-5 h-5 text-accent" />
                        ) : (
                          <TrendingDown className="w-5 h-5 text-destructive" />
                        )}
                        {rec.underlying} {rec.type.toUpperCase()}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Calendar className="w-4 h-4" />
                        ${rec.strike} Strike • Exp: {new Date(rec.expiration).toLocaleDateString()}
                      </CardDescription>
                    </div>
                    <Badge className={getRiskColor(rec.riskLevel)}>
                      {rec.riskLevel.toUpperCase()} RISK
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Premium:</span>
                        <span className="font-medium">${rec.premium.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Delta:</span>
                        <span className="font-medium">{rec.delta.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Implied Vol:</span>
                        <span className="font-medium">{(rec.impliedVol * 100).toFixed(1)}%</span>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Max Risk:</span>
                        <span className="font-medium text-destructive">
                          ${rec.maxRisk.toLocaleString()}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Max Reward:</span>
                        <span className="font-medium text-accent">
                          {rec.maxReward === 9999 ? 'Unlimited' : `$${rec.maxReward.toLocaleString()}`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Theta:</span>
                        <span className="font-medium">{rec.theta.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Strategy & Reasoning */}
                  <div className="space-y-2">
                    <Badge variant="outline" className="text-xs">
                      {rec.strategy}
                    </Badge>
                    <p className="text-sm text-muted-foreground">{rec.reasoning}</p>
                  </div>

                  {/* Action Button */}
                  <Button variant="outline" className="w-full">
                    View Full Analysis
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredRecommendations.length === 0 && (
            <Card className="bg-gradient-card shadow-card">
              <CardContent className="text-center py-12">
                <Target className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">No recommendations found for the selected strategy</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="strategies" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {strategies.map((strategy, index) => (
              <Card key={index} className="bg-gradient-card shadow-card">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{strategy.name}</CardTitle>
                    <Badge className={getComplexityColor(strategy.complexity)} variant="outline">
                      {strategy.complexity}
                    </Badge>
                  </div>
                  <CardDescription className="text-xs">
                    {strategy.legs} leg{strategy.legs > 1 ? 's' : ''} • {strategy.marketOutlook}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <p className="text-sm">{strategy.description}</p>
                  
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      <Shield className="w-3 h-3" />
                      <span className={getRiskColor(strategy.riskLevel)}>
                        {strategy.riskLevel} risk
                      </span>
                    </div>
                    <Button variant="ghost" size="sm" className="h-6 text-xs">
                      Learn More
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="education" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Options Basics */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="w-5 h-5 text-primary" />
                  Options Basics
                </CardTitle>
                <CardDescription>
                  Fundamental concepts every options trader should know
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-muted/30">
                    <h4 className="font-medium text-sm mb-1">What are Options?</h4>
                    <p className="text-xs text-muted-foreground">
                      Contracts that give you the right (not obligation) to buy or sell a stock at a specific price before expiration.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-muted/30">
                    <h4 className="font-medium text-sm mb-1">Call vs Put Options</h4>
                    <p className="text-xs text-muted-foreground">
                      Calls profit when stock goes up, puts profit when stock goes down. You can buy or sell either type.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-muted/30">
                    <h4 className="font-medium text-sm mb-1">The Greeks</h4>
                    <p className="text-xs text-muted-foreground">
                      Delta, Gamma, Theta, and Vega measure how option prices change with underlying factors.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Risk Management */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-warning" />
                  Risk Management
                </CardTitle>
                <CardDescription>
                  Essential practices for options trading safety
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-warning" />
                      <h4 className="font-medium text-sm">Position Sizing</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Never risk more than 1-2% of your portfolio on a single options trade.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-warning" />
                      <h4 className="font-medium text-sm">Time Decay</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Options lose value as expiration approaches. Plan your exit strategy in advance.
                    </p>
                  </div>
                  
                  <div className="p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex items-center gap-2 mb-1">
                      <Percent className="w-4 h-4 text-warning" />
                      <h4 className="font-medium text-sm">Implied Volatility</h4>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      High IV can lead to quick losses. Consider volatility when entering trades.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Warning Notice */}
          <Card className="bg-destructive/5 border-destructive/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-destructive mt-0.5" />
                <div>
                  <h4 className="font-semibold text-destructive mb-2">Options Trading Risks</h4>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>• Options can expire worthless, resulting in 100% loss of premium paid</p>
                    <p>• Selling options has unlimited risk potential</p>
                    <p>• Complex strategies may be difficult to manage and exit</p>
                    <p>• Always understand the maximum risk before entering any trade</p>
                    <p>• Consider paper trading before using real money</p>
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