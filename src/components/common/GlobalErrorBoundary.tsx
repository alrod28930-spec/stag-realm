/**
 * Global Error Boundary
 * Catches all React errors and provides graceful fallback UI
 */

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';
import { eventBus } from '@/services/eventBus';
import { logService } from '@/services/logging';

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
  errorInfo?: React.ErrorInfo;
  errorCount: number;
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error?: Error; retry: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
}

export class GlobalErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { 
      hasError: false,
      errorCount: 0,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { 
      hasError: true, 
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    const errorCount = this.state.errorCount + 1;
    
    // Log to service
    logService.log('error', 'React Error Boundary caught error', {
      error: error.message,
      stack: error.stack,
      componentStack: errorInfo.componentStack,
      errorCount,
    });

    // Emit event for observability
    eventBus.emit('ui.error_boundary_triggered', {
      error: error.message,
      count: errorCount,
      timestamp: new Date().toISOString(),
    });

    this.setState({ 
      hasError: true, 
      error, 
      errorInfo,
      errorCount,
    });

    // Call custom error handler if provided
    this.props.onError?.(error, errorInfo);

    // If too many errors, force reload
    if (errorCount >= 3) {
      logService.log('critical', 'Too many errors, forcing reload', { errorCount });
      setTimeout(() => {
        window.location.reload();
      }, 3000);
    }
  }

  handleRetry = () => {
    this.setState({ 
      hasError: false, 
      error: undefined, 
      errorInfo: undefined,
    });
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error} retry={this.handleRetry} />;
      }

      // Default fallback UI
      return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-background">
          <Card className="max-w-lg w-full">
            <CardContent className="pt-6 space-y-6">
              <div className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <AlertTriangle className="w-8 h-8 text-destructive" />
                </div>
                
                <div>
                  <h2 className="text-2xl font-semibold mb-2">Something went wrong</h2>
                  <p className="text-muted-foreground mb-4">
                    {this.state.error?.message || 'An unexpected error occurred. We\'re working to fix it.'}
                  </p>
                </div>

                {this.state.errorCount >= 3 && (
                  <div className="p-3 bg-warning/10 border border-warning/20 rounded-md text-sm">
                    <p className="text-warning-foreground">
                      Multiple errors detected. The page will reload automatically in a few seconds...
                    </p>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button 
                    variant="outline" 
                    onClick={this.handleRetry}
                    className="gap-2"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Try Again
                  </Button>
                  <Button 
                    variant="default" 
                    onClick={this.handleGoHome}
                    className="gap-2"
                  >
                    <Home className="w-4 h-4" />
                    Go Home
                  </Button>
                </div>
              </div>

              {process.env.NODE_ENV === 'development' && this.state.error && (
                <details className="mt-6 p-4 bg-muted rounded-md text-xs">
                  <summary className="cursor-pointer font-semibold mb-2">
                    Error Details (Dev Only)
                  </summary>
                  <pre className="overflow-auto max-h-48 text-xs">
                    {this.state.error.stack}
                  </pre>
                  {this.state.errorInfo && (
                    <pre className="overflow-auto max-h-48 mt-2 text-xs">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </details>
              )}
            </CardContent>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Default fallback component
 */
export const DefaultErrorFallback: React.FC<{ 
  error?: Error; 
  retry: () => void;
}> = ({ error, retry }) => (
  <div className="min-h-[400px] flex items-center justify-center p-4">
    <Card className="max-w-md w-full">
      <CardContent className="pt-6 text-center space-y-4">
        <AlertTriangle className="w-12 h-12 text-warning mx-auto" />
        <div>
          <h3 className="font-semibold text-lg mb-2">Unable to Load Content</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {error?.message || 'Please try again or contact support if the problem persists.'}
          </p>
        </div>
        <Button variant="outline" onClick={retry} className="gap-2">
          <RefreshCw className="w-4 h-4" />
          Retry
        </Button>
      </CardContent>
    </Card>
  </div>
);
