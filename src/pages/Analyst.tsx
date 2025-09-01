import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  LineChart, 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  Target,
  Calendar,
  Filter,
  Download
} from 'lucide-react';

export default function Analyst() {
  const [selectedSymbol, setSelectedSymbol] = useState('AAPL');
  const [timeframe, setTimeframe] = useState('1D');

  const technicalIndicators = [
    { name: 'RSI (14)', value: 68.5, signal: 'Neutral', status: 'neutral' },
    { name: 'MACD', value: 2.45, signal: 'Buy', status: 'bullish' },
    { name: 'SMA 50', value: 172.30, signal: 'Above', status: 'bullish' },
    { name: 'SMA 200', value: 165.80, signal: 'Above', status: 'bullish' },
    { name: 'Bollinger Bands', value: 'Upper', signal: 'Overbought', status: 'bearish' },
    { name: 'Stochastic', value: 75.2, signal: 'Sell', status: 'bearish' }
  ];

  const priceTargets = [
    { analyst: 'Goldman Sachs', rating: 'Buy', target: 190.00, current: 175.50, upside: 8.26 },
    { analyst: 'Morgan Stanley', rating: 'Hold', target: 180.00, current: 175.50, upside: 2.56 },
    { analyst: 'JPMorgan', rating: 'Buy', target: 195.00, current: 175.50, upside: 11.11 },
    { analyst: 'Bank of America', rating: 'Buy', target: 185.00, current: 175.50, upside: 5.41 },
  ];

  const marketSentiment = [
    { metric: 'Institutional Ownership', value: 61.2, status: 'High' },
    { metric: 'Insider Ownership', value: 0.07, status: 'Low' },
    { metric: 'Short Interest', value: 1.8, status: 'Low' },
    { metric: 'Put/Call Ratio', value: 0.85, status: 'Neutral' }
  ];

  const newsEvents = [
    {
      time: '2 hours ago',
      headline: 'Apple Reports Strong Q4 Earnings',
      sentiment: 'positive',
      impact: 'High'
    },
    {
      time: '5 hours ago',
      headline: 'iPhone 15 Sales Exceed Expectations',
      sentiment: 'positive',
      impact: 'Medium'
    },
    {
      time: '1 day ago',
      headline: 'Supply Chain Concerns in China',
      sentiment: 'negative',
      impact: 'Medium'
    },
    {
      time: '2 days ago',
      headline: 'New Product Launch Event Announced',
      sentiment: 'positive',
      impact: 'Low'
    }
  ];

  const getSignalColor = (status: string) => {
    switch (status) {
      case 'bullish': return 'text-accent';
      case 'bearish': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Buy': return 'bg-accent text-accent-foreground';
      case 'Sell': return 'bg-destructive text-destructive-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-accent';
      case 'negative': return 'text-destructive';
      default: return 'text-muted-foreground';
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Technical Analyst</h1>
          <p className="text-muted-foreground mt-2">
            Advanced technical analysis and market insights
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="AAPL">AAPL</SelectItem>
              <SelectItem value="GOOGL">GOOGL</SelectItem>
              <SelectItem value="MSFT">MSFT</SelectItem>
              <SelectItem value="TSLA">TSLA</SelectItem>
              <SelectItem value="NVDA">NVDA</SelectItem>
            </SelectContent>
          </Select>
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1m">1m</SelectItem>
              <SelectItem value="5m">5m</SelectItem>
              <SelectItem value="15m">15m</SelectItem>
              <SelectItem value="1H">1H</SelectItem>
              <SelectItem value="1D">1D</SelectItem>
              <SelectItem value="1W">1W</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Chart Area */}
        <Card className="lg:col-span-2 bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LineChart className="w-5 h-5" />
                {selectedSymbol} Price Chart
              </CardTitle>
              <CardDescription>Real-time price action with technical indicators</CardDescription>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Indicators
              </Button>
              <Button variant="outline" size="sm">
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Mock Chart Area */}
            <div className="h-96 bg-muted/20 rounded-lg flex items-center justify-center">
              <div className="text-center space-y-2">
                <BarChart3 className="w-12 h-12 text-muted-foreground mx-auto" />
                <p className="text-muted-foreground">Interactive Chart Area</p>
                <p className="text-xs text-muted-foreground">
                  Real-time {selectedSymbol} price chart with technical indicators
                </p>
              </div>
            </div>
            
            {/* Chart Controls */}
            <div className="mt-4 flex items-center justify-between">
              <div className="flex space-x-2">
                <Button variant="outline" size="sm">Candlestick</Button>
                <Button variant="ghost" size="sm">Line</Button>
                <Button variant="ghost" size="sm">Area</Button>
              </div>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-muted-foreground">Price:</span>
                <span className="font-semibold">$175.50</span>
                <span className="text-accent">+2.25 (+1.30%)</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Technical Indicators */}
        <Card className="bg-gradient-card shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5" />
              Technical Indicators
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {technicalIndicators.map((indicator, index) => (
                <div key={index} className="flex justify-between items-center p-3 rounded-lg bg-muted/30">
                  <div>
                    <p className="font-semibold text-sm">{indicator.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {typeof indicator.value === 'number' ? indicator.value.toFixed(2) : indicator.value}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant="outline" className={`text-xs ${getSignalColor(indicator.status)}`}>
                      {indicator.signal}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analysis Tabs */}
      <Tabs defaultValue="targets" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="targets">Price Targets</TabsTrigger>
          <TabsTrigger value="sentiment">Market Sentiment</TabsTrigger>
          <TabsTrigger value="news">News & Events</TabsTrigger>
        </TabsList>

        <TabsContent value="targets" className="space-y-4">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Analyst Price Targets</CardTitle>
              <CardDescription>
                Consensus price targets from major investment banks
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {priceTargets.map((target, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="font-semibold">{target.analyst}</p>
                        <p className="text-sm text-muted-foreground">Investment Bank</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-6">
                      <Badge className={getRatingColor(target.rating)}>
                        {target.rating}
                      </Badge>
                      <div className="text-right">
                        <p className="font-semibold">${target.target.toFixed(2)}</p>
                        <p className="text-sm text-muted-foreground">Target</p>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${target.upside > 0 ? 'text-accent' : 'text-destructive'}`}>
                          +{target.upside.toFixed(1)}%
                        </p>
                        <p className="text-sm text-muted-foreground">Upside</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sentiment" className="space-y-4">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle>Market Sentiment Indicators</CardTitle>
              <CardDescription>
                Key metrics that indicate market sentiment and institutional activity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {marketSentiment.map((item, index) => (
                  <div key={index} className="p-4 rounded-lg bg-muted/30">
                    <div className="flex justify-between items-center mb-2">
                      <h3 className="font-semibold text-sm">{item.metric}</h3>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                    <p className="text-2xl font-bold">{item.value}%</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.metric === 'Institutional Ownership' && 'Percentage held by institutions'}
                      {item.metric === 'Insider Ownership' && 'Percentage held by insiders'}
                      {item.metric === 'Short Interest' && 'Percentage of float sold short'}
                      {item.metric === 'Put/Call Ratio' && 'Bearish vs bullish options'}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news" className="space-y-4">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                News & Market Events
              </CardTitle>
              <CardDescription>
                Recent news and events that may impact price movement
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {newsEvents.map((news, index) => (
                  <div key={index} className="p-4 rounded-lg bg-muted/30 border-l-4 border-border">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{news.impact} Impact</Badge>
                          <span className="text-xs text-muted-foreground">{news.time}</span>
                        </div>
                        <p className="font-medium">{news.headline}</p>
                      </div>
                      <div className={`ml-4 ${getSentimentColor(news.sentiment)}`}>
                        {news.sentiment === 'positive' ? (
                          <TrendingUp className="w-4 h-4" />
                        ) : (
                          <TrendingDown className="w-4 h-4" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}