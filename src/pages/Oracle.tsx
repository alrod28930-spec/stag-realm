import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  Zap,
  Clock,
  Filter,
  Search,
  RefreshCw,
  BarChart3,
  Brain,
  ArrowRight,
  Signal,
  Eye
} from 'lucide-react';
import { oracle } from '@/services/oracle';
import type { ProcessedSignal, OracleAlert, SectorHeatmap } from '@/types/oracle';
import { eventBus } from '@/services/eventBus';
import { DemoDisclaimer } from '@/components/demo/DemoDisclaimer';
import { DemoModeIndicator } from '@/components/demo/DemoModeIndicator';
import { useDemoMode } from '@/utils/demoMode';
import { demoDataService } from '@/services/demoDataService';

interface OracleProps {
  onAnalyzeSignal?: (signal: ProcessedSignal) => void;
}

export default function Oracle(props: OracleProps = {}) {
  const { onAnalyzeSignal } = props;
  const [signals, setSignals] = useState<ProcessedSignal[]>([]);
  const [alerts, setAlerts] = useState<OracleAlert[]>([]);
  const [sectorHeatmap, setSectorHeatmap] = useState<SectorHeatmap>({});
  const [filteredSignals, setFilteredSignals] = useState<ProcessedSignal[]>([]);
  const { isDemoMode } = useDemoMode();
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedSeverity, setSelectedSeverity] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('24h');
  
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadOracleData();

    if (!isDemoMode) {
      // Subscribe to Oracle updates only for non-demo users
      const unsubscribeRefresh = eventBus.on('oracle.refreshed', loadOracleData);
      const unsubscribeSignal = eventBus.on('oracle.signal.created', (signal: ProcessedSignal) => {
        setSignals(prev => [signal, ...prev.slice(0, 99)]);
      });
      const unsubscribeAlert = eventBus.on('oracle.alert', (alert: OracleAlert) => {
        setAlerts(prev => [alert, ...prev.slice(0, 49)]);
      });

      return () => {
        // Cleanup event listeners if needed
      };
    }
  }, [isDemoMode]);

  useEffect(() => {
    applyFilters();
  }, [signals, searchTerm, selectedSeverity, selectedType, selectedTimeframe]);

  const loadOracleData = () => {
    if (isDemoMode) {
      // Use demo data for demo account only
      const demoSignals = demoDataService.getOracleSignals(100);
      setSignals(demoSignals.map(signal => ({
        id: signal.id,
        signal: signal.summary || 'Demo Signal',
        description: signal.summary || 'Demonstration signal with mock data',
        type: (signal.signal_type === 'technical' ? 'technical_breakout' : 'news_sentiment') as any,
        severity: (signal.strength > 0.8 ? 'high' : 'medium') as any,
        confidence: Math.round(signal.strength * 100),
        symbol: signal.symbol,
        timestamp: new Date(signal.ts),
        direction: (signal.direction > 0 ? 'bullish' : 'bearish') as any,
        sources: [signal.source || 'Demo Source'],
        data: { demoData: true, originalStrength: signal.strength }
      })));
      setIsLoading(false);
    } else {
      // Real accounts have empty signals until API connection
      setSignals([]);
      setIsLoading(false);
    }
  };
  const applyFilters = () => {
    let filtered = [...signals];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(signal => 
        signal.signal.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signal.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        signal.sector?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Severity filter
    if (selectedSeverity !== 'all') {
      filtered = filtered.filter(signal => signal.severity === selectedSeverity);
    }

    // Type filter
    if (selectedType !== 'all') {
      filtered = filtered.filter(signal => signal.type === selectedType);
    }

    // Timeframe filter
    const now = Date.now();
    const timeframes = {
      '1h': 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000
    };

    if (selectedTimeframe !== 'all') {
      const cutoff = timeframes[selectedTimeframe as keyof typeof timeframes];
      filtered = filtered.filter(signal => 
        now - signal.timestamp.getTime() <= cutoff
      );
    }

    setFilteredSignals(filtered);
  };

  const handleRefresh = async () => {
    if (!isDemoMode) {
      setIsLoading(true);
      eventBus.emit('oracle.manual_refresh', {});
      setTimeout(() => {
        loadOracleData();
        setIsLoading(false);
      }, 1000);
    } else {
      // For demo mode, just refresh the demo data
      loadOracleData();
    }
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
      case 'critical': return 'destructive' as const;
      case 'high': return 'secondary' as const;
      case 'medium': return 'outline' as const;
      case 'low': return 'secondary' as const;
      default: return 'outline' as const;
    }
  };

  const getDirectionIcon = (direction: ProcessedSignal['direction']) => {
    switch (direction) {
      case 'bullish': return <TrendingUp className="w-4 h-4 text-accent" />;
      case 'bearish': return <TrendingDown className="w-4 h-4 text-destructive" />;
      default: return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getSectorPerformanceColor = (performance: number) => {
    if (performance > 1) return 'text-accent';
    if (performance < -1) return 'text-destructive';
    return 'text-muted-foreground';
  };

  const formatTimestamp = (timestamp: Date) => {
    const now = Date.now();
    const diff = now - timestamp.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return timestamp.toLocaleDateString();
  };

  const signalTypes = [
    'volatility_spike', 'volume_surge', 'sector_rotation', 'earnings_beat',
    'news_sentiment', 'options_flow', 'technical_breakout'
  ].filter(type => type && type.length > 0); // Filter out any empty strings just to be safe

  return (
    <div className="space-y-6">
      {/* Demo Disclaimer */}
      {isDemoMode && (
        <DemoDisclaimer feature="Oracle Intelligence System" />
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className="w-8 h-8 text-accent" />
          <div>
            <h1 className="text-2xl font-bold flex items-center">
              Oracle Intelligence
              {isDemoMode && <DemoModeIndicator variant="badge" className="ml-3" />}
            </h1>
            <p className="text-muted-foreground">
              {isDemoMode 
                ? "Explore our market scanning and signal extraction engine with demo data"
                : "Market scanning and signal extraction engine"
              }
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="w-4 h-4" />
            <span>Last refresh: {formatTimestamp(lastRefresh)}</span>
          </div>
          <Button
            variant="outline"
            onClick={handleRefresh}
            disabled={isLoading && !isDemoMode}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${(isLoading && !isDemoMode) ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Main Signals Area */}
        <div className="lg:col-span-3 space-y-4">
          {/* Filters */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Filter className="w-5 h-5" />
                Signal Filters
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search signals..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={selectedSeverity} onValueChange={setSelectedSeverity}>
                  <SelectTrigger>
                    <SelectValue placeholder="Severity" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Severities</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="low">Low</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Signal Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                     {signalTypes
                       .filter(type => type && type.trim() !== '') // Ensure no empty types
                       .map(type => (
                       <SelectItem key={type} value={type}>
                         {type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                       </SelectItem>
                     ))}
                  </SelectContent>
                </Select>

                <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                  <SelectTrigger>
                    <SelectValue placeholder="Timeframe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1h">Last Hour</SelectItem>
                    <SelectItem value="6h">Last 6 Hours</SelectItem>
                    <SelectItem value="24h">Last 24 Hours</SelectItem>
                    <SelectItem value="7d">Last 7 Days</SelectItem>
                    <SelectItem value="all">All Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Signals Stream */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Signal className="w-5 h-5" />
                Signal Stream ({filteredSignals.length})
              </CardTitle>
              <CardDescription>
                Real-time market intelligence signals
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-3">
                  {filteredSignals.map((signal) => (
                    <div
                      key={signal.id}
                      className="p-4 rounded-lg border bg-muted/10 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {getDirectionIcon(signal.direction)}
                          <h4 className="font-semibold">{signal.signal}</h4>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={getSeverityBadgeVariant(signal.severity)}>
                            {signal.severity}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(signal.timestamp)}
                          </span>
                        </div>
                      </div>
                      
                      <p className="text-sm text-muted-foreground mb-3">
                        {signal.description}
                      </p>
                      
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4 text-xs">
                          {signal.symbol && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Symbol:</span>
                              <span className="font-medium text-accent">{signal.symbol}</span>
                            </div>
                          )}
                          {signal.sector && (
                            <div className="flex items-center gap-1">
                              <span className="text-muted-foreground">Sector:</span>
                              <span className="font-medium">{signal.sector}</span>
                            </div>
                          )}
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Confidence:</span>
                            <span className="font-medium">{Math.round(signal.confidence * 100)}%</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {signal.sources.map((source, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {source}
                            </Badge>
                          ))}
                          {onAnalyzeSignal && (
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => onAnalyzeSignal(signal)}
                              className="flex items-center gap-1 text-xs"
                            >
                              <Brain className="w-3 h-3" />
                              Analyze
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {filteredSignals.length === 0 && (
                    <div className="text-center py-12 text-muted-foreground">
                      <Signal className="w-12 h-12 mx-auto mb-4 opacity-50" />
                      <p>No signals match your current filters</p>
                    </div>
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Sector Heatmap */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <BarChart3 className="w-4 h-4" />
                Sector Heatmap
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(sectorHeatmap)
                  .sort(([,a], [,b]) => Math.abs(b.performance) - Math.abs(a.performance))
                  .slice(0, 8)
                  .map(([sector, data]) => (
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
                        <span className="text-xs font-medium">{sector.slice(0, 12)}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
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
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4" />
                Recent Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {alerts.slice(0, 5).map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-3 rounded-lg border-l-2 ${
                      alert.severity === 'critical' 
                        ? 'border-destructive bg-destructive/5'
                        : alert.severity === 'high'
                        ? 'border-orange-500 bg-orange-500/5'
                        : 'border-yellow-500 bg-yellow-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-1">
                      <h4 className="font-medium text-xs">{alert.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {alert.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mb-2">
                      {alert.message}
                    </p>
                    <div className="text-xs text-muted-foreground">
                      {formatTimestamp(alert.timestamp)}
                    </div>
                  </div>
                ))}
                
                {alerts.length === 0 && (
                  <div className="text-center py-4 text-muted-foreground text-xs">
                    No recent alerts
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Oracle Stats */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-sm">
                <Eye className="w-4 h-4" />
                Oracle Stats
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Total Signals</span>
                <span className="font-medium">{signals.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Active Alerts</span>
                <span className="font-medium">{alerts.length}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Data Sources</span>
                <span className="font-medium">5</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-full bg-accent animate-pulse" />
                  <span className="font-medium text-accent">Active</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}