import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface CradleErrorBoundaryProps {
  children: React.ReactNode;
}

interface CradleErrorState {
  hasError: boolean;
  error?: Error;
}

export class CradleErrorBoundary extends React.Component<CradleErrorBoundaryProps, CradleErrorState> {
  constructor(props: CradleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): CradleErrorState {
    return {
      hasError: true,
      error
    };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Cradle Error Boundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: undefined });
    // Force a re-render by reloading the page as a last resort
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <Card className="bg-destructive/10 border-destructive/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Cradle Spreadsheet Error
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              The spreadsheet encountered an unexpected error and needs to be restarted.
            </p>
            {this.state.error && (
              <details className="text-xs bg-muted p-2 rounded">
                <summary className="cursor-pointer">Error Details</summary>
                <pre className="mt-2 whitespace-pre-wrap">
                  {this.state.error.message}
                  {this.state.error.stack && `\n\n${this.state.error.stack}`}
                </pre>
              </details>
            )}
            <Button onClick={this.handleReset} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Restart Spreadsheet
            </Button>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}