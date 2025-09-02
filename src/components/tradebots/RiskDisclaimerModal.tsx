import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { RiskGoalsSettings } from "@/types/botProfile";

interface RiskDisclaimerModalProps {
  open: boolean;
  settings: RiskGoalsSettings | null;
  riskIndicator: 'low' | 'medium' | 'high';
  onAccept: () => void;
  onCancel: () => void;
}

export function RiskDisclaimerModal({
  open,
  settings,
  riskIndicator,
  onAccept,
  onCancel
}: RiskDisclaimerModalProps) {
  if (!settings) return null;

  const capitalRiskPercent = (settings.capitalRisk * 100).toFixed(0);
  const targetPercent = (settings.dailyTarget * 100).toFixed(0);

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Risk & Automation Confirmation
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              You selected <strong>{riskIndicator} risk</strong>: {capitalRiskPercent}% capital at risk, {targetPercent}% daily return target, mode: {settings.executionMode}.
            </p>
            
            <p>
              These are targets, not guarantees. Trading involves risk, including loss of principal. 
              In Automated mode, orders are placed via your own brokerage; StagAlgo does not hold funds.
            </p>
            
            <p>
              By continuing, you accept that you are responsible for outcomes and that StagAlgo is an educational software tool.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction onClick={onAccept}>
            I Understand & Accept
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}