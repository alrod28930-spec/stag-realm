import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWorkspace } from '@/hooks/useWorkspace';
import { useAuthStore } from '@/stores/authStore';
import { supabase } from '@/integrations/supabase/client';
import { 
  Users, 
  Shield, 
  Crown, 
  Plus,
  Check,
  RefreshCw
} from 'lucide-react';

export const WorkspaceSelector: React.FC = () => {
  const { workspace, switchWorkspace, loading } = useWorkspace();
  const { user } = useAuthStore();
  const [availableWorkspaces, setAvailableWorkspaces] = useState<any[]>([]);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState(false);

  const loadAvailableWorkspaces = async () => {
    if (!user?.id) return;
    
    setLoadingWorkspaces(true);
    try {
      const { data, error } = await supabase
        .from('workspace_members')
        .select(`
          workspace_id,
          workspaces (
            id,
            name,
            wtype,
            owner_id,
            created_at
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const workspaces = data?.map(item => item.workspaces).filter(Boolean) || [];
      setAvailableWorkspaces(workspaces);
    } catch (error) {
      console.error('Failed to load workspaces:', error);
    } finally {
      setLoadingWorkspaces(false);
    }
  };

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

  React.useEffect(() => {
    if (user?.id) {
      loadAvailableWorkspaces();
    }
  }, [user?.id]);

  return (
    <Card className="w-80">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Workspaces
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={loadAvailableWorkspaces}
            disabled={loadingWorkspaces}
            className="h-8 w-8 p-0"
          >
            <RefreshCw className={`w-4 h-4 ${loadingWorkspaces ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-64">
          <div className="space-y-2">
            {availableWorkspaces.map((ws) => (
              <div
                key={ws.id}
                className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                  workspace?.id === ws.id 
                    ? 'border-primary bg-primary/5' 
                    : 'hover:bg-accent'
                }`}
                onClick={() => {
                  if (workspace?.id !== ws.id && !loading) {
                    switchWorkspace(ws.id);
                  }
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getWorkspaceIcon(ws.wtype)}
                    <span className="font-medium text-sm truncate">
                      {ws.name}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    {workspace?.id === ws.id && (
                      <Check className="w-4 h-4 text-primary" />
                    )}
                    <Badge 
                      variant={getWorkspaceTypeColor(ws.wtype) as any}
                      className="text-xs"
                    >
                      {ws.wtype}
                    </Badge>
                  </div>
                </div>
                
                {ws.owner_id === user?.id && (
                  <Badge variant="outline" className="text-xs mt-2">
                    Owner
                  </Badge>
                )}
              </div>
            ))}
            
            {availableWorkspaces.length === 0 && !loadingWorkspaces && (
              <div className="text-center py-4 text-muted-foreground">
                <p className="text-sm">No workspaces available</p>
              </div>
            )}
          </div>
        </ScrollArea>
        
        <div className="mt-4 pt-4 border-t">
          <Button variant="outline" className="w-full" size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Create Workspace
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};