import { ReactNode, useEffect, useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { LoginForm } from './LoginForm';
import { WorkspaceTypeSelect } from './WorkspaceTypeSelect';
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
      console.log('AuthGuard - handlePostAuthSetup called', {
        isAuthenticated,
        user: !!user,
        isLoading,
        workspacesLength: workspaces.length
      });
      
      if (isAuthenticated && user && !isLoading) {
        console.log('AuthGuard - Starting post-auth setup');
        setIsInitializing(true);
        
        try {
          // Load workspaces
          console.log('AuthGuard - Loading workspaces...');
          await loadWorkspaces();
          console.log('AuthGuard - Workspaces loaded, count:', workspaces.length);
          
          // Initialize user settings if needed
          console.log('AuthGuard - Updating user settings...');
          await userSettingsService.updateUserSettings(user.id, {});
          console.log('AuthGuard - User settings updated');
          
          // Check if user needs workspace setup
          if (workspaces.length === 0) {
            console.log('AuthGuard - No workspaces found, needs setup');
            setNeedsWorkspaceSetup(true);
          } else {
            console.log('AuthGuard - Workspaces available, no setup needed');
          }
          
          console.log('AuthGuard - Finishing initialization');
          setIsInitializing(false);
        } catch (error) {
          console.error('AuthGuard - Error during post-auth setup:', error);
          setIsInitializing(false);
        }
      }
    };

    handlePostAuthSetup();
  }, [isAuthenticated, user, isLoading, loadWorkspaces, workspaces.length]);

  // Show loading state during initialization
  if (isLoading || (isAuthenticated && isInitializing)) {
    console.log('AuthGuard - Showing loading state', {
      isLoading,
      isAuthenticated,
      isInitializing,
      user: !!user
    });
    
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-muted-foreground space-y-1">
              <div>isLoading: {isLoading.toString()}</div>
              <div>isAuthenticated: {isAuthenticated.toString()}</div>
              <div>isInitializing: {isInitializing.toString()}</div>
              <div>user: {user ? 'present' : 'null'}</div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Show login form if not authenticated
  if (!isAuthenticated || !user) {
    return <LoginForm />;
  }

  // Show workspace type selector if needed
  if (needsWorkspaceSetup) {
    return (
      <WorkspaceTypeSelect 
        onComplete={() => setNeedsWorkspaceSetup(false)} 
      />
    );
  }

  // Show protected content
  return <>{children}</>;
}