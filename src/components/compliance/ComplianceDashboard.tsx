import { useState, useEffect } from 'react';
import { Shield, Users, FileText, AlertTriangle, Download, Eye, CheckCircle, Clock, XCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { complianceService } from '@/services/compliance';
import { toast } from 'sonner';

interface ComplianceDashboardProps {
  className?: string;
}

export function ComplianceDashboard({ className }: ComplianceDashboardProps) {
  const [verificationStatus, setVerificationStatus] = useState<any>(null);
  const [acknowledgments, setAcknowledgments] = useState<any[]>([]);
  const [reports, setReports] = useState<any[]>([]);
  const [suspiciousActivities, setSuspiciousActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingReport, setGeneratingReport] = useState(false);

  useEffect(() => {
    loadComplianceData();
  }, []);

  const loadComplianceData = async () => {
    const workspaceId = '00000000-0000-0000-0000-000000000001'; // Default workspace UUID

    try {
      setLoading(true);
      const [verification, acks, reportsData, suspicious] = await Promise.all([
        complianceService.getVerificationStatus(workspaceId),
        complianceService.getAcknowledgments(workspaceId),
        complianceService.getReports(workspaceId),
        complianceService.getSuspiciousActivities(workspaceId),
      ]);

      setVerificationStatus(verification);
      setAcknowledgments(acks);
      setReports(reportsData);
      setSuspiciousActivities(suspicious);
    } catch (error) {
      console.error('Error loading compliance data:', error);
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleKycVerification = async () => {
    const workspaceId = '00000000-0000-0000-0000-000000000001'; // Default workspace UUID

    try {
      const result = await complianceService.verifyKyc(workspaceId);
      if (result.success) {
        toast.success('KYC verification initiated successfully');
        await loadComplianceData();
      }
    } catch (error) {
      console.error('KYC verification failed:', error);
      toast.error('KYC verification failed');
    }
  };

  const handleGenerateReport = async (reportType: string) => {
    const workspaceId = '00000000-0000-0000-0000-000000000001'; // Default workspace UUID

    try {
      setGeneratingReport(true);
      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
      
      const result = await complianceService.generateReport(workspaceId, reportType, startDate, endDate);
      
      if (result.success) {
        toast.success('Report generated successfully');
        
        // Create and trigger download of CSV
        const blob = new Blob([result.csv_content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${reportType}_${startDate}_${endDate}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        await loadComplianceData();
      }
    } catch (error) {
      console.error('Report generation failed:', error);
      toast.error('Report generation failed');
    } finally {
      setGeneratingReport(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="default" className="text-green-400 border-green-400/30"><CheckCircle className="w-3 h-3 mr-1" />Verified</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="text-yellow-400 border-yellow-400/30"><Clock className="w-3 h-3 mr-1" />Pending</Badge>;
      case 'failed':
        return <Badge variant="destructive" className="text-red-400 border-red-400/30"><XCircle className="w-3 h-3 mr-1" />Failed</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const getSeverityColor = (severity: number) => {
    switch (severity) {
      case 1: return 'text-blue-400';
      case 2: return 'text-yellow-400';
      case 3: return 'text-red-400';
      default: return 'text-muted-foreground';
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Compliance Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Compliance Dashboard
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="verification" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="verification">KYC/AML</TabsTrigger>
            <TabsTrigger value="acknowledgments">Acknowledgments</TabsTrigger>
            <TabsTrigger value="reports">Reports</TabsTrigger>
            <TabsTrigger value="monitoring">Monitoring</TabsTrigger>
          </TabsList>

          <TabsContent value="verification" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">KYC Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Identity Verification</span>
                    {getStatusBadge(verificationStatus?.kyc_status || 'pending')}
                  </div>
                  {verificationStatus?.last_checked && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Last checked: {new Date(verificationStatus.last_checked).toLocaleDateString()}
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">AML Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Anti-Money Laundering</span>
                    {getStatusBadge(verificationStatus?.aml_status || 'pending')}
                  </div>
                  {verificationStatus?.provider && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Provider: {verificationStatus.provider}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={handleKycVerification}
                className="flex-1"
              >
                <Users className="w-4 h-4 mr-2" />
                {verificationStatus ? 'Re-verify' : 'Start KYC/AML Verification'}
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="acknowledgments" className="space-y-4">
            <div className="space-y-3">
              {acknowledgments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No acknowledgments recorded yet.
                </p>
              ) : (
                acknowledgments.map((ack) => (
                  <Card key={ack.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm capitalize">
                            {ack.document_type.replace('_', ' ')}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            Version {ack.version} • {new Date(ack.acknowledged_at).toLocaleDateString()}
                          </p>
                          {ack.ip_address && (
                            <p className="text-xs text-muted-foreground mt-1">
                              IP: {ack.ip_address}
                            </p>
                          )}
                        </div>
                        <Badge variant="outline" className="text-green-400 border-green-400/30">
                          <CheckCircle className="w-3 h-3 mr-1" />
                          Acknowledged
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2 mb-4">
              <Select onValueChange={handleGenerateReport} disabled={generatingReport}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Generate new report..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="trade_blotter">Trade Blotter</SelectItem>
                  <SelectItem value="position_report">Position Report</SelectItem>
                  <SelectItem value="sar">Suspicious Activity Report</SelectItem>
                  <SelectItem value="communications_archive">Communications Archive</SelectItem>
                </SelectContent>
              </Select>
              {generatingReport && (
                <div className="flex items-center px-3 text-sm text-muted-foreground">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mr-2"></div>
                  Generating...
                </div>
              )}
            </div>

            <div className="space-y-3">
              {reports.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No reports generated yet. Create your first report above.
                </p>
              ) : (
                reports.map((report) => (
                  <Card key={report.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-sm capitalize">
                            {report.report_type.replace('_', ' ')}
                          </h4>
                          <p className="text-xs text-muted-foreground">
                            {report.period_start} to {report.period_end}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Generated: {new Date(report.generated_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={report.status === 'ready' ? 'default' : 'secondary'}>
                            {report.status}
                          </Badge>
                          {report.status === 'ready' && (
                            <Button size="sm" variant="outline">
                              <Download className="w-3 h-3 mr-1" />
                              Download
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="monitoring" className="space-y-4">
            <div className="space-y-3">
              {suspiciousActivities.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No suspicious activities detected.
                </p>
              ) : (
                suspiciousActivities.map((activity) => (
                  <Card key={activity.id}>
                    <CardContent className="pt-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-sm capitalize flex items-center gap-2">
                            <AlertTriangle className={`w-4 h-4 ${getSeverityColor(activity.severity)}`} />
                            {activity.activity_type?.replace('_', ' ')}
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.description}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(activity.ts).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={activity.status === 'open' ? 'destructive' : 'secondary'}>
                            {activity.status}
                          </Badge>
                          {activity.status === 'open' && (
                            <Button size="sm" variant="outline">
                              <Eye className="w-3 h-3 mr-1" />
                              Review
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}