import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MultiChartPanel } from './MultiChartPanel';
import { 
  Zap, 
  TrendingUp, 
  Target, 
  BarChart3, 
  Clock,
  Shield,
  Star,
  PlayCircle,
  Settings,
  BookOpen
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface StrategyTemplate {
  id: string;
  name: string;
  category: 'scalp' | 'intraday' | 'swing' | 'momentum';
  description: string;
  timeframes: string[];
  indicators: string[];
  rules: {
    entry: string[];
    exit: string[];
    risk: string[];
  };
  performance: {
    winRate: number;
    avgRR: number;
    maxDD: number;
  };
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  icon: React.ComponentType<any>;
}

interface StrategyTemplatesProps {
  onTemplateApply?: (template: StrategyTemplate) => void;
  currentSymbol?: string;
}

export const StrategyTemplates: React.FC<StrategyTemplatesProps> = ({
  onTemplateApply,
  currentSymbol = 'AAPL'
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedTemplate, setSelectedTemplate] = useState<StrategyTemplate | null>(null);
  const [activeTimeframe, setActiveTimeframe] = useState('5m');

  const { toast } = useToast();

  const strategyTemplates: StrategyTemplate[] = [
    {
      id: 'vwap_scalp',
      name: 'VWAP Scalping',
      category: 'scalp',
      description: 'Quick scalps using VWAP as dynamic support/resistance with tight risk management',
      timeframes: ['1m', '5m'],
      indicators: ['VWAP', 'Volume', 'Level II'],
      rules: {
        entry: [
          'Price pulls back to VWAP',
          'Volume spike confirmation',
          'Level II shows absorption',
          'Enter on bounce/rejection'
        ],
        exit: [
          'Take profit at 2:1 R/R minimum',
          'Exit if VWAP breaks against position',
          'Maximum 5-minute hold time'
        ],
        risk: [
          'Stop loss 0.1% from entry',
          'Max 0.5% account risk per trade',
          'No more than 3 concurrent positions'
        ]
      },
      performance: {
        winRate: 65,
        avgRR: 2.1,
        maxDD: 3.2
      },
      difficulty: 'advanced',
      icon: Zap
    },
    {
      id: 'breakout_momentum',
      name: 'Breakout Momentum',
      category: 'intraday',
      description: 'Trade confirmed breakouts with momentum confirmation and volume expansion',
      timeframes: ['5m', '15m'],
      indicators: ['SMA20', 'RSI', 'Volume', 'ATR'],
      rules: {
        entry: [
          'Clean break above resistance',
          'Volume 2x average',
          'RSI above 60',
          'Price above SMA20'
        ],
        exit: [
          'Trail stop at SMA20',
          'Exit on RSI divergence',
          'Target 3:1 R/R ratio'
        ],
        risk: [
          'Stop below breakout level',
          'Max 1% account risk',
          'Position size by ATR'
        ]
      },
      performance: {
        winRate: 58,
        avgRR: 2.8,
        maxDD: 4.1
      },
      difficulty: 'intermediate',
      icon: TrendingUp
    },
    {
      id: 'mean_reversion',
      name: 'Mean Reversion',
      category: 'intraday',
      description: 'Trade oversold/overbought conditions with statistical edge',
      timeframes: ['15m', '1h'],
      indicators: ['Bollinger Bands', 'RSI', 'MACD', 'Volume'],
      rules: {
        entry: [
          'Price touches lower BB',
          'RSI below 30',
          'MACD showing divergence',
          'Enter on first bounce'
        ],
        exit: [
          'Exit at middle BB',
          'RSI above 70',
          'MACD crosses up'
        ],
        risk: [
          'Stop below recent low',
          'Max 1.5% account risk',
          'Scale out in thirds'
        ]
      },
      performance: {
        winRate: 72,
        avgRR: 1.8,
        maxDD: 2.9
      },
      difficulty: 'beginner',
      icon: Target
    },
    {
      id: 'gap_fade',
      name: 'Gap Fade Strategy',
      category: 'intraday',
      description: 'Fade oversized gaps in liquid stocks with mean reversion bias',
      timeframes: ['1m', '5m', '15m'],
      indicators: ['VWAP', 'Volume Profile', 'Previous Day Range'],
      rules: {
        entry: [
          'Gap >2% on liquid stock',
          'Wait 30min for volatility to settle',
          'Enter fade when price approaches VWAP',
          'Volume declining from open'
        ],
        exit: [
          'Target gap fill (previous close)',
          'Exit if gap extends >50%',
          'Time stop at 2:00 PM ET'
        ],
        risk: [
          'Stop above/below gap high/low',
          'Max 2% account risk',
          'Avoid earnings/news'
        ]
      },
      performance: {
        winRate: 68,
        avgRR: 2.3,
        maxDD: 5.5
      },
      difficulty: 'intermediate',
      icon: BarChart3
    },
    {
      id: 'opening_range_breakout',
      name: 'Opening Range Breakout',
      category: 'momentum',
      description: 'Trade breakouts from first 30-minute range with volume confirmation',
      timeframes: ['1m', '5m'],
      indicators: ['Opening Range', 'Volume', 'ATR'],
      rules: {
        entry: [
          'Define 9:30-10:00 ET range',
          'Wait for clean break +volume',
          'Enter on first pullback test',
          'Confirm with 5min close outside'
        ],
        exit: [
          'Target 1.5x range size',
          'Trail stop at range boundary',
          'Exit before 11:30 AM ET'
        ],
        risk: [
          'Stop inside range',
          'Position size by range width',
          'Max 1% account risk'
        ]
      },
      performance: {
        winRate: 62,
        avgRR: 2.4,
        maxDD: 4.7
      },
      difficulty: 'intermediate',
      icon: Clock
    },
    {
      id: 'swing_trend_following',
      name: 'Swing Trend Following',
      category: 'swing',
      description: 'Multi-day trend following with moving average confluence',
      timeframes: ['1h', '4h', '1D'],
      indicators: ['SMA50', 'SMA200', 'MACD', 'ADX'],
      rules: {
        entry: [
          'Price above SMA50 & SMA200',
          'MACD bullish crossover',
          'ADX >25 (trending)',
          'Enter on pullback to SMA50'
        ],
        exit: [
          'Trail stop at SMA50',
          'Exit on MACD bearish cross',
          'Take profits at resistance'
        ],
        risk: [
          'Stop below SMA200',
          'Max 3% account risk',
          'Hold 3-10 days'
        ]
      },
      performance: {
        winRate: 55,
        avgRR: 3.2,
        maxDD: 8.1
      },
      difficulty: 'beginner',
      icon: TrendingUp
    }
  ];

  const categories = [
    { id: 'all', label: 'All Strategies', count: strategyTemplates.length },
    { id: 'scalp', label: 'Scalping', count: strategyTemplates.filter(s => s.category === 'scalp').length },
    { id: 'intraday', label: 'Intraday', count: strategyTemplates.filter(s => s.category === 'intraday').length },
    { id: 'swing', label: 'Swing', count: strategyTemplates.filter(s => s.category === 'swing').length },
    { id: 'momentum', label: 'Momentum', count: strategyTemplates.filter(s => s.category === 'momentum').length }
  ];

  const filteredTemplates = selectedCategory === 'all' 
    ? strategyTemplates 
    : strategyTemplates.filter(t => t.category === selectedCategory);

  const handleApplyTemplate = (template: StrategyTemplate) => {
    onTemplateApply?.(template);
    setActiveTimeframe(template.timeframes[0]);
    
    toast({
      title: "Strategy Applied",
      description: `${template.name} template has been applied to the chart`,
    });
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner': return 'bg-success text-success-foreground';
      case 'intermediate': return 'bg-warning text-warning-foreground';
      case 'advanced': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="w-5 h-5" />
                Strategy Templates
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                Pre-built trading strategies with backtested rules and risk management
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {filteredTemplates.length} Strategies
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Strategy List */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Categories</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'ghost'}
                  className="w-full justify-between"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span>{category.label}</span>
                  <Badge variant="outline" className="text-xs">
                    {category.count}
                  </Badge>
                </Button>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Strategy Cards */}
        <div className="lg:col-span-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredTemplates.map((template) => (
              <Card 
                key={template.id} 
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  selectedTemplate?.id === template.id ? 'ring-2 ring-primary' : ''
                }`}
                onClick={() => setSelectedTemplate(template)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <template.icon className="w-5 h-5 text-primary" />
                      <div>
                        <CardTitle className="text-base">{template.name}</CardTitle>
                        <Badge 
                          className={`text-xs mt-1 ${getDifficultyColor(template.difficulty)}`}
                        >
                          {template.difficulty}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 text-warning fill-current" />
                      <span className="text-sm">{template.performance.winRate}%</span>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    {template.description}
                  </p>

                  {/* Performance Metrics */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <div className="font-semibold">{template.performance.winRate}%</div>
                      <div className="text-muted-foreground">Win Rate</div>
                    </div>
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <div className="font-semibold">{template.performance.avgRR}:1</div>
                      <div className="text-muted-foreground">Avg R/R</div>
                    </div>
                    <div className="text-center p-2 bg-muted/30 rounded">
                      <div className="font-semibold">{template.performance.maxDD}%</div>
                      <div className="text-muted-foreground">Max DD</div>
                    </div>
                  </div>

                  {/* Timeframes */}
                  <div className="flex flex-wrap gap-1">
                    {template.timeframes.map((tf) => (
                      <Badge key={tf} variant="outline" className="text-xs">
                        {tf}
                      </Badge>
                    ))}
                  </div>

                  {/* Apply Button */}
                  <Button 
                    className="w-full"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleApplyTemplate(template);
                    }}
                  >
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Apply Strategy
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>

      {/* Strategy Details Modal/Panel */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <selectedTemplate.icon className="w-5 h-5" />
                {selectedTemplate.name} - Strategy Rules
              </CardTitle>
              <Button
                variant="outline"
                onClick={() => handleApplyTemplate(selectedTemplate)}
              >
                <PlayCircle className="w-4 h-4 mr-2" />
                Apply to Chart
              </Button>
            </div>
          </CardHeader>

          <CardContent>
            <Tabs defaultValue="rules" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="rules">Trading Rules</TabsTrigger>
                <TabsTrigger value="indicators">Indicators</TabsTrigger>
                <TabsTrigger value="backtest">Backtest Data</TabsTrigger>
              </TabsList>

              <TabsContent value="rules" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-success">Entry Rules</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {selectedTemplate.rules.entry.map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-success">•</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-destructive">Exit Rules</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {selectedTemplate.rules.exit.map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-destructive">•</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm text-warning">Risk Rules</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-1 text-sm">
                        {selectedTemplate.rules.risk.map((rule, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <span className="text-warning">•</span>
                            {rule}
                          </li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="indicators" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {selectedTemplate.indicators.map((indicator) => (
                    <Badge key={indicator} variant="outline" className="justify-center p-2">
                      {indicator}
                    </Badge>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="backtest" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="text-center p-4 bg-muted/20 rounded">
                    <div className="text-2xl font-bold text-success">{selectedTemplate.performance.winRate}%</div>
                    <div className="text-sm text-muted-foreground">Win Rate</div>
                  </div>
                  <div className="text-center p-4 bg-muted/20 rounded">
                    <div className="text-2xl font-bold">{selectedTemplate.performance.avgRR}:1</div>
                    <div className="text-sm text-muted-foreground">Risk/Reward</div>
                  </div>
                  <div className="text-center p-4 bg-muted/20 rounded">
                    <div className="text-2xl font-bold text-destructive">{selectedTemplate.performance.maxDD}%</div>
                    <div className="text-sm text-muted-foreground">Max Drawdown</div>
                  </div>
                  <div className="text-center p-4 bg-muted/20 rounded">
                    <div className="text-2xl font-bold">{selectedTemplate.difficulty}</div>
                    <div className="text-sm text-muted-foreground">Difficulty</div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* Live Chart with Applied Strategy */}
      {selectedTemplate && (
        <Card>
          <CardHeader>
            <CardTitle>Live Chart - {selectedTemplate.name}</CardTitle>
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Timeframe:</span>
              <Select value={activeTimeframe} onValueChange={setActiveTimeframe}>
                <SelectTrigger className="w-20">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {selectedTemplate.timeframes.map((tf) => (
                    <SelectItem key={tf} value={tf}>{tf}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <MultiChartPanel
              defaultSymbols={[currentSymbol]}
              maxCharts={1}
              allowDOMView={false}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};