// Workspace Metrics Component
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useEntitlements } from '@/hooks/useEntitlements';
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
  const { entitlements } = useEntitlements(workspaceId);

  const activeFeatures = entitlements.filter(e => e.enabled);
  const eliteFeatures = activeFeatures.filter(f => 
    f.feature_code.includes('elite') || f.feature_code.includes('ELITE')
  );
  const proFeatures = activeFeatures.filter(f => 
    f.feature_code.includes('pro') || f.feature_code.includes('PRO')
  );

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