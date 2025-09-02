import { useState, useEffect } from 'react';
import { Shield, FileText, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { complianceService } from '@/services/compliance';
import { useWorkspaceStore } from '@/stores/workspaceStore';
import { toast } from 'sonner';

interface ComplianceOnboardingProps {
  onComplete: () => void;
  className?: string;
}

interface RequiredDocument {
  type: string;
  title: string;
  version: string;
  content: string;
  acknowledged: boolean;
}

export function ComplianceOnboarding({ onComplete, className }: ComplianceOnboardingProps) {
  const { currentWorkspace } = useWorkspaceStore();
  const [documents, setDocuments] = useState<RequiredDocument[]>([]);
  const [currentDocIndex, setCurrentDocIndex] = useState(0);
  const [acknowledged, setAcknowledged] = useState<Record<string, boolean>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    initializeDocuments();
  }, []);

  const initializeDocuments = () => {
    const requiredDocs: RequiredDocument[] = [
      {
        type: 'risk_disclosure',
        title: 'Risk Disclosure Statement',
        version: 'v1.0-2025',
        content: `**IMPORTANT RISK DISCLOSURE**

**TRADING INVOLVES SUBSTANTIAL RISK OF LOSS**

Before using StagAlgo's portfolio mirroring software, you must understand these critical risks:

**MARKET RISKS**:
• Securities trading can result in significant financial losses
• Past performance does not guarantee future results
• Market volatility can cause rapid and substantial losses
• Economic events can drastically affect market prices

**PORTFOLIO MIRRORING RISKS**:
• Our software provides educational analysis only
• Mirrored positions do not represent actual trading advice
• System errors or data delays may occur
• Your actual trading results may differ from simulations

**LEVERAGE AND MARGIN RISKS**:
• Leveraged positions amplify both gains and losses
• Margin trading can result in losses exceeding your initial investment
• Margin calls may force position liquidation at unfavorable prices

**TECHNOLOGY RISKS**:
• Software systems can experience outages or malfunctions
• Data feeds may be delayed, interrupted, or inaccurate
• Internet connectivity issues can affect system access

**REGULATORY RISKS**:
• Trading rules and regulations may change
• Tax implications of trading activities vary by jurisdiction
• Compliance requirements may affect your trading ability

**YOUR RESPONSIBILITIES**:
• Understand all risks before trading
• Only trade with funds you can afford to lose
• Conduct your own research and due diligence
• Consider consulting with qualified financial advisors
• Maintain adequate financial reserves for living expenses

**NO GUARANTEES**:
• StagAlgo makes no promises of profitability
• Educational content does not constitute investment advice
• You are solely responsible for all trading decisions

By acknowledging this disclosure, you confirm that you understand these risks and accept full responsibility for your trading activities.`,
        acknowledged: false,
      },
      {
        type: 'terms_of_service',
        title: 'Terms of Service',
        version: 'v1.0-2025',
        content: `**STAGALGO TERMS OF SERVICE**

**ACCEPTANCE OF TERMS**
By using StagAlgo, you agree to these Terms of Service. If you do not agree, discontinue use immediately.

**SERVICE DESCRIPTION**
StagAlgo is portfolio mirroring and analytics software that:
• Connects to your external brokerage accounts via API
• Provides educational market analysis and insights
• Offers simulated trading environments for learning
• Delivers risk management tools and analytics

**WHAT STAGALGO IS NOT**:
• NOT a broker, dealer, or custodian
• NOT an investment advisor or financial planner  
• NOT a money manager or asset custodian
• NOT a provider of financial services

**YOUR BROKERAGE ACCOUNTS**:
• Your funds remain at YOUR chosen brokerages at all times
• We NEVER hold, custody, or control your money
• All actual trades must be executed by YOU at YOUR broker
• Your brokerage provides SIPC insurance and regulatory protection

**PORTFOLIO MIRRORING MODEL**:
• Our software mirrors your positions for analysis only
• Simulated trades are for educational purposes
• No actual money moves through our system
• You maintain complete control of your real accounts

**USER RESPONSIBILITIES**:
• Provide accurate information when using our software
• Maintain security of your account credentials
• Use the service in compliance with applicable laws
• Make informed decisions about actual trading activities

**PROHIBITED ACTIVITIES**:
• Attempting to manipulate or hack our systems
• Using the service for illegal activities
• Sharing account access with unauthorized persons
• Reverse engineering or copying our software

**LIMITATION OF LIABILITY**:
StagAlgo and its operators are NOT responsible for:
• Trading losses or missed profit opportunities
• System downtime, errors, or data inaccuracies
• Third-party service interruptions
• Market volatility or external economic factors
• User errors or misunderstanding of features

**DATA AND PRIVACY**:
• We collect minimal data necessary to provide our service
• Your brokerage credentials are never stored by us
• API keys are encrypted and used only for authorized access
• We do not sell or share your personal information

**INTELLECTUAL PROPERTY**:
• StagAlgo software and content are our proprietary assets
• You receive a limited license to use our service
• You may not copy, distribute, or create derivative works

**MODIFICATIONS**:
• We may update these Terms at any time
• Continued use constitutes acceptance of changes
• Material changes will be communicated to users

**TERMINATION**:
• Either party may terminate service at any time
• Upon termination, cease all use of our software
• Data retention follows our Privacy Policy

**DISPUTE RESOLUTION**:
• Disputes will be resolved through binding arbitration
• Class action lawsuits are waived
• Governing law is [Jurisdiction]

By accepting these Terms, you confirm understanding of the portfolio mirroring model and your responsibilities.`,
        acknowledged: false,
      },
      {
        type: 'privacy_policy',
        title: 'Privacy Policy',
        version: 'v1.0-2025',
        content: `**STAGALGO PRIVACY POLICY**

**DATA MINIMIZATION COMMITMENT**
StagAlgo follows a strict data minimization policy. We collect only the essential information needed to provide our portfolio mirroring software service.

**INFORMATION WE COLLECT**:

**Account Information**:
• Email address for account creation
• Workspace preferences and settings
• Subscription tier and billing information

**Usage Data**:
• Software feature usage analytics
• Portfolio analytics and performance metrics
• Session logs for compliance and troubleshooting

**API Integration Data**:
• Encrypted API keys you provide for brokerage connections
• Portfolio position data received through APIs
• Trading signals and market analysis preferences

**INFORMATION WE DO NOT COLLECT**:
• Your brokerage login credentials (NEVER stored)
• Personal financial information beyond portfolio positions
• Social security numbers or tax identification
• Unnecessary personal data or behavioral profiles

**HOW WE USE YOUR DATA**:

**Service Provision**:
• Enable portfolio mirroring and analytics features
• Provide personalized market insights and risk analysis
• Maintain workspace settings and user preferences

**Compliance and Security**:
• Maintain audit logs for regulatory compliance
• Monitor for suspicious activity and security threats
• Ensure proper system functioning and troubleshooting

**Communication**:
• Send service-related notifications and updates
• Provide customer support when requested
• Share important security or compliance information

**DATA PROTECTION MEASURES**:

**Encryption**:
• API keys encrypted using industry-standard AES-256
• All data transmission protected with TLS encryption
• Database encryption at rest for sensitive information

**Access Controls**:
• Strict employee access controls on need-to-know basis
• Multi-factor authentication for system access
• Regular security audits and penetration testing

**Data Retention**:
• Compliance data retained for 7 years (regulatory requirement)
• Portfolio analytics data retained while account active
• Deleted accounts purged within 30 days of request

**YOUR PRIVACY RIGHTS**:

**Access and Control**:
• View all data we have collected about you
• Correct inaccurate information in your account
• Export your data in machine-readable format

**Deletion Rights**:
• Delete your account and associated data at any time
• Request specific data deletion (subject to compliance requirements)
• Revoke API access through your brokerage

**GDPR Rights (EU Users)**:
• Right to rectification of inaccurate data
• Right to data portability in standard formats
• Right to object to certain processing activities
• Right to lodge complaints with supervisory authorities

**DATA SHARING POLICY**:

**We DO NOT**:
• Sell your personal information to third parties
• Share data with marketing companies
• Provide data to unaffiliated financial institutions
• Use data for purposes beyond our stated service

**Limited Sharing**:
• Service providers (hosting, security) under strict agreements
• Legal compliance when required by law
• Business transfers (with user notification)

**INTERNATIONAL TRANSFERS**:
• Data processed in secure facilities with appropriate protections
• Adequate safeguards for cross-border data transfers
• Compliance with applicable data protection regulations

**CONTACT INFORMATION**:
For privacy questions or requests, contact us at privacy@stagalgo.com

**POLICY UPDATES**:
We may update this Privacy Policy to reflect changes in our practices or legal requirements. Material changes will be communicated to users with 30 days advance notice.

Last updated: [Date]

By using StagAlgo, you acknowledge understanding and acceptance of this Privacy Policy.`,
        acknowledged: false,
      },
    ];

    setDocuments(requiredDocs);
  };

  const handleDocumentAcknowledge = (docType: string, value: boolean) => {
    setAcknowledged(prev => ({
      ...prev,
      [docType]: value
    }));
  };

  const isCurrentDocAcknowledged = () => {
    const currentDoc = documents[currentDocIndex];
    return acknowledged[currentDoc?.type] || false;
  };

  const canProceed = () => {
    return documents.every(doc => acknowledged[doc.type]);
  };

  const handleNext = () => {
    if (currentDocIndex < documents.length - 1) {
      setCurrentDocIndex(currentDocIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentDocIndex > 0) {
      setCurrentDocIndex(currentDocIndex - 1);
    }
  };

  const handleComplete = async () => {
    if (!currentWorkspace?.id || !canProceed()) return;

    try {
      setSubmitting(true);

      // Record acknowledgments in the database
      for (const doc of documents) {
        await complianceService.recordAcknowledgment(
          currentWorkspace.id,
          doc.type,
          doc.version
        );
      }

      toast.success('Compliance acknowledgments recorded successfully');
      onComplete();
    } catch (error) {
      console.error('Error completing compliance onboarding:', error);
      toast.error('Failed to record compliance acknowledgments');
    } finally {
      setSubmitting(false);
    }
  };

  if (documents.length === 0) return null;

  const currentDoc = documents[currentDocIndex];

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            Compliance Onboarding
          </span>
          <Badge variant="outline">
            {currentDocIndex + 1} of {documents.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Progress indicator */}
        <div className="flex items-center gap-2">
          {documents.map((doc, index) => (
            <div
              key={doc.type}
              className={`flex-1 h-2 rounded-full ${
                index <= currentDocIndex 
                  ? acknowledged[doc.type] 
                    ? 'bg-green-400' 
                    : 'bg-primary'
                  : 'bg-muted'
              }`}
            />
          ))}
        </div>

        {/* Document content */}
        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <FileText className="w-5 h-5 mt-1 text-primary" />
            <div>
              <h3 className="font-semibold text-lg">{currentDoc.title}</h3>
              <p className="text-sm text-muted-foreground">Version {currentDoc.version}</p>
            </div>
          </div>

          <ScrollArea className="h-96 w-full rounded-md border p-4">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {currentDoc.content.split('\n').map((paragraph, index) => {
                if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                  return (
                    <h4 key={index} className="font-semibold text-sm mt-4 mb-2">
                      {paragraph.replace(/\*\*/g, '')}
                    </h4>
                  );
                } else if (paragraph.startsWith('•')) {
                  return (
                    <li key={index} className="text-sm ml-4">
                      {paragraph.substring(1).trim()}
                    </li>
                  );
                } else if (paragraph.trim()) {
                  return (
                    <p key={index} className="text-sm mb-2">
                      {paragraph}
                    </p>
                  );
                }
                return <br key={index} />;
              })}
            </div>
          </ScrollArea>

          {/* Acknowledgment checkbox */}
          <div className="flex items-center space-x-2 p-4 bg-muted/20 rounded-lg border">
            <Checkbox
              id={`ack-${currentDoc.type}`}
              checked={isCurrentDocAcknowledged()}
              onCheckedChange={(checked) => 
                handleDocumentAcknowledge(currentDoc.type, checked as boolean)
              }
            />
            <label 
              htmlFor={`ack-${currentDoc.type}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              I have read and understand this {currentDoc.title.toLowerCase()}
            </label>
            {isCurrentDocAcknowledged() && (
              <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />
            )}
          </div>

          {/* Risk warning for critical documents */}
          {currentDoc.type === 'risk_disclosure' && (
            <div className="flex items-start gap-2 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
              <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5" />
              <div className="text-xs text-yellow-300">
                <strong>Critical:</strong> This risk disclosure contains important information about potential losses. 
                Please read carefully and ensure you understand all risks before proceeding.
              </div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentDocIndex === 0}
          >
            Previous
          </Button>

          <div className="flex items-center gap-2">
            {documents.map((doc, index) => (
              <div
                key={doc.type}
                className={`w-2 h-2 rounded-full ${
                  acknowledged[doc.type] ? 'bg-green-400' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {currentDocIndex < documents.length - 1 ? (
            <Button
              onClick={handleNext}
              disabled={!isCurrentDocAcknowledged()}
            >
              Next
            </Button>
          ) : (
            <Button
              onClick={handleComplete}
              disabled={!canProceed() || submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  Completing...
                </div>
              ) : (
                'Complete Onboarding'
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}