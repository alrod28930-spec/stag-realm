import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Database,
  Shield,
  Wifi,
  Zap
} from 'lucide-react';
import { systemTest, type SystemAuditReport, type SystemTestResult } from '@/services/systemTest';
import { toast } from 'sonner';

export default function SystemTest() {
  const [report, setReport] = useState<SystemAuditReport | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runSystemAudit = async () => {
    setIsRunning(true);
    setProgress(0);
    setReport(null);
    
    try {
      toast.info('Starting comprehensive system audit...');
      
      // Simulate progress updates
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);
      
      const auditReport = await systemTest.runFullAudit();
      
      clearInterval(progressInterval);
      setProgress(100);
      
      setReport(auditReport);
      systemTest.printReport(auditReport);
      
      toast.success('System audit completed!');
    } catch (error) {
      toast.error('System audit failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setIsRunning(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-400';
      case 'degraded': return 'text-yellow-400';
      case 'critical': return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'fail': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      default: return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category.toLowerCase()) {
      case 'authentication': return <Shield className="w-5 h-5" />;
      case 'database': return <Database className="w-5 h-5" />;
      case 'backend services': return <Zap className="w-5 h-5" />;
      case 'real-time': return <Wifi className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };

  const groupResultsByCategory = (results: SystemTestResult[]) => {
    return results.reduce((acc, result) => {
      if (!acc[result.category]) acc[result.category] = [];
      acc[result.category].push(result);
      return acc;
    }, {} as Record<string, SystemTestResult[]>);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold gradient-text">System Audit & Test</h1>
        <p className="text-muted-foreground">
          Comprehensive backend and frontend system health analysis
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="w-5 h-5" />
            Run System Audit
          </CardTitle>
          <CardDescription>
            Performs comprehensive testing of authentication, database connectivity, 
            RLS policies, backend services, and real-time features.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={runSystemAudit} 
            disabled={isRunning}
            className="w-full"
          >
            {isRunning ? 'Running Audit...' : 'Start System Audit'}
          </Button>
          
          {isRunning && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Progress</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          )}
        </CardContent>
      </Card>

      {report && (
        <div className="space-y-6">
          {/* Overall Health Summary */}
          <Card>
            <CardHeader>
              <CardTitle>System Health Summary</CardTitle>
              <CardDescription>
                Generated at {report.timestamp.toLocaleString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className={`text-2xl font-bold ${getHealthColor(report.overallHealth)}`}>
                    {report.overallHealth.toUpperCase()}
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Health</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-400">{report.criticalIssues}</div>
                  <div className="text-sm text-muted-foreground">Critical Issues</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-400">{report.warnings}</div>
                  <div className="text-sm text-muted-foreground">Warnings</div>
                </div>
                
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-400">{report.passedTests}</div>
                  <div className="text-sm text-muted-foreground">Passed Tests</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Test Results by Category */}
          <Card>
            <CardHeader>
              <CardTitle>Detailed Test Results</CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-[600px]">
                <div className="space-y-6">
                  {Object.entries(groupResultsByCategory(report.results)).map(([category, tests]) => (
                    <div key={category} className="space-y-3">
                      <div className="flex items-center gap-2 font-semibold text-lg">
                        {getCategoryIcon(category)}
                        {category}
                      </div>
                      
                      <div className="space-y-2 pl-7">
                        {tests.map((test, index) => (
                          <Card key={index} className="border-l-4 border-l-muted">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    {getStatusIcon(test.status)}
                                    <span className="font-medium">{test.test}</span>
                                    <Badge variant={
                                      test.status === 'pass' ? 'default' : 
                                      test.status === 'warning' ? 'secondary' : 
                                      'destructive'
                                    }>
                                      {test.status}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-muted-foreground mb-2">
                                    {test.message}
                                  </p>
                                  
                                  {test.details && Object.keys(test.details).length > 0 && (
                                    <details className="text-xs">
                                      <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                                        View Details
                                      </summary>
                                      <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                                        {JSON.stringify(test.details, null, 2)}
                                      </pre>
                                    </details>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Recommendations</CardTitle>
              <CardDescription>
                Suggested actions to improve system health and performance
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {report.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-muted rounded-lg">
                    <div className="flex-shrink-0 w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-bold">
                      {index + 1}
                    </div>
                    <p className="text-sm">{recommendation}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}