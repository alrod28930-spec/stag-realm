import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Bot, 
  DollarSign, 
  AlertTriangle, 
  CheckCircle,
  TrendingUp,
  ArrowDown,
  Info
} from 'lucide-react';
import type { BotTemplate } from '@/services/botTemplates';

interface BotTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: BotTemplate;
  onConfirm: (template: BotTemplate, customAllocation?: number) => void;
}

export function BotTemplateModal({ isOpen, onClose, template, onConfirm }: BotTemplateModalProps) {
  const [allocation, setAllocation] = useState(template.default_config.allocation.toString());
  const [isValid, setIsValid] = useState(true);

  const handleAllocationChange = (value: string) => {
    setAllocation(value);
    const numValue = parseFloat(value);
    setIsValid(numValue >= 100 && numValue <= 50000);
  };

  const handleConfirm = () => {
    const allocationAmount = parseFloat(allocation);
    if (isValid && allocationAmount >= 100) {
      onConfirm(template, allocationAmount);
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'low': return 'text-green-600 bg-green-50/50 border-green-200';
      case 'medium': return 'text-amber-600 bg-amber-50/50 border-amber-200';
      case 'high': return 'text-destructive bg-destructive/10 border-destructive/20';
      default: return 'text-muted-foreground bg-muted border-border';
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh]">
        <AlertDialogHeader>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <AlertDialogTitle className="text-left flex items-center gap-2">
                Deploy {template.name}
                <Badge variant="outline" className={`text-xs ${getRiskColor(template.risk_level)}`}>
                  {template.risk_level} risk
                </Badge>
              </AlertDialogTitle>
              <AlertDialogDescription className="text-left">
                {template.description}
              </AlertDialogDescription>
            </div>
          </div>
        </AlertDialogHeader>
        
        <ScrollArea className="max-h-[50vh] pr-4">
          <div className="space-y-6">
            {/* Allocation Settings */}
            <div className="space-y-3">
              <Label htmlFor="allocation" className="text-base font-semibold flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Capital Allocation
              </Label>
              <Input
                id="allocation"
                type="number"
                min="100"
                max="50000"
                step="100"
                value={allocation}
                onChange={(e) => handleAllocationChange(e.target.value)}
                className={!isValid ? "border-red-500" : ""}
              />
              {!isValid && (
                <p className="text-sm text-red-600">Allocation must be between $100 and $50,000</p>
              )}
              <p className="text-sm text-muted-foreground">
                Recommended: ${template.default_config.allocation.toLocaleString()} 
                (can be adjusted after deployment)
              </p>
            </div>

            <Separator />

            {/* Strategy Details */}
            <div className="space-y-4">
              <h4 className="font-semibold flex items-center gap-2">
                <Info className="w-4 h-4" />
                Strategy Overview
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h5 className="text-sm font-semibold mb-2 flex items-center gap-1 text-green-600">
                    <TrendingUp className="w-3 h-3" />
                    Entry Conditions
                  </h5>
                  <ul className="text-sm space-y-1">
                    {template.entry_rules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h5 className="text-sm font-semibold mb-2 flex items-center gap-1 text-red-600">
                    <ArrowDown className="w-3 h-3" />
                    Exit Conditions
                  </h5>
                  <ul className="text-sm space-y-1">
                    {template.exit_rules.map((rule, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />
                        <span className="text-muted-foreground">{rule}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>

            <Separator />

            {/* Risk Parameters */}
            <div className="space-y-3">
              <h4 className="font-semibold">Risk Management</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Max Daily Trades:</span>
                    <span className="font-semibold">{template.trade_limits.max_trades_per_day}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stop Loss:</span>
                    <span className="font-semibold text-red-600">-{template.trade_limits.stop_loss_pct}%</span>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Risk per Trade:</span>
                    <span className="font-semibold">{template.trade_limits.risk_per_trade_pct}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Take Profit:</span>
                    <span className="font-semibold text-green-600">+{template.trade_limits.take_profit_pct}%</span>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Educational Notes */}
            {template.educational_notes.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-semibold">Important Notes</h4>
                <ul className="text-sm space-y-2">
                  {template.educational_notes.map((note, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <Info className="w-3 h-3 text-blue-500 mt-0.5 flex-shrink-0" />
                      <span className="text-muted-foreground">{note}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Risk Warning */}
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
                    Automated Trading Risk Disclosure
                  </p>
                  <ul className="text-amber-700 dark:text-amber-300 space-y-1 text-xs">
                    <li>• This bot will execute trades automatically based on market conditions</li>
                    <li>• All trades are subject to market risk and may result in losses</li>
                    <li>• Past performance does not guarantee future results</li>
                    <li>• You can stop the bot at any time from the Trade Bots dashboard</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <AlertDialogFooter>
          <AlertDialogCancel onClick={onClose}>
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isValid}
            className="bg-blue-600 hover:bg-blue-700"
          >
            Deploy Bot with ${parseFloat(allocation || '0').toLocaleString()}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}