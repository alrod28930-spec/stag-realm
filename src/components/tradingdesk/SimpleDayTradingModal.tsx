import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { AlertTriangle } from 'lucide-react';

interface SimpleDayTradingModalProps {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
}

export function SimpleDayTradingModal({ open, onClose, onAccept }: SimpleDayTradingModalProps) {
  return (
    <AlertDialog open={open} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-lg">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-destructive/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-destructive" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">
                Day Trading Risk Acknowledgment
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                High-Risk Trading Mode
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="space-y-4">
          <div className="border-l-4 border-destructive pl-4 space-y-3">
            <p className="font-semibold text-destructive">⚠️ Critical Risk Warning</p>
            <div className="space-y-2 text-sm">
              <p>
                <strong>Intraday trading carries extremely high risk of rapid losses.</strong> 
                Day trading can result in substantial financial losses in very short periods.
              </p>
              <p>
                <strong>Performance targets are goals, not guarantees.</strong> StagAlgo provides 
                educational software only. All trading decisions and outcomes are your sole responsibility.
              </p>
              <p>
                <strong>Orders are mirrored via your brokerage.</strong> StagAlgo never holds, 
                manages, or has access to your funds. You maintain full control of your capital.
              </p>
              <p>
                <strong>Pattern Day Trading (PDT) rules may apply</strong> in your jurisdiction. 
                Ensure you understand and comply with all applicable regulations.
              </p>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              By continuing, you acknowledge these risks and confirm you are solely responsible 
              for all trading outcomes. This is educational software providing targets, not investment advice.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
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