import { useState, useEffect } from 'react';
import { CheckCircle, AlertTriangle, XCircle, FileText, Shield, Users, Lock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { LegalDocumentsModal } from './LegalDocumentsModal';

interface ComplianceChecklistProps {
  className?: string;
}

export function ComplianceChecklist({ className }: ComplianceChecklistProps) {
  const [showLegalDocs, setShowLegalDocs] = useState(false);
  const [checklistStatus, setChecklistStatus] = useState({
    portfolioMirroring: true,     // Built-in architecture
    legalDocuments: true,         // Available in modal
    disclaimerSystem: true,       // Active compliance service
    dataMinimization: true,       // Privacy policy enforced
    brokerSeparation: true,       // API-only connections
    auditLogging: true,           // All interactions logged
    riskWarnings: true,           // Risk acknowledgments active
    userControl: true,            // Users maintain broker control
    
    // Items that might need attention
    professionalReview: false,    // Legal review recommended
    kyc_aml: false,               // KYC/AML not implemented
    pdt_compliance: false,        // Pattern Day Trading rules
    gdpr_compliance: true,        // Data deletion rights
    insurance_review: false,      // Liability insurance review
    regulatory_filing: false      // Regulatory registrations
  });

  const getCompletionPercentage = () => {
    const total = Object.keys(checklistStatus).length;
    const completed = Object.values(checklistStatus).filter(Boolean).length;
    return Math.round((completed / total) * 100);
  };

  const getStatusIcon = (status: boolean, isRecommended = false) => {
    if (status) return <CheckCircle className="w-5 h-5 text-green-400" />;
    if (isRecommended) return <AlertTriangle className="w-5 h-5 text-yellow-400" />;
    return <XCircle className="w-5 h-5 text-red-400" />;
  };

  const getStatusBadge = (status: boolean, label: string, isRecommended = false) => {
    if (status) return <Badge variant="outline" className="text-green-400 border-green-400/30">COMPLIANT</Badge>;
    if (isRecommended) return <Badge variant="outline" className="text-yellow-400 border-yellow-400/30">RECOMMENDED</Badge>;
    return <Badge variant="outline" className="text-red-400 border-red-400/30">NEEDS ATTENTION</Badge>;
  };

  const coreProtections = [
    {
      key: 'portfolioMirroring',
      title: 'Portfolio Mirroring Architecture',
      description: 'Software-only model with no fund custody',
      status: checklistStatus.portfolioMirroring,
      critical: true
    },
    {
      key: 'brokerSeparation',
      title: 'Broker Account Separation',
      description: 'User funds remain at external brokers',
      status: checklistStatus.brokerSeparation,
      critical: true
    },
    {
      key: 'legalDocuments',
      title: 'Legal Documentation',
      description: 'EULA, TOS, Privacy Policy, Risk Disclosures',
      status: checklistStatus.legalDocuments,
      critical: true
    },
    {
      key: 'disclaimerSystem',
      title: 'Disclaimer & Acknowledgment System',
      description: 'Active compliance tracking and warnings',
      status: checklistStatus.disclaimerSystem,
      critical: true
    }
  ];

  const dataProtections = [
    {
      key: 'dataMinimization',
      title: 'Data Minimization',
      description: 'Only essential data collected, no credentials stored',
      status: checklistStatus.dataMinimization
    },
    {
      key: 'auditLogging',
      title: 'Audit Logging',
      description: 'All user interactions logged for compliance',
      status: checklistStatus.auditLogging
    },
    {
      key: 'gdpr_compliance',
      title: 'GDPR Compliance',
      description: 'Data deletion rights and privacy controls',
      status: checklistStatus.gdpr_compliance
    }
  ];

  const recommendedActions = [
    {
      key: 'professionalReview',
      title: 'Legal Professional Review',
      description: 'Have compliance attorney review before production',
      status: checklistStatus.professionalReview,
      isRecommended: true
    },
    {
      key: 'insurance_review',
      title: 'Errors & Omissions Insurance',
      description: 'Consider E&O insurance for additional protection',
      status: checklistStatus.insurance_review,
      isRecommended: true
    },
    {
      key: 'kyc_aml',
      title: 'KYC/AML Procedures',
      description: 'Basic identity verification (if required)',
      status: checklistStatus.kyc_aml,
      isRecommended: true
    }
  ];

  const completionPercentage = getCompletionPercentage();

  return (
    <>
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Compliance Checklist
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowLegalDocs(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              View Legal Docs
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Overall Status */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Overall Compliance Status</span>
              <Badge variant={completionPercentage >= 80 ? "default" : "secondary"}>
                {completionPercentage}% Complete
              </Badge>
            </div>
            <Progress value={completionPercentage} className="h-2" />
            <div className="text-xs text-muted-foreground">
              {completionPercentage >= 80 && "Strong compliance posture with portfolio mirroring protection"}
              {completionPercentage >= 60 && completionPercentage < 80 && "Good foundation, consider recommended improvements"}
              {completionPercentage < 60 && "Critical compliance gaps need immediate attention"}
            </div>
          </div>

          {/* Core Protections */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Shield className="w-4 h-4 text-green-400" />
              <h4 className="font-semibold text-sm">Core Legal Protections</h4>
            </div>
            <div className="space-y-3">
              {coreProtections.map((item) => (
                <div key={item.key} className="flex items-start justify-between p-3 bg-muted/10 rounded-lg border">
                  <div className="flex items-start gap-3 flex-1">
                    {getStatusIcon(item.status)}
                    <div className="space-y-1">
                      <div className="font-medium text-sm">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                  {getStatusBadge(item.status, item.title)}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Data Protections */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-400" />
              <h4 className="font-semibold text-sm">Data Protection & Privacy</h4>
            </div>
            <div className="space-y-2">
              {dataProtections.map((item) => (
                <div key={item.key} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    {getStatusIcon(item.status)}
                    <span>{item.title}</span>
                  </div>
                  {getStatusBadge(item.status, item.title)}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Recommended Actions */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-yellow-400" />
              <h4 className="font-semibold text-sm">Recommended Actions</h4>
            </div>
            <div className="space-y-2">
              {recommendedActions.map((item) => (
                <div key={item.key} className="flex items-start justify-between p-2 bg-yellow-400/5 rounded border border-yellow-400/20">
                  <div className="flex items-start gap-2 flex-1">
                    {getStatusIcon(item.status, item.isRecommended)}
                    <div className="space-y-1">
                      <div className="text-sm font-medium">{item.title}</div>
                      <div className="text-xs text-muted-foreground">{item.description}</div>
                    </div>
                  </div>
                  {getStatusBadge(item.status, item.title, item.isRecommended)}
                </div>
              ))}
            </div>
          </div>

          {/* Portfolio Mirroring Summary */}
          <div className="p-4 bg-green-400/5 rounded-lg border border-green-400/20">
            <h4 className="font-semibold text-sm text-green-400 mb-2">Portfolio Mirroring Compliance Summary</h4>
            <div className="text-xs text-muted-foreground space-y-1">
              <p>✓ <strong>No Fund Custody:</strong> StagAlgo NEVER holds or controls user funds</p>
              <p>✓ <strong>Broker Separation:</strong> User accounts remain at regulated brokers</p>
              <p>✓ <strong>Software-Only:</strong> Educational analysis tool, not financial service</p>
              <p>✓ <strong>User Control:</strong> All trading decisions and executions by user</p>
              <p>✓ <strong>Liability Shield:</strong> Clear disclaimers and acknowledgment tracking</p>
            </div>
          </div>

          {/* Action Required */}
          {completionPercentage < 100 && (
            <div className="p-4 bg-orange-400/5 rounded-lg border border-orange-400/20">
              <h4 className="font-semibold text-sm text-orange-400 mb-2">Action Required</h4>
              <div className="text-xs text-muted-foreground">
                <p>Before production launch, consider:</p>
                <ul className="list-disc list-inside mt-1 space-y-1">
                  <li>Professional legal review of compliance framework</li>
                  <li>Errors & omissions insurance consultation</li>
                  <li>Regulatory filing assessment for your jurisdiction</li>
                  <li>Terms of Service customization for your business entity</li>
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <LegalDocumentsModal
        isOpen={showLegalDocs}
        onClose={() => setShowLegalDocs(false)}
      />
    </>
  );
}