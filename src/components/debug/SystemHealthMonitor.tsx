import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { systemInitializer } from '@/services/systemInitializer';
import { serviceManager } from '@/services/serviceManager';

interface ServiceHealth {
  running: boolean;
  intervals: number;
  channels: number;
}

interface SystemMetrics {
  servicesRegistered: number;
  servicesRunning: number;
  totalIntervals: number;
  isShuttingDown: boolean;
}

export function SystemHealthMonitor() {
  const [systemHealth, setSystemHealth] = useState<{
    isInitialized: boolean;
    initializedServices: string[];
    serviceHealth: Record<string, ServiceHealth>;
    systemMetrics: SystemMetrics;
  } | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const refreshHealth = async () => {
    setRefreshing(true);
    try {
      const health = systemInitializer.getSystemHealth();
      setSystemHealth(health);
    } catch (error) {
      console.error('Failed to get system health:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshHealth();
    
    // Auto-refresh every 5 seconds
    const interval = setInterval(refreshHealth, 5000);
    
    return () => clearInterval(interval);
  }, []);

  if (!systemHealth) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health Monitor</CardTitle>
          <CardDescription>Loading system status...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const { isInitialized, initializedServices, serviceHealth, systemMetrics } = systemHealth;

  const getServiceStatusColor = (service: ServiceHealth) => {
    if (!service.running) return 'destructive';
    if (service.intervals > 5) return 'secondary';
    return 'default';
  };

  const getServiceStatusIcon = (service: ServiceHealth) => {
    return service.running ? '✅' : '❌';
  };

  const handleShutdown = async () => {
    if (confirm('Are you sure you want to shutdown all services? This will stop all background processes.')) {
      try {
        await systemInitializer.shutdown();
        await refreshHealth();
      } catch (error) {
        console.error('Shutdown failed:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="flex items-center gap-2">
                System Health Monitor
                <Badge variant={isInitialized ? 'default' : 'destructive'}>
                  {isInitialized ? 'Initialized' : 'Not Initialized'}
                </Badge>
              </CardTitle>
              <CardDescription>
                Real-time monitoring of service lifecycle and memory usage
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={refreshHealth} 
                disabled={refreshing}
                variant="outline"
                size="sm"
              >
                {refreshing ? 'Refreshing...' : 'Refresh'}
              </Button>
              <Button 
                onClick={handleShutdown}
                variant="destructive"
                size="sm"
              >
                Shutdown System
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {systemMetrics.isShuttingDown && (
            <Alert>
              <AlertDescription>
                System is shutting down. Services are being stopped gracefully.
              </AlertDescription>
            </Alert>
          )}
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {systemMetrics.servicesRegistered}
              </div>
              <div className="text-sm text-muted-foreground">
                Services Registered
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {systemMetrics.servicesRunning}
              </div>
              <div className="text-sm text-muted-foreground">
                Services Running
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {systemMetrics.totalIntervals}
              </div>
              <div className="text-sm text-muted-foreground">
                Active Intervals
              </div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                {initializedServices.length}
              </div>
              <div className="text-sm text-muted-foreground">
                Initialized Services
              </div>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Service Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {Object.entries(serviceHealth).map(([serviceName, status]) => (
                <div
                  key={serviceName}
                  className="flex items-center justify-between p-3 rounded-lg border bg-card"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-sm">
                      {getServiceStatusIcon(status)}
                    </span>
                    <span className="font-medium text-sm">
                      {serviceName}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge 
                      variant={getServiceStatusColor(status)}
                      className="text-xs"
                    >
                      {status.running ? 'Running' : 'Stopped'}
                    </Badge>
                    {status.intervals > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {status.intervals} intervals
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {systemMetrics.totalIntervals > 20 && (
            <Alert>
              <AlertDescription>
                ⚠️ High number of active intervals detected ({systemMetrics.totalIntervals}). 
                This may indicate memory leaks or excessive background processing.
              </AlertDescription>
            </Alert>
          )}

          <Separator />

          <div className="space-y-2">
            <h3 className="text-lg font-semibold">Initialization Order</h3>
            <div className="flex flex-wrap gap-2">
              {initializedServices.map((service, index) => (
                <Badge key={service} variant="outline" className="text-xs">
                  {index + 1}. {service}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}