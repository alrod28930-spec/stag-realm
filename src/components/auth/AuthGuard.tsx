import { ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { LoginForm } from './LoginForm';
import { WorkspaceSetupModal } from './WorkspaceSetupModal';
import { userSettingsService } from '@/services/userSettings';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user, initializeAuth } = useAuthStore();
  const { loadWorkspaces, currentWorkspace, workspaces } = useWorkspaceStore();
  const [needsWorkspaceSetup, setNeedsWorkspaceSetup] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Handle post-authentication setup
  useEffect(() => {
    const handlePostAuthSetup = async () => {
      if (isAuthenticated && user && !isLoading) {
        setIsInitializing(true);
        
        // Load workspaces
        await loadWorkspaces();
        
        // Initialize user settings if needed
        await userSettingsService.updateUserSettings(user.id, {});
        
        // Check if user needs workspace setup
        if (workspaces.length === 0) {
          setNeedsWorkspaceSetup(true);
        }
        
        setIsInitializing(false);
      }
    };

    handlePostAuthSetup();
  }, [isAuthenticated, user, isLoading, loadWorkspaces, workspaces.length]);

  // Show loading state during initialization
  if (isLoading || (isAuthenticated && isInitializing)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated || !user) {
    return <LoginForm />;
  }

  // Show workspace setup if needed
  if (needsWorkspaceSetup) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <WorkspaceSetupModal 
          isOpen={true} 
          onComplete={() => setNeedsWorkspaceSetup(false)} 
        />
      </div>
    );
  }

  // Show protected content
  return <>{children}</>;
}