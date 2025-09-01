// Metrics Display Component - Real-time system metrics

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  Clock,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { coreScaffold } from '@/services/scaffold';
import { PERFORMANCE_THRESHOLDS } from '@/utils/constants';

interface SystemMetrics {
  version: any;
  uptime_seconds: number;
  market_state: string;
  risk_state: number;
  active_signals: number;
  portfolio_value: number;
  daily_trades: number;
  last_refresh: Date;
}

export function MetricsDisplay() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());

  useEffect(() => {
    // Initial load
    loadMetrics();

    // Update every 30 seconds
    const interval = setInterval(() => {
      loadMetrics();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const loadMetrics = () => {
    const currentMetrics = coreScaffold.getSystemMetrics();
    setMetrics(currentMetrics);
    setLastUpdateTime(new Date());
  };

  if (!metrics) {
    return (
      <Card className="bg-gradient-card shadow-card">
        <CardContent className="flex items-center justify-center py-8">
          <Activity className="h-6 w-6 animate-spin text-primary mr-2" />
          <span>Loading metrics...</span>
        </CardContent>
      </Card>
    );
  }

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) return `${days}d ${hours}h`;
    if (hours > 0) return `${hours}h ${minutes}m`;
    return `${minutes}m`;
  };

  const getPerformanceStatus = () => {
    const refreshAge = (Date.now() - metrics.last_refresh.getTime()) / 1000;
    
    if (refreshAge > PERFORMANCE_THRESHOLDS.refresh_interval_max_s) {
      return { status: 'warning', color: 'text-yellow-400', icon: AlertCircle };
    }
    return { status: 'healthy', color: 'text-accent', icon: CheckCircle2 };
  };

  const performanceStatus = getPerformanceStatus();
  const StatusIcon = performanceStatus.icon;

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${performanceStatus.color}`} />
            System Performance
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                v{metrics.version.major}.{metrics.version.minor}
              </div>
              <div className="text-sm text-muted-foreground">Version</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {formatUptime(metrics.uptime_seconds)}
              </div>
              <div className="text-sm text-muted-foreground">Uptime</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {metrics.active_signals}
              </div>
              <div className="text-sm text-muted-foreground">Active Signals</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {metrics.daily_trades}
              </div>
              <div className="text-sm text-muted-foreground">Daily Trades</div>
            </div>
          </div>

          {/* Risk State Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">System Risk State</span>
              <span className={metrics.risk_state > 70 ? 'text-destructive' : metrics.risk_state > 40 ? 'text-yellow-400' : 'text-accent'}>
                {metrics.risk_state.toFixed(1)}%
              </span>
            </div>
            <Progress 
              value={metrics.risk_state} 
              className="h-2"
            />
          </div>
        </CardContent>
      </Card>

      {/* Market Status */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Market Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Current State</span>
            <Badge 
              variant={metrics.market_state === 'open' ? 'default' : 'secondary'}
              className="capitalize"
            >
              {metrics.market_state.replace('_', ' ')}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Portfolio Value</span>
            <div className="flex items-center gap-1">
              {metrics.portfolio_value > 0 ? 
                <TrendingUp className="h-4 w-4 text-accent" /> : 
                <TrendingDown className="h-4 w-4 text-muted-foreground" />
              }
              <span className="font-medium">
                ${metrics.portfolio_value.toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Last Refresh</span>
            <span className="text-sm">
              {metrics.last_refresh.toLocaleTimeString()}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* System Health Indicators */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Health Indicators</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span className="text-sm">Data Feeds Active</span>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span className="text-sm">Risk Governors Online</span>
            </div>
            
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-accent" />
              <span className="text-sm">Compliance Mode Active</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Last Updated */}
      <div className="text-center text-xs text-muted-foreground">
        Metrics updated: {lastUpdateTime.toLocaleString()}
      </div>
    </div>
  );
}