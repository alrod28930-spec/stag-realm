import { ReactNode, useEffect } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { LoginForm } from './LoginForm';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: ReactNode;
}

export function AuthGuard({ children }: AuthGuardProps) {
  const { isAuthenticated, isLoading, user, initializeAuth } = useAuthStore();

  // Initialize auth on mount
  useEffect(() => {
    const init = async () => {
      try {
        await initializeAuth();
      } catch (error) {
        console.error('Auth initialization failed:', error);
        // Force stop loading on error
        useAuthStore.setState({ isLoading: false });
      }
    };
    init();
  }, [initializeAuth]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (isLoading) {
        console.warn('Auth loading timeout - forcing to login screen');
        useAuthStore.setState({ isLoading: false, isAuthenticated: false, user: null });
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [isLoading]);

  // Show loading state during authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading...</p>
          <p className="text-xs text-muted-foreground">If this takes too long, try refreshing the page</p>
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