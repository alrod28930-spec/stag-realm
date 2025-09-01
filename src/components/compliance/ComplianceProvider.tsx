import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { DisclaimerModal } from './DisclaimerModal';
import { RiskAcknowledgmentModal } from './RiskAcknowledgmentModal';
import { complianceService } from '@/services/compliance';
import { eventBus } from '@/services/eventBus';
import { DisclaimerType, RiskAcknowledgment } from '@/types/compliance';

interface ComplianceContextType {
  showDisclaimer: (component: string, action?: string, context?: any) => void;
  checkAccess: (component: string, action?: string) => Promise<boolean>;
}

const ComplianceContext = createContext<ComplianceContextType | null>(null);

export function useCompliance() {
  const context = useContext(ComplianceContext);
  if (!context) {
    throw new Error('useCompliance must be used within a ComplianceProvider');
  }
  return context;
}

interface ComplianceProviderProps {
  children: ReactNode;
}

export function ComplianceProvider({ children }: ComplianceProviderProps) {
  const [currentDisclaimer, setCurrentDisclaimer] = useState<{
    disclaimer: DisclaimerType;
    context: any;
    eventId: string;
  } | null>(null);

  const [currentRiskAck, setCurrentRiskAck] = useState<{
    riskAcknowledgment: RiskAcknowledgment;
    tradeIntent: any;
  } | null>(null);

  useEffect(() => {
    // Listen for disclaimer show events
    const handleDisclaimerShow = (data: {
      disclaimer: DisclaimerType;
      context: any;
      eventId: string;
    }) => {
      setCurrentDisclaimer(data);
    };

    // Listen for risk acknowledgment events
    const handleRiskAcknowledgment = (data: {
      riskAcknowledgment: RiskAcknowledgment;
      tradeIntent: any;
    }) => {
      setCurrentRiskAck(data);
    };

    eventBus.on('compliance.disclaimer_show', handleDisclaimerShow);
    eventBus.on('compliance.risk_acknowledgment_required', handleRiskAcknowledgment);

    return () => {
      eventBus.off('compliance.disclaimer_show', handleDisclaimerShow);
      eventBus.off('compliance.risk_acknowledgment_required', handleRiskAcknowledgment);
    };
  }, []);

  const showDisclaimer = async (component: string, action?: string, context?: any) => {
    // Emit component access event for compliance service to handle
    eventBus.emit('component.accessed', { component, action, context });
  };

  const checkAccess = async (component: string, action?: string): Promise<boolean> => {
    // For now, always allow access but trigger disclaimers
    await showDisclaimer(component, action);
    return true;
  };

  const handleDisclaimerAcknowledge = () => {
    if (currentDisclaimer) {
      complianceService.acknowledgeDisclaimer(
        currentDisclaimer.disclaimer.id,
        currentDisclaimer.eventId,
        currentDisclaimer.context
      );
      setCurrentDisclaimer(null);
    }
  };

  const handleDisclaimerClose = () => {
    setCurrentDisclaimer(null);
  };

  const handleRiskAcknowledge = () => {
    if (currentRiskAck) {
      // Mark risk as acknowledged and proceed with trade intent
      eventBus.emit('trade.intent.risk_acknowledged', {
        riskAcknowledgment: currentRiskAck.riskAcknowledgment,
        tradeIntent: currentRiskAck.tradeIntent
      });
      setCurrentRiskAck(null);
    }
  };

  const handleRiskCancel = () => {
    if (currentRiskAck) {
      // Cancel the trade intent
      eventBus.emit('trade.intent.cancelled', {
        tradeIntent: currentRiskAck.tradeIntent,
        reason: 'Risk acknowledgment declined'
      });
      setCurrentRiskAck(null);
    }
  };

  const handleRiskClose = () => {
    setCurrentRiskAck(null);
  };

  return (
    <ComplianceContext.Provider value={{ showDisclaimer, checkAccess }}>
      {children}
      
      {/* Disclaimer Modal */}
      {currentDisclaimer && (
        <DisclaimerModal
          disclaimer={currentDisclaimer.disclaimer}
          isOpen={true}
          onClose={handleDisclaimerClose}
          onAcknowledge={handleDisclaimerAcknowledge}
          eventId={currentDisclaimer.eventId}
          context={currentDisclaimer.context}
        />
      )}

      {/* Risk Acknowledgment Modal */}
      {currentRiskAck && (
        <RiskAcknowledgmentModal
          riskAcknowledgment={currentRiskAck.riskAcknowledgment}
          tradeIntent={currentRiskAck.tradeIntent}
          isOpen={true}
          onClose={handleRiskClose}
          onAcknowledge={handleRiskAcknowledge}
          onCancel={handleRiskCancel}
        />
      )}
    </ComplianceContext.Provider>
  );
}