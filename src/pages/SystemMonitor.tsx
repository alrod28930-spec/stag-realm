// System Monitor Page - Core Scaffold monitoring dashboard

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SystemStatus } from '@/components/scaffold/SystemStatus';
import { MetricsDisplay } from '@/components/scaffold/MetricsDisplay';
import { SystemHealthMonitor } from '@/components/debug/SystemHealthMonitor';
import { Monitor, Activity, BarChart3, Settings, Heart } from 'lucide-react';

export default function SystemMonitor() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">System Monitor</h1>
          <p className="text-muted-foreground mt-2">
            Core Scaffold health and performance monitoring
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Monitor className="w-5 h-5 text-primary" />
          <span className="text-sm text-muted-foreground">Real-time monitoring</span>
        </div>
      </div>

      {/* Monitoring Tabs */}
      <Tabs defaultValue="health" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-12">
          <TabsTrigger value="health" className="flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4" />
            <span className="hidden sm:inline">Service Health</span>
            <span className="sm:hidden">Health</span>
          </TabsTrigger>
          <TabsTrigger value="status" className="flex items-center gap-2 text-sm">
            <Activity className="w-4 h-4" />
            <span className="hidden sm:inline">System Status</span>
            <span className="sm:hidden">Status</span>
          </TabsTrigger>
          <TabsTrigger value="metrics" className="flex items-center gap-2 text-sm">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Performance Metrics</span>
            <span className="sm:hidden">Metrics</span>
          </TabsTrigger>
          <TabsTrigger value="config" className="flex items-center gap-2 text-sm">
            <Settings className="w-4 h-4" />
            <span className="hidden sm:inline">Configuration</span>
            <span className="sm:hidden">Config</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="health" className="space-y-6">
          <SystemHealthMonitor />
        </TabsContent>

        <TabsContent value="status" className="space-y-6">
          <SystemStatus />
        </TabsContent>

        <TabsContent value="metrics" className="space-y-6">
          <MetricsDisplay />
        </TabsContent>

        <TabsContent value="config" className="space-y-6">
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">System Configuration</h3>
            <p className="text-muted-foreground">
              Configuration panel coming soon...
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}