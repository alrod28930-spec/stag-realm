// System Status Component - Core Scaffold monitoring

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Activity, 
  Database, 
  Shield, 
  Bot, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Zap
} from 'lucide-react';
import { coreScaffold } from '@/services/scaffold';
import { SystemState, LogicLayerState } from '@/types/core';

export function SystemStatus() {
  const [systemState, setSystemState] = useState<SystemState | null>(null);
  const [logicState, setLogicState] = useState<LogicLayerState | null>(null);

  useEffect(() => {
    // Initial load
    setSystemState(coreScaffold.getSystemState());
    setLogicState(coreScaffold.getLogicLayerState());

    // Update every 30 seconds
    const interval = setInterval(() => {
      setSystemState(coreScaffold.getSystemState());
      setLogicState(coreScaffold.getLogicLayerState());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  if (!systemState || !logicState) {
    return <div>Loading system status...</div>;
  }

  const getMarketStateColor = (state: string) => {
    switch (state) {
      case 'open': return 'bg-accent text-accent-foreground';
      case 'pre_market': return 'bg-yellow-500/20 text-yellow-300';
      case 'after_hours': return 'bg-blue-500/20 text-blue-300';
      case 'closed': return 'bg-muted text-muted-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getRiskStateColor = (riskState: number) => {
    if (riskState < 30) return 'text-accent';
    if (riskState < 70) return 'text-yellow-400';
    return 'text-destructive';
  };

  const formatUptime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  };

  return (
    <div className="space-y-6">
      {/* System Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">System</CardTitle>
            <Activity className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">v{systemState.version.major}.{systemState.version.minor}.{systemState.version.patch}</div>
            <p className="text-xs text-muted-foreground">
              Uptime: {formatUptime(systemState.uptime_seconds)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Market</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <Badge className={getMarketStateColor(systemState.market_state)}>
              {systemState.market_state.replace('_', ' ')}
            </Badge>
            <p className="text-xs text-muted-foreground mt-1">
              Updated {new Date(systemState.last_refresh).toLocaleTimeString()}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Risk State</CardTitle>
            <Shield className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className={`text-lg font-bold ${getRiskStateColor(systemState.risk_state)}`}>
              {systemState.risk_state.toFixed(0)}%
            </div>
            <Progress value={systemState.risk_state} className="h-1 mt-1" />
          </CardContent>
        </Card>

        <Card className="bg-gradient-card shadow-card">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Portfolio</CardTitle>
            <Database className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">
              ${logicState.bid.portfolio_value.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground">
              {logicState.bid.exposure_count} positions
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Logic Layers Status */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            Logic Layer Health
          </CardTitle>
          <CardDescription>Status of core system components</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Repository */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="font-medium">Repository</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {logicState.repository.processed_feeds} feeds processed
            </div>
          </div>

          {/* Oracle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="font-medium">Oracle</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {logicState.oracle.active_signals} active signals
            </div>
          </div>

          {/* BID */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-accent" />
              <span className="font-medium">BID</span>
            </div>
            <div className="text-sm text-muted-foreground">
              Last update: {new Date(logicState.bid.last_snapshot).toLocaleTimeString()}
            </div>
          </div>

          {/* Monarch */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {logicState.monarch.active ? 
                <CheckCircle className="h-4 w-4 text-accent" /> :
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              }
              <span className="font-medium">Monarch</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {logicState.monarch.soft_pulls_today + logicState.monarch.hard_pulls_today} interventions today
            </div>
          </div>

          {/* Overseer */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {logicState.overseer.active ? 
                <CheckCircle className="h-4 w-4 text-accent" /> :
                <AlertTriangle className="h-4 w-4 text-yellow-400" />
              }
              <span className="font-medium">Overseer</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {logicState.overseer.positions_monitored} positions monitored
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feature Flags */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle>Feature Flags</CardTitle>
          <CardDescription>System capabilities and toggles</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {Object.entries(systemState.feature_flags).map(([flag, enabled]) => (
              <Badge 
                key={flag}
                variant={enabled ? 'default' : 'secondary'}
                className="justify-center text-xs"
              >
                {flag.replace(/^ENABLE_/, '').replace(/_/g, ' ')}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}