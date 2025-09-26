import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSystemCoordination } from '@/hooks/useSystemCoordination';
import { Activity, Zap, AlertTriangle, CheckCircle } from 'lucide-react';

export const SystemNervousSystem: React.FC = () => {
  const { systemHealth, isConnected, eventHistory } = useSystemCoordination();

  const getConnectionColor = () => {
    if (!isConnected) return 'text-destructive';
    if (systemHealth.totalConnections > 10) return 'text-success';
    return 'text-warning';
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            System Nervous System
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${getConnectionColor()}`}>
                {systemHealth.totalConnections}
              </div>
              <div className="text-sm text-muted-foreground">Active Connections</div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {Object.keys(systemHealth.recentEventActivity).length}
              </div>
              <div className="text-sm text-muted-foreground">Event Types</div>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center">
                {isConnected ? (
                  <CheckCircle className="w-8 h-8 text-success" />
                ) : (
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </div>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-accent">
                {systemHealth.lastActivity ? Math.floor((Date.now() - systemHealth.lastActivity.getTime()) / 1000) : 0}s
              </div>
              <div className="text-sm text-muted-foreground">Last Activity</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Recent Event Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mb-4">
            {Object.entries(systemHealth.recentEventActivity).map(([event, count]) => (
              <Badge key={event} variant="outline" className="justify-between">
                <span className="truncate">{event}</span>
                <span className="ml-2 font-mono">{count}</span>
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Event Stream</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-64">
            <div className="space-y-2">
              {eventHistory.map((event, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 rounded border-l-2 border-l-primary/30 bg-card/50"
                >
                  <div className="flex-1">
                    <div className="font-mono text-sm">{event.event}</div>
                    <div className="text-xs text-muted-foreground">
                      {formatTimestamp(event.timestamp)}
                    </div>
                  </div>
                  <Badge variant="secondary" className="ml-2">
                    {typeof event.data === 'object' ? 'Object' : String(event.data).slice(0, 20)}
                  </Badge>
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
};