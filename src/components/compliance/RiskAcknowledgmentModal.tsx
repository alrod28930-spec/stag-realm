import { useState } from 'react';
import { ShieldAlert, AlertTriangle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RiskAcknowledgment } from '@/types/compliance';

interface RiskAcknowledgmentModalProps {
  riskAcknowledgment: RiskAcknowledgment;
  tradeIntent: any;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: () => void;
  onCancel: () => void;
}

export function RiskAcknowledgmentModal({
  riskAcknowledgment,
  tradeIntent,
  isOpen,
  onClose,
  onAcknowledge,
  onCancel
}: RiskAcknowledgmentModalProps) {
  const [confirmationText, setConfirmationText] = useState('');
  const [hasReadRisks, setHasReadRisks] = useState(false);

  const isConfirmationValid = confirmationText.trim().toUpperCase() === riskAcknowledgment.userConfirmation;

  const handleAcknowledge = () => {
    if (isConfirmationValid) {
      onAcknowledge();
      onClose();
      setConfirmationText('');
      setHasReadRisks(false);
    }
  };

  const handleCancel = () => {
    onCancel();
    onClose();
    setConfirmationText('');
    setHasReadRisks(false);
  };

  const getRiskTypeIcon = () => {
    switch (riskAcknowledgment.type) {
      case 'high_volatility':
      case 'large_position':
      case 'leverage':
        return <ShieldAlert className="w-6 h-6 text-red-400" />;
      default:
        return <AlertTriangle className="w-6 h-6 text-orange-400" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-2xl border-red-400/20 bg-red-400/5"
        onEscapeKeyDown={(e) => {
          e.preventDefault(); // Prevent closing on escape for high-risk modals
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getRiskTypeIcon()}
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold text-red-400">
                {riskAcknowledgment.title}
              </DialogTitle>
              <DialogDescription>
                High-risk trading activity requires explicit acknowledgment and confirmation
              </DialogDescription>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="destructive" className="text-xs">
                  HIGH RISK
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {riskAcknowledgment.type.replace('_', ' ').toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Trade Summary */}
          <Alert className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium">Trade Intent Summary:</p>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Symbol:</span>
                    <span className="ml-2 font-mono">{tradeIntent.symbol}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Side:</span>
                    <span className="ml-2 font-mono">{tradeIntent.side?.toUpperCase()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Quantity:</span>
                    <span className="ml-2 font-mono">{tradeIntent.quantity}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Est. Value:</span>
                    <span className="ml-2 font-mono">
                      {formatCurrency((tradeIntent.quantity || 0) * (tradeIntent.price || 0))}
                    </span>
                  </div>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          {/* Risk Description */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Risk Assessment</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {riskAcknowledgment.description}
            </p>
          </div>

          {/* Risk Factors */}
          <div className="space-y-3">
            <h3 className="font-medium text-foreground">Specific Risk Factors</h3>
            <div className="space-y-2">
              {riskAcknowledgment.risks.map((risk, index) => (
                <div key={index} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 bg-red-400 rounded-full mt-2 flex-shrink-0" />
                  <span className="text-sm text-muted-foreground">{risk}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Warnings */}
          <Alert className="border-red-200 bg-red-50 dark:bg-red-950/20">
            <ShieldAlert className="h-4 w-4" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-medium text-red-800 dark:text-red-200">
                  ⚠️ Important Reminders
                </p>
                <ul className="text-sm space-y-1 text-red-700 dark:text-red-300">
                  <li>• You could lose a substantial portion of your investment</li>
                  <li>• This trade intent is a draft - you control final execution</li>
                  <li>• StagAlgo does not provide financial advice</li>
                  <li>• Consider consulting a financial advisor for large positions</li>
                </ul>
              </div>
            </AlertDescription>
          </Alert>

          {/* Confirmation Input */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              To proceed, type "{riskAcknowledgment.userConfirmation}" in the box below:
            </Label>
            <Input
              value={confirmationText}
              onChange={(e) => setConfirmationText(e.target.value)}
              placeholder={riskAcknowledgment.userConfirmation}
              className="font-mono"
              autoFocus
            />
            {confirmationText && !isConfirmationValid && (
              <p className="text-xs text-red-400">
                Text must match exactly: {riskAcknowledgment.userConfirmation}
              </p>
            )}
          </div>
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              Risk Level: HIGH • Trade Value: {formatCurrency((tradeIntent.quantity || 0) * (tradeIntent.price || 0))}
            </div>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleCancel}>
                Cancel Trade
              </Button>
              <Button 
                onClick={handleAcknowledge}
                disabled={!isConfirmationValid}
                variant="destructive"
                className="min-w-32"
              >
                {isConfirmationValid ? 'Accept Risk & Proceed' : 'Type Confirmation'}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}