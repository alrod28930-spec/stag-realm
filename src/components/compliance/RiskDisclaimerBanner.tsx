// Risk Disclaimer Banner - Shows when safety controls are disabled

import { useState, useEffect } from 'react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Shield, 
  X, 
  RotateCcw,
  Eye,
  DollarSign
} from 'lucide-react';
import { toggleService } from '@/services/toggleService';
import { useToggleService } from '@/hooks/useToggleService';
import { cn } from '@/lib/utils';

export interface RiskDisclaimerBannerProps {
  className?: string;
}

export function RiskDisclaimerBanner({ className }: RiskDisclaimerBannerProps) {
  const { toggleState } = useToggleService();
  const [dismissed, setDismissed] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  // Reset dismissal when risk controls change
  useEffect(() => {
    setDismissed(false);
  }, [
    toggleState.riskGovernorsEnabled,
    toggleState.hardPullEnabled,
    toggleState.softPullEnabled
  ]);

  // Don't show if all critical controls are enabled or user dismissed
  if (dismissed || toggleState.riskGovernorsEnabled) {
    return null;
  }

  const riskStatus = toggleService.getRiskStatus();
  const disabledControls = riskStatus.disabledRiskControls;

  const handleRestore = () => {
    toggleService.resetToSafeDefaults('User restored safety controls from disclaimer banner');
    setDismissed(true);
  };

  const getRiskLevelColor = () => {
    switch (riskStatus.riskLevel) {
      case 'high': return 'bg-red-500/10 border-red-500/20 text-red-300';
      case 'medium': return 'bg-yellow-500/10 border-yellow-500/20 text-yellow-300';
      default: return 'bg-orange-500/10 border-orange-500/20 text-orange-300';
    }
  };

  const getMainMessage = () => {
    if (!toggleState.riskGovernorsEnabled) {
      return {
        title: "⚠️ CRITICAL: Risk Controls Disabled",
        message: "All safety systems are turned off. You are trading without protection against losses.",
        urgency: "critical"
      };
    } else if (disabledControls.length > 2) {
      return {
        title: "⚠️ HIGH RISK: Multiple Safety Controls Disabled", 
        message: "Several risk protection systems are disabled, significantly increasing loss potential.",
        urgency: "high"
      };
    } else {
      return {
        title: "⚠️ RISK WARNING: Safety Controls Reduced",
        message: "Some risk protection features are disabled, which may increase trading risks.",
        urgency: "medium"
      };
    }
  };

  const message = getMainMessage();

  return (
    <Alert className={cn(
      "mb-4 border-2 shadow-lg",
      getRiskLevelColor(),
      message.urgency === 'critical' && "animate-pulse",
      className
    )}>
      <AlertTriangle className="h-5 w-5" />
      <div className="flex-1">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h4 className="font-semibold text-sm mb-1">
              {message.title}
            </h4>
            <AlertDescription className="text-sm mb-3">
              {message.message}
            </AlertDescription>

            {/* Risk Level Badge */}
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="destructive" className="text-xs">
                <DollarSign className="w-3 h-3 mr-1" />
                Risk Level: {riskStatus.riskLevel.toUpperCase()}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {disabledControls.length} Controls Disabled
              </Badge>
            </div>

            {/* Disabled Controls List */}
            {showDetails && disabledControls.length > 0 && (
              <div className="mb-3 p-3 rounded-md bg-background/20 border border-border/30">
                <p className="text-xs font-medium mb-2">Disabled Safety Features:</p>
                <ul className="text-xs space-y-1">
                  {disabledControls.map((control, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-red-500" />
                      {control}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                size="sm" 
                onClick={handleRestore}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <Shield className="w-3 h-3 mr-1" />
                Restore Safety Controls
              </Button>
              
              <Button 
                size="sm" 
                variant="outline"
                onClick={() => setShowDetails(!showDetails)}
                className="text-xs"
              >
                <Eye className="w-3 h-3 mr-1" />
                {showDetails ? 'Hide' : 'Show'} Details
              </Button>

              <Button 
                size="sm" 
                variant="ghost"
                onClick={() => setDismissed(true)}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Dismiss Warning
              </Button>
            </div>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground p-1 h-auto"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Alert>
  );
}

// Floating risk indicator for persistent visibility
export function FloatingRiskIndicator() {
  const { toggleState } = useToggleService();
  
  if (toggleState.riskGovernorsEnabled) {
    return null;
  }

  const riskStatus = toggleService.getRiskStatus();

  return (
    <div className="fixed bottom-4 right-4 z-50 animate-bounce">
      <Badge 
        variant="destructive" 
        className="shadow-lg text-xs px-3 py-1 cursor-pointer"
        onClick={() => {
          // Scroll to top to show the banner
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }}
      >
        <AlertTriangle className="w-3 h-3 mr-1" />
        Risk Controls: {riskStatus.riskLevel.toUpperCase()}
      </Badge>
    </div>
  );
}