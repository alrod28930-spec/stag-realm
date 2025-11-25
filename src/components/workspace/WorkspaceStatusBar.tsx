// Workspace Status Bar Component
import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useEntitlements } from '@/hooks/useEntitlements';
import { 
  Users, 
  Shield, 
  Crown, 
  Sparkles,
  RefreshCw,
  AlertCircle
} from 'lucide-react';

export const WorkspaceStatusBar: React.FC = () => {
  const { workspace, workspaceId, isOwner, loading, error, refreshWorkspace } = useWorkspace();
  const { entitlements, loading: entitlementsLoading } = useEntitlements(workspaceId);

  if (loading || entitlementsLoading) {
    return (
      <Card className="p-3">
        <div className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          <span className="text-sm text-muted-foreground">Loading workspace...</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="p-3 border-destructive">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-destructive" />
          <span className="text-sm text-destructive">{error}</span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={refreshWorkspace}
            className="ml-auto h-6"
          >
            Retry
          </Button>
        </div>
      </Card>
    );
  }

  const getWorkspaceIcon = (wtype: string) => {
    switch (wtype) {
      case 'personal': return <Shield className="w-4 h-4" />;
      case 'team': return <Users className="w-4 h-4" />;
      case 'business': return <Crown className="w-4 h-4" />;
      default: return <Shield className="w-4 h-4" />;
    }
  };

  const getWorkspaceTypeColor = (wtype: string) => {
    switch (wtype) {
      case 'personal': return 'default';
      case 'team': return 'secondary';
      case 'business': return 'destructive';
      default: return 'default';
    }
  };

  const activeFeatures = entitlements.filter(e => e.enabled);
  const eliteFeatures = activeFeatures.filter(f => 
    f.feature_code.includes('elite') || f.feature_code.includes('ELITE')
  ).length;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getWorkspaceIcon(workspace?.wtype || 'personal')}
            <span className="font-medium text-sm truncate max-w-[200px]">
              {workspace?.name || 'Default Workspace'}
            </span>
          </div>
          
          <div className="flex items-center gap-1">
            <Badge 
              variant={getWorkspaceTypeColor(workspace?.wtype || 'personal') as any}
              className="text-xs"
            >
              {workspace?.wtype || 'Personal'}
            </Badge>
            
            {isOwner && (
              <Badge variant="outline" className="text-xs">
                Owner
              </Badge>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {eliteFeatures > 0 && (
            <div className="flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-warning" />
              <span className="text-xs text-muted-foreground">
                {activeFeatures.length} features
              </span>
            </div>
          )}
          
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={refreshWorkspace}
            className="h-6 w-6 p-0"
          >
            <RefreshCw className="w-3 h-3" />
          </Button>
        </div>
      </div>
    </Card>
  );
};