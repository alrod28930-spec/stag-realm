import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, TrendingUp, Settings, ExternalLink } from 'lucide-react';

export function MarketDataDisclaimer() {
  return (
    <div className="space-y-6">
      {/* Main Disclaimer Card */}
      <Card className="border-dashed border-2 border-muted-foreground/30 bg-gradient-to-br from-muted/20 to-muted/40">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 rounded-full bg-warning/10 border border-warning/20">
              <AlertTriangle className="w-8 h-8 text-warning" />
            </div>
          </div>
          <CardTitle className="text-xl">Market Data Integration Required</CardTitle>
          <CardDescription className="text-base">
            Configure your market data API to access real-time quotes, charts, and analysis
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                Real-time Features Available
              </h4>
              <ul className="space-y-1 text-muted-foreground ml-6">
                <li>• Live stock prices & indices</li>
                <li>• Real-time market movers</li>
                <li>• Volume & market cap data</li>
                <li>• Interactive price charts</li>
                <li>• Technical indicators</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-accent" />
                Supported Data Sources
              </h4>
              <ul className="space-y-1 text-muted-foreground ml-6">
                <li>• Alpaca Markets (Free tier available)</li>
                <li>• Alpha Vantage</li>
                <li>• Polygon.io</li>
                <li>• Brokerage API connections</li>
                <li>• Custom data feeds</li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4 border-t">
            <Button className="w-full sm:w-auto">
              <Settings className="w-4 h-4 mr-2" />
              Configure Data Source
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              <ExternalLink className="w-4 h-4 mr-2" />
              Documentation
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sample Layout Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 opacity-60">
        {['S&P 500', 'NASDAQ', 'DOW JONES'].map((index, i) => (
          <Card key={i} className="bg-gradient-card shadow-card">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{index}</CardTitle>
              <CardDescription className="text-xs">Market Index</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-6 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                </div>
                <Badge variant="outline" className="opacity-50">
                  API Required
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="bg-gradient-card shadow-card opacity-60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Stock Watchlist</CardTitle>
              <CardDescription>Monitor your favorite stocks in real-time</CardDescription>
            </div>
            <Badge variant="outline" className="opacity-70">
              Data Source Required
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {Array(6).fill(0).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                <div className="flex items-center space-x-4">
                  <div className="w-8 h-8 bg-muted rounded animate-pulse" />
                  <div className="space-y-1">
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-24 bg-muted rounded animate-pulse" />
                  </div>
                </div>
                <div className="flex items-center space-x-6">
                  <div className="text-right space-y-1">
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-20 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="text-right space-y-1">
                    <div className="h-3 w-12 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-16 bg-muted rounded animate-pulse" />
                  </div>
                  <div className="h-8 w-16 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}