import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LoginForm } from './LoginForm';
import { userSettingsService } from '@/services/userSettings';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user, initializeAuth } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  // Initialize user settings when authenticated
  useEffect(() => {
    const setupUserSettings = async () => {
      if (isAuthenticated && user && !isLoading) {
        try {
          await userSettingsService.updateUserSettings(user.id, {});
        } catch (error) {
          console.error('Failed to initialize user settings:', error);
        }
      }
    };

    setupUserSettings();
  }, [isAuthenticated, user, isLoading]);

  // Show loading state during authentication
  if (isLoading) {
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

  // Show protected content
  return <>{children}</>;
}