import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class WorkspaceErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Workspace Error:', error, errorInfo);
  }

  handleReload = () => {
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex-1 flex items-center justify-center p-8">
          <Card className="max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-destructive" />
              </div>
              <CardTitle>Workspace Error</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-muted-foreground text-sm">
                Something went wrong while loading the workspace. This is usually a temporary issue.
              </p>
              <div className="flex gap-2 justify-center">
                <Button 
                  onClick={this.handleReload}
                  size="sm"
                >
                  Reload Page
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => window.location.href = '/'}
                >
                  Go Home
                </Button>
              </div>
              {this.state.error && (
                <details className="text-xs text-left">
                  <summary className="cursor-pointer text-muted-foreground">
                    Technical Details
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded text-xs whitespace-pre-wrap">
                    {this.state.error.message}
                  </pre>
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