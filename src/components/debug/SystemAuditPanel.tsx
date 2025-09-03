// System Audit Panel - UI for running and displaying system audits
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { systemAuditor } from '@/utils/systemAudit';
import { Loader2, AlertTriangle, AlertCircle, Info, CheckCircle, Shield, Database, Zap, FileCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AuditResult {
  category: string;
  severity: 'critical' | 'warning' | 'info';
  issue: string;
  description: string;
  recommendation: string;
  fixed?: boolean;
}

export function SystemAuditPanel() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<AuditResult[]>([]);
  const [lastRun, setLastRun] = useState<Date | null>(null);
  const { toast } = useToast();

  const runAudit = async () => {
    setIsRunning(true);
    try {
      const auditResults = await systemAuditor.runComprehensiveAudit();
      setResults(auditResults);
      setLastRun(new Date());
      
      const summary = systemAuditor.getSummary();
      toast({
        title: "Audit Complete",
        description: `Found ${summary.critical} critical issues, ${summary.warnings} warnings`,
        variant: summary.critical > 0 ? "destructive" : "default"
      });
    } catch (error) {
      toast({
        title: "Audit Failed",
        description: "Failed to run system audit",
        variant: "destructive"
      });
    } finally {
      setIsRunning(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
      case 'info': return <Info className="w-4 h-4 text-blue-500" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Authentication': return <Shield className="w-4 h-4" />;
      case 'Database': return <Database className="w-4 h-4" />;
      case 'Security': return <Shield className="w-4 h-4" />;
      case 'Performance': return <Zap className="w-4 h-4" />;
      case 'Data Integrity': return <FileCheck className="w-4 h-4" />;
      default: return <Info className="w-4 h-4" />;
    }
  };

  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive' as const;
      case 'warning': return 'secondary' as const;  
      case 'info': return 'outline' as const;
      default: return 'outline' as const;
    }
  };

  const summary = systemAuditor.getSummary();
  const criticalIssues = results.filter(r => r.severity === 'critical');
  const warningIssues = results.filter(r => r.severity === 'warning');
  const infoIssues = results.filter(r => r.severity === 'info');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">System Audit</h2>
          <p className="text-muted-foreground">
            Comprehensive system health and security check
          </p>
        </div>
        <Button 
          onClick={runAudit} 
          disabled={isRunning}
          className="bg-gradient-primary hover:opacity-90"
        >
          {isRunning ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Running Audit...
            </>
          ) : (
            'Run System Audit'
          )}
        </Button>
      </div>

      {/* Summary Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card className={`border-2 ${summary.critical > 0 ? 'border-red-500/50 bg-red-50 dark:bg-red-950/20' : 'border-green-500/50 bg-green-50 dark:bg-green-950/20'}`}>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Critical</p>
                  <p className="text-2xl font-bold">{summary.critical}</p>
                </div>
                {summary.critical > 0 ? (
                  <AlertCircle className="w-6 h-6 text-red-500" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Warnings</p>
                  <p className="text-2xl font-bold">{summary.warnings}</p>
                </div>
                <AlertTriangle className="w-6 h-6 text-yellow-500" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Info</p>
                  <p className="text-2xl font-bold">{summary.info}</p>
                </div>
                <Info className="w-6 h-6 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-primary/50 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Ready</p>
                  <p className="text-2xl font-bold">{summary.ready ? 'Yes' : 'No'}</p>
                </div>
                {summary.ready ? (
                  <CheckCircle className="w-6 h-6 text-green-500" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-red-500" />
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* System Status Alert */}
      {results.length > 0 && (
        <Alert className={summary.ready ? "border-green-500 bg-green-50 dark:bg-green-950/20" : "border-red-500 bg-red-50 dark:bg-red-950/20"}>
          {summary.ready ? (
            <CheckCircle className="w-4 h-4 text-green-500" />
          ) : (
            <AlertCircle className="w-4 h-4 text-red-500" />
          )}
          <AlertDescription>
            {summary.ready 
              ? "✅ System is ready for paper trading tests. All critical issues resolved."
              : `⚠️ System has ${summary.critical} critical issues that must be resolved before paper trading tests.`
            }
          </AlertDescription>
        </Alert>
      )}

      {/* Detailed Results */}
      {results.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileCheck className="w-5 h-5" />
              Audit Results
              <Badge variant="outline">
                {lastRun?.toLocaleString()}
              </Badge>
            </CardTitle>
            <CardDescription>
              Detailed findings and recommendations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="space-y-4">
                {/* Critical Issues */}
                {criticalIssues.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-red-500 mb-2 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Critical Issues ({criticalIssues.length})
                    </h4>
                    <div className="space-y-2 ml-6">
                      {criticalIssues.map((result, index) => (
                        <div key={`critical-${index}`} className="border-l-2 border-red-500 pl-4 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            {getCategoryIcon(result.category)}
                            <span className="font-medium">{result.category}</span>
                            <Badge variant={getSeverityBadgeVariant(result.severity)}>
                              {result.severity}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{result.description}</p>
                          <p className="text-sm text-muted-foreground">
                            💡 {result.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                )}

                {/* Warning Issues */}
                {warningIssues.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-yellow-500 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" />
                      Warnings ({warningIssues.length})
                    </h4>
                    <div className="space-y-2 ml-6">
                      {warningIssues.map((result, index) => (
                        <div key={`warning-${index}`} className="border-l-2 border-yellow-500 pl-4 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            {getCategoryIcon(result.category)}
                            <span className="font-medium">{result.category}</span>
                            <Badge variant={getSeverityBadgeVariant(result.severity)}>
                              {result.severity}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{result.description}</p>
                          <p className="text-sm text-muted-foreground">
                            💡 {result.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                    <Separator className="mt-4" />
                  </div>
                )}

                {/* Info Issues */}
                {infoIssues.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-blue-500 mb-2 flex items-center gap-2">
                      <Info className="w-4 h-4" />
                      Information ({infoIssues.length})
                    </h4>
                    <div className="space-y-2 ml-6">
                      {infoIssues.map((result, index) => (
                        <div key={`info-${index}`} className="border-l-2 border-blue-500 pl-4 py-2">
                          <div className="flex items-center gap-2 mb-1">
                            {getCategoryIcon(result.category)}
                            <span className="font-medium">{result.category}</span>
                            <Badge variant={getSeverityBadgeVariant(result.severity)}>
                              {result.severity}
                            </Badge>
                          </div>
                          <p className="text-sm font-medium">{result.description}</p>
                          <p className="text-sm text-muted-foreground">
                            💡 {result.recommendation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* First Run Placeholder */}
      {results.length === 0 && !isRunning && (
        <Card>
          <CardContent className="py-8 text-center">
            <div className="flex flex-col items-center gap-4">
              <div className="p-4 rounded-full bg-primary/10">
                <Shield className="w-8 h-8 text-primary" />
              </div>
              <div>
                <p className="font-medium">No audit results yet</p>
                <p className="text-sm text-muted-foreground">
                  Run a comprehensive system audit to check for issues
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}