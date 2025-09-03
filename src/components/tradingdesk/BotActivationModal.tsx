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

interface BotActivationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  botName: string;
}

export function BotActivationModal({ isOpen, onClose, onConfirm }: BotActivationModalProps) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-6 h-6 text-amber-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-left">
                Activate Automated Trading
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                Important Risk Disclosure
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 bg-muted/50 rounded-lg space-y-3">
            <div className="space-y-2">
              <p className="text-sm font-medium">Before activating automated trading:</p>
              <ul className="text-sm text-muted-foreground space-y-1 ml-4">
                <li>• Automated trading carries substantial risk of loss</li>
                <li>• Performance targets are educational goals, not guarantees</li>
                <li>• All orders are mirrored via your connected brokerage account</li>
                <li>• StagAlgo never holds, manages, or controls your funds</li>
                <li>• You remain fully responsible for all trading outcomes</li>
              </ul>
            </div>
          </div>

          <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-md border border-amber-200 dark:border-amber-800">
            <p className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Educational Software Only:</strong> StagAlgo functions as trading assistance 
              software that mirrors your decisions to your brokerage. It does not provide financial 
              advice or guarantee any outcomes.
            </p>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-accent hover:bg-accent/90"
          >
            I Understand & Activate Bot
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}