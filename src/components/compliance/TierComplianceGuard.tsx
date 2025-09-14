import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, Shield, Scale } from 'lucide-react';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';

interface TierComplianceGuardProps {
  children: React.ReactNode;
  requiresLiveTrading?: boolean;
}

const TierComplianceGuard: React.FC<TierComplianceGuardProps> = ({ 
  children, 
  requiresLiveTrading = false 
}) => {
  const { subscriptionStatus } = useSubscriptionAccess();
  const { user } = useAuthStore();
  const [showComplianceModal, setShowComplianceModal] = useState(false);
  const [acceptedRisk, setAcceptedRisk] = useState(false);
  const [acceptedKYC, setAcceptedKYC] = useState(false);
  const [acceptedDisclaimer, setAcceptedDisclaimer] = useState(false);
  const [hasAcknowledged, setHasAcknowledged] = useState(false);

  useEffect(() => {
    const checkComplianceStatus = async () => {
      if (!user || subscriptionStatus.isDemo || !requiresLiveTrading) {
        return;
      }

      // Only Pro and Elite tiers need compliance acknowledgment for live trading
      if (subscriptionStatus.tier !== 'pro' && subscriptionStatus.tier !== 'elite') {
        return;
      }

      try {
        const { data } = await supabase
          .from('compliance_acknowledgments')
          .select('id')
          .eq('user_id', user.id)
          .eq('document_type', 'live_trading_risk')
          .maybeSingle();

        if (!data) {
          setShowComplianceModal(true);
        } else {
          setHasAcknowledged(true);
        }
      } catch (error) {
        console.error('Error checking compliance status:', error);
      }
    };

    checkComplianceStatus();
  }, [user, subscriptionStatus, requiresLiveTrading]);

  const handleAcceptCompliance = async () => {
    if (!acceptedRisk || !acceptedKYC || !acceptedDisclaimer || !user) return;

    try {
      await supabase
        .from('compliance_acknowledgments')
        .insert({
          user_id: user.id,
          workspace_id: user.organizationId,
          document_type: 'live_trading_risk',
          version: '1.0',
        });

      setHasAcknowledged(true);
      setShowComplianceModal(false);
    } catch (error) {
      console.error('Error saving compliance acknowledgment:', error);
    }
  };

  // Show demo disclaimer for demo users
  if (subscriptionStatus.isDemo && requiresLiveTrading) {
    return (
      <div className="space-y-4">
        <Alert className="border-warning bg-warning/10">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>Demo Mode:</strong> This is demo-only data. No real trades are being placed.
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  // Show educational disclaimer for Standard tier
  if (subscriptionStatus.tier === 'standard' && requiresLiveTrading) {
    return (
      <div className="space-y-4">
        <Alert className="border-blue-500 bg-blue-50">
          <Scale className="h-4 w-4" />
          <AlertDescription>
            <strong>Educational Use Only:</strong> Standard tier provides analysis and insights for educational purposes. Live trading requires Pro or Elite subscription.
          </AlertDescription>
        </Alert>
        {children}
      </div>
    );
  }

  return (
    <>
      {children}
      
      <Dialog open={showComplianceModal} onOpenChange={setShowComplianceModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Risk Acknowledgment Required
            </DialogTitle>
            <DialogDescription>
              Before accessing live trading features, you must acknowledge the following risks and compliance requirements.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-6">
            <Alert className="border-red-500 bg-red-50">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Important:</strong> Trading involves substantial risk of loss and is not suitable for all investors.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="risk-acknowledgment" 
                  checked={acceptedRisk}
                  onCheckedChange={(checked) => setAcceptedRisk(checked === true)}
                />
                <label htmlFor="risk-acknowledgment" className="text-sm leading-6">
                  I acknowledge that trading involves substantial risk of loss and that I may lose all or part of my investment. I understand that past performance is not indicative of future results.
                </label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="kyc-acknowledgment" 
                  checked={acceptedKYC}
                  onCheckedChange={(checked) => setAcceptedKYC(checked === true)}
                />
                <label htmlFor="kyc-acknowledgment" className="text-sm leading-6">
                  I confirm that I have provided accurate information about my financial situation and investment experience, and I understand my responsibility to keep this information current.
                </label>
              </div>

              <div className="flex items-start space-x-2">
                <Checkbox 
                  id="disclaimer-acknowledgment" 
                  checked={acceptedDisclaimer}
                  onCheckedChange={(checked) => setAcceptedDisclaimer(checked === true)}
                />
                <label htmlFor="disclaimer-acknowledgment" className="text-sm leading-6">
                  I understand that StagAlgo provides analytical tools and does not provide investment advice. I am solely responsible for my trading decisions and their consequences.
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowComplianceModal(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleAcceptCompliance}
                disabled={!acceptedRisk || !acceptedKYC || !acceptedDisclaimer}
              >
                I Accept and Understand
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default TierComplianceGuard;