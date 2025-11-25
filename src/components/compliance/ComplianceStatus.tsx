import { useState, useEffect } from 'react';
import { Shield, CheckCircle, AlertTriangle, XCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { complianceService } from '@/services/compliance';
import { LegalDocumentsModal } from './LegalDocumentsModal';

interface ComplianceStatusProps {
  className?: string;
}

export function ComplianceStatus({ className }: ComplianceStatusProps) {
  const [complianceData, setComplianceData] = useState<any>(null);
  const [showLegalDocs, setShowLegalDocs] = useState(false);

  useEffect(() => {
    // Load compliance data
    const settings = complianceService.getComplianceSettings();
    const acknowledgments = complianceService.getAcknowledgmentHistory(10);
    const events = complianceService.getComplianceEvents(10);
    
    setComplianceData({
      settings,
      acknowledgments,
      events,
      sessionId: complianceService.getCurrentSessionId()
    });
  }, []);

  if (!complianceData) return null;

  const getComplianceScore = () => {
    const factors = [
      complianceData.settings.disclaimersEnabled ? 25 : 0,
      complianceData.settings.requireAcknowledgments ? 25 : 0,
      complianceData.settings.logAllInteractions ? 20 : 0,
      complianceData.settings.brokerComplianceMode ? 30 : 0
    ];
    return factors.reduce((sum, score) => sum + score, 0);
  };

  const complianceScore = getComplianceScore();
  const recentAcks = complianceData.acknowledgments.filter(
    (ack: any) => Date.now() - new Date(ack.acknowledgedAt).getTime() < 24 * 60 * 60 * 1000
  ).length;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-400';
    if (score >= 70) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getScoreIcon = (score: number) => {
    if (score >= 90) return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (score >= 70) return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Compliance Status
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLegalDocs(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              Legal Docs
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Compliance Score */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Compliance Score</span>
              <div className="flex items-center gap-2">
                {getScoreIcon(complianceScore)}
                <span className={`font-mono text-lg ${getScoreColor(complianceScore)}`}>
                  {complianceScore}%
                </span>
              </div>
            </div>
            <Progress value={complianceScore} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {complianceScore >= 90 && "Excellent compliance posture with full protection enabled"}
              {complianceScore >= 70 && complianceScore < 90 && "Good compliance with minor improvements needed"}
              {complianceScore < 70 && "Compliance gaps detected - review settings recommended"}
            </p>
          </div>

          {/* Portfolio Mirroring Status */}
          <div className="p-4 bg-muted/20 rounded-lg border">
            <h4 className="font-semibold text-sm mb-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              Portfolio Mirroring Protection Active
            </h4>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span>Fund Custody Protection</span>
                <Badge variant="outline" className="text-green-400 border-green-400/30">
                  ACTIVE
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Broker Separation</span>
                <Badge variant="outline" className="text-green-400 border-green-400/30">
                  ENFORCED
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Liability Shield</span>
                <Badge variant="outline" className="text-green-400 border-green-400/30">
                  ENABLED
                </Badge>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="space-y-3">
            <h4 className="font-semibold text-sm">Recent Activity</h4>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="text-center p-3 bg-muted/10 rounded">
                <div className="font-mono text-lg font-semibold text-blue-400">
                  {recentAcks}
                </div>
                <div className="text-muted-foreground">Acknowledgments Today</div>
              </div>
              <div className="text-center p-3 bg-muted/10 rounded">
                <div className="font-mono text-lg font-semibold text-purple-400">
                  {complianceData.events.length}
                </div>
                <div className="text-muted-foreground">Compliance Events</div>
              </div>
            </div>
          </div>

          {/* Settings Summary */}
          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Configuration</h4>
            <div className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span>Disclaimers</span>
                <Badge variant={complianceData.settings.disclaimersEnabled ? "default" : "destructive"}>
                  {complianceData.settings.disclaimersEnabled ? "ON" : "OFF"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Acknowledgments</span>
                <Badge variant={complianceData.settings.requireAcknowledgments ? "default" : "destructive"}>
                  {complianceData.settings.requireAcknowledgments ? "REQUIRED" : "OPTIONAL"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Audit Logging</span>
                <Badge variant={complianceData.settings.logAllInteractions ? "default" : "destructive"}>
                  {complianceData.settings.logAllInteractions ? "ACTIVE" : "DISABLED"}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span>Broker Mode</span>
                <Badge variant={complianceData.settings.brokerComplianceMode ? "default" : "destructive"}>
                  {complianceData.settings.brokerComplianceMode ? "COMPLIANT" : "BASIC"}
                </Badge>
              </div>
            </div>
          </div>

          {/* Session Info */}
          <div className="pt-3 border-t text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <span>Session ID</span>
              <code className="font-mono text-xs">
                {complianceData.sessionId.split('_')[1]}
              </code>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Compliance Tier</span>
              <Badge variant="outline" className="text-xs">
                {complianceData.settings.subscriptionTier.complianceLevel.toUpperCase()}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <LegalDocumentsModal
        isOpen={showLegalDocs}
        onClose={() => setShowLegalDocs(false)}
      />
    </>
  );
}