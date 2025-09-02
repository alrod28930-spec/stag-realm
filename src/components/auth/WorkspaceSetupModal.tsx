import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Building2 } from 'lucide-react';

interface WorkspaceSetupModalProps {
  isOpen: boolean;
  onComplete: () => void;
}

export function WorkspaceSetupModal({ isOpen, onComplete }: WorkspaceSetupModalProps) {
  const [workspaceName, setWorkspaceName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { createWorkspace } = useWorkspaceStore();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workspaceName.trim()) {
      toast({
        title: "Workspace Name Required",
        description: "Please enter a name for your workspace.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const workspace = await createWorkspace(workspaceName.trim());
      
      if (workspace) {
        toast({
          title: "Workspace Created",
          description: `${workspaceName} workspace has been created successfully.`,
        });
        onComplete();
      } else {
        toast({
          title: "Creation Failed",
          description: "Unable to create workspace. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-primary" />
            Create Your Workspace
          </DialogTitle>
          <DialogDescription>
            Create a workspace to organize your trading strategies and collaborate with your team.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="workspace-name">Workspace Name</Label>
            <Input
              id="workspace-name"
              type="text"
              placeholder="e.g., My Trading Team"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              disabled={isLoading}
              className="bg-background/50"
              maxLength={100}
            />
          </div>
          
          <Button
            type="submit"
            disabled={isLoading || !workspaceName.trim()}
            className="w-full bg-gradient-primary hover:opacity-90"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              'Create Workspace'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}