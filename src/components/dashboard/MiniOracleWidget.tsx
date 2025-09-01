import { useState, useEffect } from 'react';
import { TrendingUp, AlertTriangle, Activity, Eye } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { bid } from '@/services/bid';
import { useNavigate } from 'react-router-dom';

interface OracleSignal {
  id: string;
  type: string;
  symbol?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  signal: string;
  timestamp: Date;
}

interface SectorData {
  [sector: string]: {
    performance: number;
    signals: number;
    sentiment: 'positive' | 'negative' | 'neutral';
  };
}

export function MiniOracleWidget() {
  const [topSignals, setTopSignals] = useState<OracleSignal[]>([]);
  const [sectorHeatmap, setSectorHeatmap] = useState<SectorData>({});
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());
  const navigate = useNavigate();

  useEffect(() => {
    loadOracleData();
    
    // Update every 30 seconds
    const interval = setInterval(loadOracleData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadOracleData = () => {
    try {
      // Get top 3 Oracle signals
      const signals = bid.getOracleSignals(3);
      setTopSignals(signals);

      // Generate mock sector heatmap data
      const sectors = ['Technology', 'Healthcare', 'Financial', 'Energy', 'Consumer'];
      const heatmapData: SectorData = {};
      
      sectors.forEach(sector => {
        const performance = (Math.random() - 0.5) * 10; // ±5%
        const signalCount = Math.floor(Math.random() * 5);
        
        heatmapData[sector] = {
          performance,
          signals: signalCount,
          sentiment: performance > 2 ? 'positive' : performance < -2 ? 'negative' : 'neutral'
        };
      });
      
      setSectorHeatmap(heatmapData);
      setLastUpdate(new Date());
      
    } catch (error) {
      console.error('Failed to load Oracle data:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'text-red-400 bg-red-400/10';
      case 'high': return 'text-orange-400 bg-orange-400/10';
      case 'medium': return 'text-yellow-400 bg-yellow-400/10';
      case 'low': return 'text-green-400 bg-green-400/10';
      default: return 'text-muted-foreground bg-muted/10';
    }
  };

  const getSentimentColor = (sentiment: string, performance: number) => {
    switch (sentiment) {
      case 'positive': return 'bg-green-400/20 border-green-400/30';
      case 'negative': return 'bg-red-400/20 border-red-400/30';
      default: return 'bg-muted/20 border-border';
    }
  };

  const handleViewInAnalyst = () => {
    navigate('/analyst');
  };

  const formatTimeAgo = (date: Date) => {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Activity className="w-4 h-4 text-primary" />
            Oracle Intelligence
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewInAnalyst}
            className="h-7 text-xs"
          >
            <Eye className="w-3 h-3 mr-1" />
            View in Analyst
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Top Signals */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm font-medium">Top Signals</span>
            <Badge variant="outline" className="text-xs">
              {topSignals.length}
            </Badge>
          </div>
          
          <div className="space-y-2">
            {topSignals.length > 0 ? (
              topSignals.map((signal) => (
                <div key={signal.id} className="flex items-center justify-between p-2 bg-muted/20 rounded">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      {signal.symbol && (
                        <span className="text-xs font-medium">{signal.symbol}</span>
                      )}
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${getSeverityColor(signal.severity)}`}
                      >
                        {signal.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {signal.signal}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground ml-2">
                    {formatTimeAgo(signal.timestamp)}
                  </span>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center p-4 text-muted-foreground">
                <div className="text-center">
                  <AlertTriangle className="w-6 h-6 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No active signals</p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sector Heatmap */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-gradient-to-r from-red-400 to-green-400 rounded-sm" />
            <span className="text-sm font-medium">Sector Heatmap</span>
          </div>
          
          <div className="grid grid-cols-1 gap-1">
            {Object.entries(sectorHeatmap).map(([sector, data]) => (
              <div
                key={sector}
                className={`p-2 rounded border ${getSentimentColor(data.sentiment, data.performance)}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <span className="text-xs font-medium">{sector}</span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className={`text-xs ${data.performance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {data.performance >= 0 ? '+' : ''}{data.performance.toFixed(1)}%
                      </span>
                      {data.signals > 0 && (
                        <Badge variant="outline" className="text-xs h-4">
                          {data.signals} signals
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Last Update */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Last updated: {lastUpdate.toLocaleTimeString()}
          </span>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={loadOracleData}
            className="h-6 text-xs"
          >
            Refresh
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}