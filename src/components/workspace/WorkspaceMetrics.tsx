// Workspace Metrics Component
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/hooks/useWorkspace';
import {
  Activity, 
  Users, 
  Database, 
  Zap,
  TrendingUp,
  Shield
} from 'lucide-react';

export const WorkspaceMetrics: React.FC = () => {
  const { workspace, workspaceId, isOwner } = useWorkspace();

  const activeFeatures = [];
  const eliteFeatures = [];
  const proFeatures = [];

  const metrics = [
    {
      title: 'Workspace Type',
      value: workspace?.wtype || 'personal',
      icon: Users,
      description: isOwner ? 'Owner' : 'Member'
    },
    {
      title: 'Active Features',
      value: activeFeatures.length,
      icon: Zap,
      description: `${eliteFeatures.length} elite, ${proFeatures.length} pro`
    },
    {
      title: 'Access Level',
      value: eliteFeatures.length > 0 ? 'Elite' : proFeatures.length > 0 ? 'Pro' : 'Standard',
      icon: Shield,
      description: 'Current tier access'
    },
    {
      title: 'Status',
      value: 'Active',
      icon: Activity,
      description: 'System operational'
    }
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((metric) => (
        <Card key={metric.title} className="relative overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {metric.title}
              </CardTitle>
              <metric.icon className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-1">
              <div className="text-2xl font-bold">
                {metric.value}
              </div>
              <p className="text-xs text-muted-foreground">
                {metric.description}
              </p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};