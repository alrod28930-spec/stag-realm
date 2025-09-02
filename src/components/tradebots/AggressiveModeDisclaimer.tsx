import React from "react";
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
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Target, Zap } from "lucide-react";
import { DailyTargetMode } from "@/types/botProfile";
import { STRATEGY_ELIGIBILITY } from "@/types/strategyLibrary";

interface AggressiveModeDisclaimerProps {
  open: boolean;
  mode: DailyTargetMode;
  onAccept: () => void;
  onCancel: () => void;
}

export function AggressiveModeDisclaimer({ 
  open, 
  mode, 
  onAccept, 
  onCancel 
}: AggressiveModeDisclaimerProps) {
  const eligibility = STRATEGY_ELIGIBILITY[mode];
  const isVeryAggressive = mode === '10p';
  const isAggressive = mode === '5p' || mode === '10p';

  if (!isAggressive) return null;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="sm:max-w-lg">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              {isVeryAggressive ? (
                <Zap className="w-5 h-5 text-red-500" />
              ) : (
                <Target className="w-5 h-5 text-amber-500" />
              )}
              <span>
                {isVeryAggressive ? 'Very Aggressive' : 'Aggressive'} Mode Disclaimer
              </span>
            </div>
          </AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-4">
              <div className="flex items-center space-x-2">
                <Badge variant={isVeryAggressive ? "destructive" : "secondary"} className="text-xs">
                  {mode.replace('p', '%')} Daily Target
                </Badge>
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                <span className="text-sm font-medium">Higher Risk Profile</span>
              </div>

              <div className="space-y-3 text-sm">
                <p>
                  You are about to enable <strong>{mode.replace('p', '%')} daily target mode</strong>, 
                  which uses aggressive trading parameters and strategies.
                </p>

                <div className="space-y-2">
                  <p className="font-medium">This mode includes:</p>
                  <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-4">
                    <li>Higher frequency trading (up to {mode === '10p' ? '12' : '8'} trades/day)</li>
                    <li>Tighter stop losses and risk management</li>
                    <li>Advanced strategy playbooks</li>
                    {eligibility.allow_niche_edges && (
                      <li>Access to experimental "niche edge" strategies</li>
                    )}
                    {isVeryAggressive && (
                      <li>Requires Overseer approval for niche edges</li>
                    )}
                  </ul>
                </div>

                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <p className="font-medium text-foreground">Important Disclaimers:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs text-muted-foreground ml-2">
                    <li><strong>Targets are goals, not guarantees.</strong> Results depend on market conditions.</li>
                    <li><strong>Higher frequency = higher costs.</strong> More trades mean more commissions and potential slippage.</li>
                    <li><strong>Automation mirrors orders via your brokerage.</strong> StagAlgo never holds your funds.</li>
                    <li><strong>Oversight protection:</strong> Algorithmic risk controls can halt trading if limits are breached.</li>
                    <li><strong>Educational purpose:</strong> This platform is for educational and research purposes.</li>
                  </ul>
                </div>

                <p className="text-xs text-muted-foreground">
                  By proceeding, you acknowledge the increased risk profile and agree that you understand 
                  the aggressive nature of this trading mode.
                </p>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction 
            onClick={onAccept}
            className={isVeryAggressive ? "bg-red-600 hover:bg-red-700" : "bg-amber-600 hover:bg-amber-700"}
          >
            I Understand & Accept
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}