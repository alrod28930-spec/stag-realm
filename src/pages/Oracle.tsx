import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Zap, 
  TrendingUp, 
  TrendingDown, 
  RefreshCw,
  Brain,
  Target,
  AlertTriangle,
  Eye,
  Activity,
  BarChart3
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWorkspace } from '@/hooks/useWorkspace';
import { OraclePanel } from '@/components/oracle/OraclePanel';

interface Signal {
  id: string;
  symbol: string;
  signal_type: string;
  strength: number;
  direction: number;
  summary: string;
  source: string;
  ts: string;
}

export default function Oracle() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [news, setNews] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const { workspaceId } = useWorkspace();

  // Load oracle signals and news
  useEffect(() => {
    loadOracleData();
  }, [workspaceId]);

  const loadOracleData = async () => {
    if (!workspaceId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Load signals
      const { data: signalsData, error: signalsError } = await supabase
        .from('oracle_signals')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('ts', { ascending: false })
        .limit(100);

      if (signalsError) throw signalsError;

      // Load news
      const { data: newsData, error: newsError } = await supabase
        .from('oracle_news')
        .select('*')
        .eq('workspace_id', workspaceId)
        .order('ts', { ascending: false })
        .limit(50);

      if (newsError) throw newsError;

      setSignals(signalsData || []);
      setNews(newsData || []);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load oracle data';
      setError(errorMessage);
      console.error('Oracle data load error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    loadOracleData();
    toast({
      title: "Oracle Data Refreshed",
      description: "Latest signals and market intelligence updated.",
    });
  };

  const getSignalTypeColor = (type: string) => {
    switch (type.toLowerCase()) {
      case 'buy': return 'text-accent';
      case 'sell': return 'text-destructive';
      case 'hold': return 'text-muted-foreground';
      default: return 'text-primary';
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 0.8) return 'text-accent';
    if (strength >= 0.6) return 'text-yellow-500';
    if (strength >= 0.4) return 'text-orange-500';
    return 'text-destructive';
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center">
            <Zap className="w-8 h-8 mr-3 text-primary" />
            Oracle Intelligence
          </h1>
          <p className="text-muted-foreground mt-2">
            AI-powered market signals and trading intelligence
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} disabled={isLoading} size="sm" variant="outline">
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* No Data Warning */}
      {signals.length === 0 && !isLoading && (
        <Card className="border-warning bg-warning/10">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-warning mt-0.5" />
              <div className="space-y-2">
                <p className="font-medium text-warning-foreground">No Oracle Signals Found</p>
                <p className="text-sm text-warning-foreground/80">
                  Connect your brokerage account and enable market data to start receiving AI-powered trading signals.
                </p>
                <Button variant="outline" size="sm" className="mt-2">
                  <Brain className="w-4 h-4 mr-2" />
                  Enable Oracle Intelligence
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive" />
              <p className="text-destructive">Failed to load oracle data: {error}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Oracle Panel */}
      <OraclePanel />

      {/* Main Content */}
      <Tabs defaultValue="signals" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signals">Trading Signals</TabsTrigger>
          <TabsTrigger value="news">Market Intelligence</TabsTrigger>
          <TabsTrigger value="analysis">Pattern Analysis</TabsTrigger>
        </TabsList>

        <TabsContent value="signals" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Target className="w-5 h-5 mr-2" />
                Active Trading Signals
              </CardTitle>
              <CardDescription>
                AI-generated signals based on technical analysis and market patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin" />
                  <span className="ml-2">Loading signals...</span>
                </div>
              ) : signals.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No trading signals available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Signals will appear here once market data is connected
                  </p>
                </div>
              ) : (
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {signals.map((signal) => (
                      <div key={signal.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center space-x-4">
                          <Badge variant="outline" className="w-16 justify-center">
                            {signal.symbol}
                          </Badge>
                          <div>
                            <p className={`font-semibold ${getSignalTypeColor(signal.signal_type)}`}>
                              {signal.signal_type.toUpperCase()}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {signal.summary || 'No description available'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Source: {signal.source} • {new Date(signal.ts).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-semibold text-lg ${getStrengthColor(signal.strength)}`}>
                            {(signal.strength * 100).toFixed(0)}%
                          </p>
                          <p className="text-xs text-muted-foreground">Confidence</p>
                          <div className="flex items-center mt-1">
                            {signal.direction > 0 ? (
                              <TrendingUp className="w-4 h-4 text-accent" />
                            ) : (
                              <TrendingDown className="w-4 h-4 text-destructive" />
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="news" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Eye className="w-5 h-5 mr-2" />
                Market Intelligence
              </CardTitle>
              <CardDescription>
                Curated market news and sentiment analysis
              </CardDescription>
            </CardHeader>
            <CardContent>
              {news.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No market intelligence available</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    News and sentiment data will appear here once market feeds are connected
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {news.map((item, index) => (
                    <div key={index} className="p-4 rounded-lg bg-muted/30">
                      <h4 className="font-medium">{item.headline}</h4>
                      <p className="text-sm text-muted-foreground mt-1">
                        {item.source} • {new Date(item.ts).toLocaleString()}
                      </p>
                      {item.sentiment && (
                        <Badge 
                          variant={item.sentiment > 0 ? 'default' : 'destructive'}
                          className="mt-2"
                        >
                          {item.sentiment > 0 ? 'Positive' : item.sentiment < 0 ? 'Negative' : 'Neutral'}
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Pattern Analysis
              </CardTitle>
              <CardDescription>
                Advanced technical analysis and pattern recognition
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  Connect your brokerage account to access advanced pattern analysis
                </p>
                <Button className="mt-4" variant="outline">
                  <Activity className="w-4 h-4 mr-2" />
                  Enable Pattern Analysis
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}