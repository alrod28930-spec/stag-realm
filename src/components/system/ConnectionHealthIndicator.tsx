// ConnectionHealthIndicator.tsx - Visual indicator for connection health

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useConnectionHealth } from '@/hooks/useConnectionHealth';
import { 
  Activity, 
  AlertCircle, 
  CheckCircle, 
  RefreshCw, 
  XCircle,
  Database,
  Link as LinkIcon,
  Zap
} from 'lucide-react';
import { useState } from 'react';

export function ConnectionHealthIndicator() {
  const { connections, systemHealth, checkAllConnections } = useConnectionHealth();
  const [isChecking, setIsChecking] = useState(false);

  const handleRefresh = async () => {
    setIsChecking(true);
    try {
      await checkAllConnections();
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'degraded':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'down':
        return <XCircle className="w-4 h-4 text-red-500" />;
      default:
        return <Activity className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'brokerage':
        return <LinkIcon className="w-4 h-4" />;
      case 'database':
        return <Database className="w-4 h-4" />;
      case 'api':
        return <Zap className="w-4 h-4" />;
      default:
        return <Activity className="w-4 h-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-500/20 text-green-700 dark:text-green-400';
      case 'degraded':
        return 'bg-yellow-500/20 text-yellow-700 dark:text-yellow-400';
      case 'down':
        return 'bg-red-500/20 text-red-700 dark:text-red-400';
      default:
        return 'bg-gray-500/20 text-gray-700 dark:text-gray-400';
    }
  };

  const getSystemHealthColor = () => {
    switch (systemHealth.status) {
      case 'healthy':
        return 'text-green-600 dark:text-green-400';
      case 'degraded':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'critical':
        return 'text-red-600 dark:text-red-400';
      default:
        return 'text-muted-foreground';
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Health
          </CardTitle>
          <CardDescription>
            Monitor connection status across all services
          </CardDescription>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleRefresh}
          disabled={isChecking}
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${isChecking ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* System Overview */}
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/30">
          <div>
            <p className="text-sm font-medium">Overall Status</p>
            <p className="text-xs text-muted-foreground">
              {systemHealth.healthyCount} healthy, {systemHealth.degradedCount} degraded, {systemHealth.downCount} down
            </p>
          </div>
          <Badge className={getStatusColor(systemHealth.status)}>
            <span className={`capitalize ${getSystemHealthColor()}`}>
              {systemHealth.status}
            </span>
          </Badge>
        </div>

        {/* Individual Connections */}
        {connections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No connections registered</p>
            <p className="text-sm mt-2">
              Connections will appear here once you configure them
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {connections.map((conn) => (
              <div
                key={conn.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-card"
              >
                <div className="flex items-center gap-3 flex-1">
                  <div className="p-2 rounded bg-muted">
                    {getTypeIcon(conn.type)}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{conn.name}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="capitalize">{conn.type}</span>
                      <span>•</span>
                      <span>
                        Last checked: {new Date(conn.lastCheck).toLocaleTimeString()}
                      </span>
                      {conn.latencyMs !== null && (
                        <>
                          <span>•</span>
                          <span>{conn.latencyMs}ms</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {conn.errorCount > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {conn.errorCount} errors
                    </Badge>
                  )}
                  {getStatusIcon(conn.status)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
