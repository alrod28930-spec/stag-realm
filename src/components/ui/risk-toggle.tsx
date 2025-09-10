import React, { useState } from 'react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Shield, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
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

export interface RiskToggleProps {
  id: string;
  label: string;
  description: string;
  enabled: boolean;
  onChange: (enabled: boolean) => void;
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
  requiresConfirmation?: boolean;
  disabled?: boolean;
  className?: string;
}

export function RiskToggle({
  id,
  label,
  description,
  enabled,
  onChange,
  riskLevel = 'medium',
  requiresConfirmation = false,
  disabled = false,
  className
}: RiskToggleProps) {
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingValue, setPendingValue] = useState<boolean | null>(null);
  const getRiskColor = () => {
    switch (riskLevel) {
      case 'low': return 'text-green-400 border-green-500/30';
      case 'medium': return 'text-yellow-400 border-yellow-500/30';
      case 'high': return 'text-orange-400 border-orange-500/30';
      case 'critical': return 'text-red-400 border-red-500/30';
      default: return 'text-muted-foreground border-border';
    }
  };

  const getRiskIcon = () => {
    switch (riskLevel) {
      case 'low': return <Shield className="w-3 h-3" />;
      case 'medium': return <Info className="w-3 h-3" />;
      case 'high':
      case 'critical': return <AlertTriangle className="w-3 h-3" />;
      default: return <Info className="w-3 h-3" />;
    }
  };

  const handleToggle = (checked: boolean) => {
    console.log(`RiskToggle.handleToggle: ${label} - current=${enabled}, new=${checked}, requiresConfirmation=${requiresConfirmation}`);
    
    // Prevent unnecessary re-renders and calls
    if (checked === enabled) {
      console.log(`RiskToggle.handleToggle: ${label} - no change needed, returning early`);
      return;
    }
    
    // Enhanced confirmation logic with in-app dialog
    if (requiresConfirmation) {
      setPendingValue(checked);
      setShowConfirmDialog(true);
      return;
    }
    
    // Direct toggle without confirmation
    executeToggle(checked);
  };

  const executeToggle = (checked: boolean) => {
    try {
      console.log(`Toggle ${label}: calling onChange with ${checked}`);
      onChange(checked);
      console.log(`Toggle ${label}: onChange completed`);
    } catch (error) {
      console.error(`Toggle ${label}: Error in onChange handler:`, error);
    }
  };

  const handleConfirm = () => {
    if (pendingValue !== null) {
      executeToggle(pendingValue);
    }
    setShowConfirmDialog(false);
    setPendingValue(null);
  };

  const handleCancel = () => {
    console.log(`Toggle ${label}: confirmation cancelled`);
    setShowConfirmDialog(false);
    setPendingValue(null);
  };

  return (
    <>
      <div className={cn(
        "flex items-center justify-between p-4 rounded-lg border bg-gradient-card",
        className
      )}>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <label htmlFor={id} className="text-sm font-medium cursor-pointer">
              {label}
            </label>
            <Badge variant="outline" className={cn("text-xs", getRiskColor())}>
              {getRiskIcon()}
              <span className="ml-1 capitalize">{riskLevel}</span>
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {description}
          </p>
          <div className="text-xs">
            <span className={cn(
              "inline-flex items-center gap-1 px-2 py-1 rounded text-xs",
              enabled 
                ? "bg-accent/20 text-accent border border-accent/30" 
                : "bg-muted text-muted-foreground"
            )}>
              {enabled ? 'Enforced' : 'Monitor Only'}
            </span>
          </div>
        </div>
        <Switch
          id={id}
          checked={enabled}
          onCheckedChange={handleToggle}
          disabled={disabled}
        />
      </div>

      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              {getRiskIcon()}
              {pendingValue ? 'Enable' : 'Disable'} {label}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingValue 
                ? `This may increase trading risk and expose you to potential losses.`
                : `This will reduce safety controls and may increase your risk exposure.`
              }
              <br /><br />
              Only proceed if you understand the implications.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleCancel}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirm}>
              {pendingValue ? 'Enable' : 'Disable'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}