import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { paperTradingTester } from '@/services/paperTradingTester';
import { useAuthStore } from '@/stores/authStore';
import { Play, CheckCircle, XCircle, Clock, AlertTriangle, LogIn } from 'lucide-react';

export function PaperTradingTestPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuthStore();

  const handleRunTests = async () => {
    setIsRunning(true);
    setTestResults(null);
    
    try {
      toast({
        title: "Starting Paper Trading Tests",
        description: "Running comprehensive system tests...",
      });

      const report = await paperTradingTester.runAllTests();
      setTestResults(report);
      
      const summary = await paperTradingTester.generateTestSummary();
      console.log(summary);
      
      if (report.summary.failed === 0) {
        toast({
          title: "All Tests Passed! ✅",
          description: `System ready for paper trading (${report.summary.passed}/${report.summary.totalTests} tests passed)`,
        });
      } else {
        toast({
          title: "Tests Completed with Issues",
          description: `${report.summary.passed}/${report.summary.totalTests} tests passed. Check results below.`,
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Test Failed",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (success: boolean) => {
    return success ? (
      <CheckCircle className="h-4 w-4 text-green-500" />
    ) : (
      <XCircle className="h-4 w-4 text-red-500" />
    );
  };

  const getStatusBadge = (success: boolean) => {
    return (
      <Badge variant={success ? "default" : "destructive"}>
        {success ? "PASS" : "FAIL"}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Paper Trading System Test
        </CardTitle>
        <CardDescription>
          Test your Alpaca paper trading integration, ROI tracking, and bot execution capabilities
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Clock className="h-6 w-6 animate-spin mr-2" />
            <span>Checking authentication...</span>
          </div>
        ) : !isAuthenticated ? (
          <div className="text-center p-8">
            <LogIn className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
            <p className="text-muted-foreground mb-4">
              You need to be logged in to run paper trading tests
            </p>
            <Button onClick={() => window.location.href = '/auth'}>
              Go to Login
            </Button>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Requires Alpaca API keys to be configured in Supabase secrets
                </p>
                <Button 
                  onClick={handleRunTests} 
                  disabled={isRunning}
                  className="flex items-center gap-2"
                >
                  {isRunning ? (
                    <>
                      <Clock className="h-4 w-4 animate-spin" />
                      Running Tests...
                    </>
                  ) : (
                    <>
                      <Play className="h-4 w-4" />
                      Run All Tests
                    </>
                  )}
                </Button>
              </div>
              
              {testResults && (
                <div className="text-right">
                  <div className="text-2xl font-bold">
                    {testResults.summary.passed}/{testResults.summary.totalTests}
                  </div>
                  <div className="text-sm text-muted-foreground">tests passed</div>
                </div>
              )}
            </div>

            {testResults && (
              <div className="space-y-2">
                <h4 className="font-semibold">Test Results:</h4>
                {testResults.scenarios.map((scenario: any) => {
                  const result = testResults.results.get(scenario.id);
                  return (
                    <div key={scenario.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        {getStatusIcon(result?.success || false)}
                        <div>
                          <div className="font-medium">{scenario.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {result?.message || scenario.description}
                          </div>
                          {result?.error && (
                            <div className="text-sm text-red-500">{result.error}</div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {result && (
                          <span className="text-xs text-muted-foreground">
                            {result.duration}ms
                          </span>
                        )}
                        {getStatusBadge(result?.success || false)}
                      </div>
                    </div>
                  );
                })}
                
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Total Duration:</span> {(testResults.summary.duration / 1000).toFixed(2)}s
                    </div>
                    <div>
                      <span className="font-medium">Pass Rate:</span> {((testResults.summary.passed / testResults.summary.totalTests) * 100).toFixed(1)}%
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="text-xs text-muted-foreground">
              <p>This test suite verifies:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Alpaca paper trading API connection</li>
                <li>Real-time portfolio synchronization</li>
                <li>Manual and bot trade execution</li>
                <li>ROI tracking and performance analytics</li>
                <li>Risk management system</li>
                <li>Market data integration readiness</li>
              </ul>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}