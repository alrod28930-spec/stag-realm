import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2 } from 'lucide-react';
import { WorkspaceTypeOption, CreateWorkspacePayload } from '@/types/workspace';
import { supabase } from '@/integrations/supabase/client';

interface ConfirmWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceType: WorkspaceTypeOption;
  workspaceName: string;
  onConfirm: () => void;
}

export function ConfirmWorkspaceModal({
  isOpen,
  onClose,
  workspaceType,
  workspaceName,
  onConfirm
}: ConfirmWorkspaceModalProps) {
  const [isCreating, setIsCreating] = useState(false);
  const { setCurrentWorkspace, loadWorkspaces } = useWorkspaceStore();
  const { toast } = useToast();

  const handleCreateWorkspace = async () => {
    setIsCreating(true);
    
    try {
      // First verify the user is authenticated
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !user) {
        throw new Error('You must be logged in to create a workspace. Please refresh and try logging in again.');
      }

      console.log('User authenticated:', user.id);
      
      // Call the RPC function to create workspace safely
      const { data: workspaceId, error } = await supabase.rpc(
        'create_workspace_safely',
        {
          p_name: workspaceName,
          p_wtype: workspaceType.type
        } as CreateWorkspacePayload
      );

      if (error) {
        console.error('RPC Error:', error);
        throw error;
      }

      if (!workspaceId) {
        throw new Error('Failed to create workspace - no ID returned');
      }

      // Reload workspaces to get the new one
      await loadWorkspaces();
      
      // Set the new workspace as active
      const workspaces = useWorkspaceStore.getState().workspaces;
      const newWorkspace = workspaces.find(w => w.id === workspaceId);
      
      if (newWorkspace) {
        setCurrentWorkspace(newWorkspace);
      }

      // Log the creation event (this would typically be done server-side)
      try {
        await supabase.rpc('recorder_log', {
          p_workspace: workspaceId,
          p_event_type: 'workspace.created',
          p_severity: 1,
          p_entity_type: 'workspace',
          p_entity_id: workspaceId,
          p_summary: `Created ${workspaceType.type} workspace: ${workspaceName}`,
          p_payload: {
            wtype: workspaceType.type,
            name: workspaceName
          }
        });
      } catch (logError) {
        // Log error but don't fail the creation
        console.warn('Failed to log workspace creation:', logError);
      }

      toast({
        title: "Workspace Created",
        description: `${workspaceName} workspace has been created successfully.`,
      });

      onConfirm();
    } catch (error: any) {
      console.error('Error creating workspace:', error);
      
      toast({
        title: "Creation Failed",
        description: error.message || "Unable to create workspace. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Create Workspace
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2">
              <div>
                <span className="font-medium text-foreground">Type:</span>{' '}
                <span className="text-muted-foreground">{workspaceType.label}</span>
              </div>
              <div>
                <span className="font-medium text-foreground">Name:</span>{' '}
                <span className="text-muted-foreground">{workspaceName}</span>
              </div>
              <p className="text-sm text-muted-foreground mt-4">
                This will create your workspace and set it as active. You can adjust settings later.
              </p>
            </div>
          </DialogDescription>
        </DialogHeader>
        
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isCreating}
          >
            Cancel
          </Button>
          <Button
            onClick={handleCreateWorkspace}
            disabled={isCreating}
            className="bg-gradient-primary hover:opacity-90"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Workspace'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}