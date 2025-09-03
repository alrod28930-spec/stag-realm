import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { AlertTriangle } from "lucide-react";
import { IntradaySettings } from "@/types/intraday";

interface DayTradingRiskDisclaimerProps {
  open: boolean;
  settings: IntradaySettings;
  onAccept: () => void;
  onCancel: () => void;
}

export function DayTradingRiskDisclaimer({ open, settings, onAccept, onCancel }: DayTradingRiskDisclaimerProps) {
  return (
    <AlertDialog open={open} onOpenChange={onCancel}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 text-destructive" />
            <AlertDialogTitle className="text-xl">Day Trading Risk Acknowledgment</AlertDialogTitle>
          </div>
          <AlertDialogDescription className="text-left space-y-4">
            <p className="text-base font-medium">
              You are enabling Day Trading Mode with the following settings:
            </p>
            
            <div className="bg-muted/50 p-4 rounded-lg space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Max Trades per Day:</span>
                <span className="font-medium">{settings.intraday_max_trades}</span>
              </div>
              <div className="flex justify-between">
                <span>Trading Window:</span>
                <span className="font-medium">{settings.intraday_time_window}</span>
              </div>
              <div className="flex justify-between">
                <span>Stop Style:</span>
                <span className="font-medium capitalize">{settings.intraday_stop_style.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span>Min Risk/Reward:</span>
                <span className="font-medium">1:{settings.intraday_rr_min}</span>
              </div>
              <div className="flex justify-between">
                <span>Min Liquidity:</span>
                <span className="font-medium">${(settings.intraday_min_volume_usd / 1000000).toFixed(1)}M USD</span>
              </div>
            </div>

            <div className="border-l-4 border-destructive pl-4 space-y-2">
              <p className="font-semibold text-destructive">⚠️ Critical Risk Warning</p>
              <p className="text-sm">
                <strong>Intraday trading carries extremely high risk of rapid losses.</strong> Day trading 
                can result in substantial financial losses in very short periods. Most day traders lose money.
              </p>
              <p className="text-sm">
                <strong>These are targets and aims, not guarantees.</strong> StagAlgo provides educational 
                software only. All trading decisions and outcomes are your sole responsibility.
              </p>
              <p className="text-sm">
                <strong>Orders are mirrored via your brokerage connection.</strong> StagAlgo never holds, 
                manages, or has access to your funds. You maintain full control of your capital.
              </p>
              <p className="text-sm">
                <strong>Pattern Day Trading (PDT) rules may apply</strong> in your jurisdiction. Ensure 
                you understand and comply with all applicable regulations.
              </p>
            </div>

            <p className="text-sm font-medium">
              By continuing, you acknowledge these risks and confirm you are solely responsible 
              for all trading outcomes. You understand this is educational software providing 
              targets and suggestions, not investment advice or guaranteed returns.
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onAccept}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            I Understand & Accept All Risks
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}