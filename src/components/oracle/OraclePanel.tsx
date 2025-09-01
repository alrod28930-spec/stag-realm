import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Eye,
  RefreshCw,
  Zap,
  Clock
} from 'lucide-react';
import { oracle, ProcessedSignal, OracleAlert, SectorHeatmap } from '@/services/oracle';
import { eventBus } from '@/services/eventBus';

interface OraclePanelProps {
  onViewFull?: () => void;
}

export function OraclePanel({ onViewFull }: OraclePanelProps) {
  const [topSignals, setTopSignals] = useState<ProcessedSignal[]>([]);
  const [sectorHeatmap, setSectorHeatmap] = useState<SectorHeatmap>({});
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadOracleData();

    // Subscribe to Oracle updates
    const unsubscribe = eventBus.on('oracle.refreshed', () => {
      loadOracleData();
    });

    // Refresh data every 30 seconds
    const interval = setInterval(loadOracleData, 30000);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(interval);
    };
  }, []);

  const loadOracleData = () => {
    setTopSignals(oracle.getTopSignals(3));
    setSectorHeatmap(oracle.getSectorHeatmap());
    setLastRefresh(oracle.getLastRefresh());
  };

  const handleRefresh = async () => {
    setIsLoading(true);
    // Trigger manual refresh
    eventBus.emit('oracle.manual_refresh', {});
    setTimeout(() => {
      loadOracleData();
      setIsLoading(false);
    }, 1000);
  };

  const getSeverityColor = (severity: ProcessedSignal['severity']) => {
    switch (severity) {
      case 'critical': return 'text-destructive';
      case 'high': return 'text-orange-500';
      case 'medium': return 'text-yellow-500';
      case 'low': return 'text-blue-500';
      default: return 'text-muted-foreground';
    }
  };

  const getSeverityBadgeVariant = (severity: ProcessedSignal['severity']) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'secondary';
      case 'medium': return 'outline';
      case 'low': return 'secondary';
      default: return 'outline';
    } as const;
  };

  const getDirectionIcon = (direction: ProcessedSignal['direction']) => {
    switch (direction) {
      case 'bullish': return <TrendingUp className="w-3 h-3 text-accent" />;
      case 'bearish': return <TrendingDown className="w-3 h-3 text-destructive" />;
      default: return <Activity className="w-3 h-3 text-muted-foreground" />;
    }
  };

  const getSectorPerformanceColor = (performance: number) => {
    if (performance > 1) return 'text-accent';
    if (performance < -1) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const getTopSectors = () => {
    return Object.entries(sectorHeatmap)
      .sort(([,a], [,b]) => Math.abs(b.performance) - Math.abs(a.performance))
      .slice(0, 5);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Zap className="w-5 h-5 text-accent" />
            Oracle Intelligence
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
            {onViewFull && (
              <Button
                variant="outline"
                size="sm"
                onClick={onViewFull}
              >
                <Eye className="w-4 h-4 mr-1" />
                View All
              </Button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Clock className="w-4 h-4" />
          <span>Last updated: {formatTime(lastRefresh)}</span>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Top Signals */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Top Signals
          </h4>
          {topSignals.length > 0 ? (
            <div className="space-y-2">
              {topSignals.map((signal) => (
                <div
                  key={signal.id}
                  className="p-3 rounded-lg bg-muted/20 border-l-2 border-accent/50"
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {getDirectionIcon(signal.direction)}
                      <span className="font-medium text-sm">{signal.signal}</span>
                    </div>
                    <Badge variant={getSeverityBadgeVariant(signal.severity)} className="text-xs">
                      {signal.severity}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {signal.symbol && (
                      <span className="font-medium text-accent mr-2">{signal.symbol}</span>
                    )}
                    {signal.sector && (
                      <span className="mr-2">{signal.sector}</span>
                    )}
                    <span>{Math.round(signal.confidence * 100)}% confidence</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-4 text-muted-foreground text-sm">
              No high-priority signals detected
            </div>
          )}
        </div>

        {/* Sector Heatmap */}
        <div>
          <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Sector Heatmap
          </h4>
          <div className="space-y-2">
            {getTopSectors().map(([sector, data]) => (
              <div
                key={sector}
                className="flex items-center justify-between p-2 rounded bg-muted/10"
              >
                <div className="flex items-center gap-2">
                  <div
                    className={`w-2 h-2 rounded-full ${
                      data.performance > 1 
                        ? 'bg-accent' 
                        : data.performance < -1 
                        ? 'bg-destructive' 
                        : 'bg-muted-foreground'
                    }`}
                  />
                  <span className="text-sm font-medium">{sector}</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span className={getSectorPerformanceColor(data.performance)}>
                    {data.performance > 0 ? '+' : ''}{data.performance.toFixed(1)}%
                  </span>
                  {data.signals > 0 && (
                    <Badge variant="outline" className="text-xs px-1">
                      {data.signals}
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Oracle Status */}
        <div className="pt-2 border-t">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Oracle Status</span>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
              <span>Active</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}