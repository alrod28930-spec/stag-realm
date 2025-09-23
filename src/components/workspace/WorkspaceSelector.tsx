// Workspace Selector Component
import React, { useState } from 'react';
import { Check, ChevronsUpDown, Plus, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Command, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem,
  CommandList 
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useWorkspace } from '@/hooks/useWorkspace';
import { getUserWorkspaces } from '@/utils/workspaceHelpers';
import { useAuthStore } from '@/stores/authStore';
import { useToast } from '@/hooks/use-toast';

interface WorkspaceSelectorProps {
  className?: string;
}

export const WorkspaceSelector: React.FC<WorkspaceSelectorProps> = ({ className }) => {
  const [open, setOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { user } = useAuthStore();
  const { workspace, switchWorkspace } = useWorkspace();
  const { toast } = useToast();

  const loadWorkspaces = async () => {
    if (!user?.id || loading) return;
    
    setLoading(true);
    try {
      const userWorkspaces = await getUserWorkspaces(user.id);
      setWorkspaces(userWorkspaces);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load workspaces",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleWorkspaceSwitch = async (workspaceId: string) => {
    try {
      await switchWorkspace(workspaceId);
      setOpen(false);
      toast({
        title: "Workspace Switched",
        description: "Successfully switched workspace"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to switch workspace",
        variant: "destructive"
      });
    }
  };

  React.useEffect(() => {
    if (open && workspaces.length === 0) {
      loadWorkspaces();
    }
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={`w-[280px] justify-between ${className}`}
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span className="truncate">
              {workspace?.name || "Select workspace..."}
            </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command>
          <CommandInput placeholder="Search workspaces..." />
          <CommandList>
            <CommandEmpty>
              {loading ? "Loading workspaces..." : "No workspaces found."}
            </CommandEmpty>
            <CommandGroup>
              {workspaces.map((ws) => (
                <CommandItem
                  key={ws.id}
                  value={ws.id}
                  onSelect={() => handleWorkspaceSwitch(ws.id)}
                  className="flex items-center justify-between"
                >
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${
                      workspace?.id === ws.id ? 'bg-primary' : 'bg-muted-foreground'
                    }`} />
                    <div>
                      <div className="font-medium">{ws.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {ws.wtype} • {ws.membership_role}
                      </div>
                    </div>
                  </div>
                  {workspace?.id === ws.id && (
                    <Check className="h-4 w-4" />
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
};