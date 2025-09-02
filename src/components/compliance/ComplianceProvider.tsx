import { useState, useEffect, createContext, useContext, ReactNode } from 'react';
import { DisclaimerModal } from './DisclaimerModal';
import { RiskAcknowledgmentModal } from './RiskAcknowledgmentModal';
import { DisclaimerType, RiskAcknowledgment } from '@/types/compliance';

// Import services asynchronously to avoid circular dependencies
let complianceService: any;
let eventBus: any;

// Lazy load services
const loadServices = async () => {
  if (!complianceService) {
    const { complianceService: service } = await import('@/services/compliance');
    complianceService = service;
  }
  if (!eventBus) {
    const { eventBus: bus } = await import('@/services/eventBus');
    eventBus = bus;
  }
  return { complianceService, eventBus };
};

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
    let mounted = true;
    
    const initializeServices = async () => {
      try {
        const { complianceService: service, eventBus: bus } = await loadServices();
        
        if (!mounted) return;
        
        // Listen for disclaimer show events
        const handleDisclaimerShow = (data: {
          disclaimer: DisclaimerType;
          context: any;
          eventId: string;
        }) => {
          if (mounted) {
            setCurrentDisclaimer(data);
          }
        };

        // Listen for risk acknowledgment events
        const handleRiskAcknowledgment = (data: {
          riskAcknowledgment: RiskAcknowledgment;
          tradeIntent: any;
        }) => {
          if (mounted) {
            setCurrentRiskAck(data);
          }
        };

        bus.on('compliance.disclaimer_show', handleDisclaimerShow);
        bus.on('compliance.risk_acknowledgment_required', handleRiskAcknowledgment);

        // Cleanup function
        return () => {
          bus.off('compliance.disclaimer_show', handleDisclaimerShow);
          bus.off('compliance.risk_acknowledgment_required', handleRiskAcknowledgment);
        };
      } catch (error) {
        console.error('Failed to initialize compliance services:', error);
      }
    };

    const cleanup = initializeServices();

    return () => {
      mounted = false;
      cleanup?.then(cleanupFn => cleanupFn?.());
    };
  }, []);

  const showDisclaimer = async (component: string, action?: string, context?: any) => {
    try {
      const { eventBus: bus } = await loadServices();
      // Emit component access event for compliance service to handle
      bus.emit('component.accessed', { component, action, context });
    } catch (error) {
      console.error('Failed to show disclaimer:', error);
    }
  };

  const checkAccess = async (component: string, action?: string): Promise<boolean> => {
    try {
      // For now, always allow access but trigger disclaimers
      await showDisclaimer(component, action);
      return true;
    } catch (error) {
      console.error('Failed to check access:', error);
      return true;
    }
  };

  const handleDisclaimerAcknowledge = async () => {
    if (currentDisclaimer) {
      try {
        const { complianceService: service } = await loadServices();
        service.acknowledgeDisclaimer(
          currentDisclaimer.disclaimer.id,
          currentDisclaimer.eventId,
          currentDisclaimer.context
        );
        setCurrentDisclaimer(null);
      } catch (error) {
        console.error('Failed to acknowledge disclaimer:', error);
        setCurrentDisclaimer(null);
      }
    }
  };

  const handleDisclaimerClose = async () => {
    if (currentDisclaimer && !currentDisclaimer.disclaimer.requiresAcknowledgment) {
      try {
        const { complianceService: service } = await loadServices();
        // For non-acknowledgment disclaimers, still track them as "acknowledged" to prevent re-showing
        service.acknowledgeDisclaimer(
          currentDisclaimer.disclaimer.id,
          currentDisclaimer.eventId,
          currentDisclaimer.context
        );
      } catch (error) {
        console.error('Failed to acknowledge disclaimer on close:', error);
      }
    }
    setCurrentDisclaimer(null);
  };

  const handleRiskAcknowledge = async () => {
    if (currentRiskAck) {
      try {
        const { eventBus: bus } = await loadServices();
        // Mark risk as acknowledged and proceed with trade intent
        bus.emit('trade.intent.risk_acknowledged', {
          riskAcknowledgment: currentRiskAck.riskAcknowledgment,
          tradeIntent: currentRiskAck.tradeIntent
        });
        setCurrentRiskAck(null);
      } catch (error) {
        console.error('Failed to acknowledge risk:', error);
        setCurrentRiskAck(null);
      }
    }
  };

  const handleRiskCancel = async () => {
    if (currentRiskAck) {
      try {
        const { eventBus: bus } = await loadServices();
        // Cancel the trade intent
        bus.emit('trade.intent.cancelled', {
          tradeIntent: currentRiskAck.tradeIntent,
          reason: 'Risk acknowledgment declined'
        });
        setCurrentRiskAck(null);
      } catch (error) {
        console.error('Failed to cancel risk:', error);
        setCurrentRiskAck(null);
      }
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