import { useState } from 'react';
import { FileText, Shield, Lock, Scale } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';

interface LegalDocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function LegalDocumentsModal({ isOpen, onClose }: LegalDocumentsModalProps) {
  const [activeTab, setActiveTab] = useState('eula');

  const documents = {
    eula: {
      title: 'End User License Agreement',
      icon: <FileText className="w-5 h-5" />,
      content: `
**STAGALGO PORTFOLIO MIRRORING SOFTWARE LICENSE AGREEMENT**

**ACCEPTANCE OF TERMS**
By using StagAlgo, you agree to this End User License Agreement ("EULA"). If you do not agree, do not use this software.

**SOFTWARE LICENSE - NOT FINANCIAL SERVICES**
StagAlgo grants you a limited, non-exclusive license to use our portfolio mirroring software. This is ONLY a software license, not the provision of financial services.

**WHAT STAGALGO IS:**
• Portfolio mirroring and analytics software
• Educational trading simulation platform
• Market data analysis tool
• Risk assessment and learning system

**WHAT STAGALGO IS NOT:**
• A broker-dealer or financial custodian
• An investment advisor or financial planner
• A money manager or fiduciary
• A provider of personalized financial advice

**PORTFOLIO MIRRORING MODEL:**
• You connect your external brokerage via API keys
• We mirror your positions for analysis and education
• NO actual trades executed without your direct action
• Your brokerage account remains completely separate
• We NEVER hold, custody, or control your funds

**USER RESPONSIBILITIES:**
• Maintain control of your brokerage account
• Execute any actual trades yourself at your broker
• Conduct independent research and due diligence
• Understand all trading risks before investing
• Comply with all applicable laws and regulations

**LIMITATION OF LIABILITY:**
StagAlgo, its owners, and operators are not liable for:
• Trading losses or investment decisions
• Market volatility or external economic factors
• System downtime or technical issues
• Data inaccuracies or transmission delays
• User misunderstanding of features or risks

**INTELLECTUAL PROPERTY:**
All software, algorithms, and content remain the property of StagAlgo. Users receive only a license to use, not ownership.

**TERMINATION:**
Either party may terminate this agreement at any time. Upon termination, you must cease using the software.

**GOVERNING LAW:**
This agreement is governed by the laws of [Your Jurisdiction].

Last Updated: ${new Date().toLocaleDateString()}
      `
    },
    tos: {
      title: 'Terms of Service',
      icon: <Scale className="w-5 h-5" />,
      content: `
**STAGALGO TERMS OF SERVICE**

**SERVICE DESCRIPTION**
StagAlgo provides portfolio mirroring software that connects to external brokerages for educational analysis and risk management.

**REGULATORY COMPLIANCE**
StagAlgo operates as a software provider, not a financial service:
• No broker-dealer registration required (we don't custody funds)
• No investment advisor registration needed (educational content only)
• Clear separation from regulated financial activities
• Users maintain direct relationship with regulated brokers

**USER ACCOUNTS AND DATA**
• You are responsible for account security
• Provide accurate information during registration
• Maintain confidentiality of login credentials
• Report any unauthorized account access immediately

**PORTFOLIO MIRRORING PROCESS**
1. You provide API keys from your chosen broker
2. We read your positions and balances (read-only access)
3. Our software analyzes and mirrors positions for education
4. You remain in complete control of actual trades
5. Your broker account stays separate and protected

**PROHIBITED USES**
You may not:
• Use the software for illegal activities
• Attempt to reverse engineer our algorithms
• Share your account with unauthorized users
• Violate any applicable securities laws
• Use our platform to provide unauthorized financial advice

**DISCLAIMERS**
• All content is for educational purposes only
• No guarantees of trading success or profitability
• Past performance does not predict future results
• Trading involves substantial risk of loss
• You are solely responsible for your trading decisions

**THIRD-PARTY INTEGRATIONS**
• We integrate with external brokers (Alpaca, OANDA, etc.)
• These brokers have their own terms and conditions
• We are not responsible for third-party service failures
• Your primary relationship is with your chosen broker

**PRIVACY AND DATA PROTECTION**
• We collect minimal data necessary for service provision
• API keys are encrypted and never shared
• No brokerage login credentials are stored
• GDPR-compliant data deletion available upon request

**FEES AND BILLING**
• Subscription fees are clearly disclosed
• No hidden fees or surprise charges
• Different tiers offer various feature levels
• Refund policies are outlined separately

**LIMITATION OF LIABILITY**
TO THE MAXIMUM EXTENT PERMITTED BY LAW:
• StagAlgo is not liable for trading losses
• We disclaim all warranties, express or implied
• Our liability is limited to the amount you paid for the service
• We are not responsible for consequential damages

**INDEMNIFICATION**
You agree to indemnify StagAlgo against claims arising from:
• Your use of the software
• Your trading decisions and activities
• Violation of these terms
• Infringement of third-party rights

**MODIFICATIONS**
We may update these terms with reasonable notice. Continued use constitutes acceptance of changes.

**DISPUTE RESOLUTION**
Disputes will be resolved through binding arbitration in [Your Jurisdiction].

Last Updated: ${new Date().toLocaleDateString()}
      `
    },
    privacy: {
      title: 'Privacy Policy',
      icon: <Lock className="w-5 h-5" />,
      content: `
**STAGALGO PRIVACY POLICY**

**COMMITMENT TO PRIVACY**
StagAlgo is committed to protecting your privacy through minimal data collection and strong security practices.

**INFORMATION WE COLLECT**

**ESSENTIAL DATA (Required for Service):**
• Account registration information (email, username)
• Workspace settings and preferences
• Portfolio positions mirrored from your broker
• Usage analytics and performance metrics
• Compliance acknowledgments and audit logs

**TECHNICAL DATA:**
• IP addresses and session information
• Browser type and device information
• Feature usage patterns and error logs
• API interaction logs (for debugging)

**WHAT WE DON'T COLLECT:**
• Your brokerage login credentials (NEVER stored)
• Personal financial information beyond positions
• Social security numbers or tax IDs
• Unnecessary personal or demographic data
• Marketing profiles or behavioral tracking

**HOW WE USE YOUR INFORMATION**

**SERVICE PROVISION:**
• Provide portfolio mirroring and analysis
• Generate educational insights and recommendations
• Maintain compliance and audit trails
• Improve software performance and features

**SECURITY AND COMPLIANCE:**
• Detect and prevent unauthorized access
• Comply with legal and regulatory requirements
• Maintain audit logs for compliance purposes
• Provide customer support when needed

**DATA PROTECTION MEASURES**

**ENCRYPTION:**
• API keys encrypted with AES-256 encryption
• All data transmitted over secure HTTPS connections
• Database encryption at rest
• Regular security audits and updates

**ACCESS CONTROLS:**
• Strict employee access controls
• Multi-factor authentication requirements
• Regular access reviews and revocations
• Principle of least privilege implementation

**DATA SHARING AND DISCLOSURE**

**WE DO NOT:**
• Sell your data to third parties
• Share information for marketing purposes
• Provide data to data brokers
• Use your information for unrelated business purposes

**WE MAY SHARE DATA ONLY WHEN:**
• Required by valid legal process
• Necessary to protect our rights or safety
• You provide explicit consent
• Required for service provision (encrypted API calls)

**YOUR RIGHTS AND CONTROLS**

**ACCESS AND CONTROL:**
• View all data we have about you
• Export your data in portable formats
• Correct inaccurate information
• Delete your account and all associated data

**GDPR RIGHTS (for EU users):**
• Right to access your personal data
• Right to rectification of inaccurate data
• Right to erasure ("right to be forgotten")
• Right to data portability
• Right to object to processing
• Right to withdraw consent

**DATA RETENTION**

**ACTIVE ACCOUNTS:**
• Data retained while account is active
• Compliance logs retained for regulatory requirements
• Performance data retained for service improvement

**DELETED ACCOUNTS:**
• Personal data deleted within 30 days
• Compliance logs may be retained longer as required by law
• Anonymized usage statistics may be retained

**THIRD-PARTY INTEGRATIONS**

**BROKERAGE CONNECTIONS:**
• We connect to your broker via your API keys
• Brokers have their own privacy policies
• We receive only position and balance data
• No personal information shared with brokers

**SERVICE PROVIDERS:**
• Cloud hosting (encrypted data storage)
• Analytics services (anonymized data only)
• Customer support tools (minimal necessary data)

**INTERNATIONAL DATA TRANSFERS**
• Data may be processed in different countries
• Appropriate safeguards in place for international transfers
• EU users: transfers comply with GDPR requirements

**CHILDREN'S PRIVACY**
StagAlgo is not intended for users under 18. We do not knowingly collect data from minors.

**CONTACT INFORMATION**
For privacy questions or requests:
• Email: privacy@stagalgo.com
• Data Protection Officer: dpo@stagalgo.com
• Address: [Your Company Address]

**POLICY UPDATES**
We will notify you of material changes to this policy via email or platform notification.

Last Updated: ${new Date().toLocaleDateString()}
      `
    },
    risk: {
      title: 'Risk Disclosures',
      icon: <Shield className="w-5 h-5" />,
      content: `
**STAGALGO RISK DISCLOSURES**

**CRITICAL RISK UNDERSTANDING**
Trading and investing involve substantial risk of loss. You can lose some or all of your invested capital.

**PORTFOLIO MIRRORING RISKS**

**EDUCATIONAL SIMULATION RISKS:**
• Simulated performance may not reflect real market conditions
• Execution prices may differ significantly in live trading
• Market impact and slippage not accurately modeled
• Emotional factors of real money trading cannot be simulated

**DATA AND TECHNICAL RISKS:**
• API connections may fail or provide delayed data
• System downtime could prevent trade monitoring
• Data inaccuracies may lead to poor decisions
• Software bugs could affect analysis quality

**MARKET RISKS**

**VOLATILITY:**
• Stock prices can fluctuate dramatically
• Crypto and forex markets are especially volatile
• Economic events can cause sudden market movements
• Individual stocks can lose substantial value quickly

**LIQUIDITY RISKS:**
• Some securities may be difficult to sell
• Market conditions can affect execution quality
• Gap openings can result in unexpected losses
• After-hours trading carries additional risks

**SYSTEMATIC RISKS:**
• Market-wide crashes can affect all positions
• Economic recession can impact entire sectors
• Interest rate changes affect all asset classes
• Currency fluctuations impact international investments

**LEVERAGE AND MARGIN RISKS**
• Leveraged positions amplify both gains and losses
• Margin calls can force unwanted position closures
• Interest costs reduce overall returns
• Leverage can accelerate account depletion

**AI AND ALGORITHMIC RISKS**

**MODEL LIMITATIONS:**
• AI predictions are based on historical data
• Models may fail in unprecedented market conditions
• Algorithmic biases can lead to poor recommendations
• Machine learning systems can overfit to past patterns

**RECOMMENDATION RISKS:**
• AI suggestions are educational, not guaranteed
• Models cannot predict all market scenarios
• Recommendations may not suit your risk tolerance
• Past AI performance doesn't guarantee future success

**REGULATORY AND COMPLIANCE RISKS**

**REGULATORY CHANGES:**
• Securities laws may change without notice
• New regulations could affect trading strategies
• Pattern Day Trader rules may limit your trading
• Tax implications of trading may be complex

**COMPLIANCE RESPONSIBILITIES:**
• You must comply with all applicable laws
• Reporting requirements may apply to your trading
• Professional advice may be necessary
• Violations can result in penalties or restrictions

**PSYCHOLOGICAL RISKS**

**EMOTIONAL TRADING:**
• Fear and greed can lead to poor decisions
• Overconfidence after wins can increase risk-taking
• Panic selling during losses can lock in losses
• FOMO (fear of missing out) can drive impulsive trades

**ADDICTION AND OVERTRADING:**
• Frequent trading can become compulsive
• Commission costs can erode returns
• Overtrading often leads to poor performance
• Consider setting trading limits and taking breaks

**SPECIFIC ASSET CLASS RISKS**

**EQUITIES:**
• Company-specific risks (earnings, management changes)
• Sector concentration risks
• Small-cap stocks carry higher volatility
• Penny stocks are extremely risky

**OPTIONS:**
• Options can expire worthless
• Complex strategies require deep understanding
• Time decay erodes option values
• Unlimited loss potential with some strategies

**CRYPTOCURRENCY:**
• Extreme volatility and regulatory uncertainty
• Potential for total loss of investment
• Limited regulatory protections
• Technology and security risks

**FOREX:**
• High leverage amplifies risks
• Currency markets operate 24/7
• Economic and political events cause volatility
• Complex factors affect exchange rates

**RISK MANAGEMENT RECOMMENDATIONS**

**DIVERSIFICATION:**
• Don't put all funds in one investment
• Spread risk across different asset classes
• Consider geographic diversification
• Rebalance periodically

**POSITION SIZING:**
• Never risk more than you can afford to lose
• Consider the 1-2% rule for individual trades
• Adjust position sizes based on volatility
• Maintain adequate cash reserves

**EDUCATION AND PREPARATION:**
• Continuously educate yourself about markets
• Understand all investments before buying
• Develop and stick to a trading plan
• Consider professional advice for large amounts

**EMERGENCY PROCEDURES:**
• Know how to exit positions quickly
• Have emergency contact information for your broker
• Understand your broker's risk management procedures
• Keep important account information accessible

**FINAL WARNINGS**
• Never invest money you cannot afford to lose
• Past performance does not guarantee future results
• All investments carry risk of loss
• Consider your personal financial situation carefully
• Seek professional advice when in doubt

By using StagAlgo, you acknowledge understanding these risks and accept full responsibility for your trading decisions.

Last Updated: ${new Date().toLocaleDateString()}
      `
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-6 h-6" />
            Legal Documentation & Compliance
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            {Object.entries(documents).map(([key, doc]) => (
              <TabsTrigger key={key} value={key} className="text-xs">
                <span className="flex items-center gap-1">
                  {doc.icon}
                  {doc.title.split(' ').slice(0, 2).join(' ')}
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {Object.entries(documents).map(([key, doc]) => (
            <TabsContent key={key} value={key} className="mt-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    {doc.icon}
                    {doc.title}
                  </h3>
                  <Badge variant="outline" className="text-xs">
                    Legal Document
                  </Badge>
                </div>

                <ScrollArea className="h-[60vh] w-full rounded-md border p-4 bg-muted/20">
                  <div className="prose prose-sm max-w-none dark:prose-invert">
                    {doc.content.split('\n\n').map((paragraph, index) => {
                      if (paragraph.startsWith('**') && paragraph.endsWith('**')) {
                        return (
                          <h4 key={index} className="font-semibold text-foreground mt-6 mb-3">
                            {paragraph.replace(/\*\*/g, '')}
                          </h4>
                        );
                      }
                      
                      if (paragraph.startsWith('• ')) {
                        const items = paragraph.split('\n').filter(line => line.startsWith('• '));
                        return (
                          <ul key={index} className="list-disc list-inside space-y-1 text-sm">
                            {items.map((item, itemIndex) => (
                              <li key={itemIndex} className="ml-2">
                                {item.replace('• ', '')}
                              </li>
                            ))}
                          </ul>
                        );
                      }

                      if (paragraph.trim()) {
                        const formattedParagraph = paragraph
                          .split('**')
                          .map((part, i) => 
                            i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
                          );

                        return (
                          <p key={index} className="text-sm leading-relaxed mb-3">
                            {formattedParagraph}
                          </p>
                        );
                      }
                      
                      return null;
                    })}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>
          ))}
        </Tabs>

        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            These documents establish the legal framework for StagAlgo's portfolio mirroring model
          </div>
          <Button onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}