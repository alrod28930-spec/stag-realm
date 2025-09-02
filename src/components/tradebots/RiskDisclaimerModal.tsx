import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { RiskGoalsSettings } from "@/types/botProfile";
import { TARGET_MODE_PRESETS } from "@/services/botProfile";

interface RiskDisclaimerModalProps {
  open: boolean;
  settings: RiskGoalsSettings;
  riskIndicator: 'low' | 'medium' | 'high';
  onAccept: () => void;
  onCancel: () => void;
}

export function RiskDisclaimerModal({ open, settings, riskIndicator, onAccept, onCancel }: RiskDisclaimerModalProps) {
  const modePreset = TARGET_MODE_PRESETS[settings.dailyTargetMode];
  
  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Risk & Automation Confirmation
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              You selected <Badge variant="outline" className="mx-1">{riskIndicator} risk</Badge>: 
              {(settings.capitalRisk * 100).toFixed(0)}% capital at risk, 
              {settings.dailyTargetMode.replace('p', '%')} daily target ({modePreset.name}), 
              mode: <span className="font-medium">{settings.executionMode}</span>.
            </p>
            <p>
              These are targets, not guarantees. Trading involves risk, including loss of principal. 
              In Automated mode, orders are placed via your own brokerage; StagAlgo does not hold funds.
            </p>
            <p>
              By continuing, you accept that you are responsible for outcomes and that StagAlgo 
              is an educational software tool.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onAccept}>I Understand &amp; Accept</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}