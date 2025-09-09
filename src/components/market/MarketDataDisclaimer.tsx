import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { AlertTriangle, TrendingUp, Settings, ExternalLink, Search } from 'lucide-react';
import { useState } from 'react';

export function MarketDataDisclaimer() {
  const [searchTerm, setSearchTerm] = useState('');

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
          <CardTitle className="text-xl">Brokerage API Connection Required</CardTitle>
          <CardDescription className="text-base">
            Connect your brokerage API to access market indexes and real-time data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <p className="text-sm text-muted-foreground">
              Market indexes and data are displayed when you submit a brokerage API key. 
              StagAlgo connects to your brokerage API with custom data feed support.
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-accent" />
                Available with Connection
              </h4>
              <ul className="space-y-1 text-muted-foreground ml-6">
                <li>• Market indexes (S&P 500, NASDAQ, DOW)</li>
                <li>• Live stock positions</li>
                <li>• Current trading prices</li>
                <li>• BID integration data</li>
                <li>• Custom data feeds</li>
              </ul>
            </div>
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Settings className="w-4 h-4 text-accent" />
                Integration Features
              </h4>
              <ul className="space-y-1 text-muted-foreground ml-6">
                <li>• Brokerage API connectivity</li>
                <li>• Custom data feed support</li>
                <li>• StagAlgo BID integration</li>
                <li>• Minimal data search</li>
                <li>• Real-time sync</li>
              </ul>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-4 border-t">
            <Button className="w-full sm:w-auto">
              <Settings className="w-4 h-4 mr-2" />
              Connect Brokerage API
            </Button>
            <Button variant="outline" className="w-full sm:w-auto">
              <ExternalLink className="w-4 h-4 mr-2" />
              Setup Guide
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Simple Stock Search */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Stock Search</CardTitle>
          <CardDescription>Search for basic stock information and current positions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search stocks (e.g., AAPL, TSLA)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          {searchTerm && (
            <div className="space-y-2 pt-4 border-t">
              <p className="text-sm text-muted-foreground text-center">
                Stock data available after brokerage API connection
              </p>
              <div className="grid grid-cols-1 gap-2 opacity-50">
                {['Current Position', 'Trading Price', 'Market Status'].map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-2 rounded bg-muted/30">
                    <span className="text-sm font-medium">{item}</span>
                    <div className="h-4 w-16 bg-muted rounded animate-pulse" />
                  </div>
                ))}
              </div>
            </div>
          )}
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