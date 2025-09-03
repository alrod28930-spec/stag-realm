import { AlertTriangle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useDemoMode } from '@/utils/demoMode';

interface DemoModeIndicatorProps {
  variant?: 'banner' | 'badge' | 'alert';
  className?: string;
}

export function DemoModeIndicator({ variant = 'banner', className = '' }: DemoModeIndicatorProps) {
  const { isDemoMode } = useDemoMode();

  if (!isDemoMode) return null;

  if (variant === 'badge') {
    return (
      <Badge variant="secondary" className={`bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 ${className}`}>
        <AlertTriangle className="w-3 h-3 mr-1" />
        Demo Mode
      </Badge>
    );
  }

  if (variant === 'alert') {
    return (
      <Alert className={`bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-800/30 ${className}`}>
        <Info className="h-4 w-4 text-amber-600 dark:text-amber-400" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          You're using a demonstration account with simulated data. No real trades will be executed.
        </AlertDescription>
      </Alert>
    );
  }

  // Default banner variant
  return (
    <div className={`bg-gradient-to-r from-amber-500/10 to-orange-500/10 border-b border-amber-500/20 px-4 py-2 ${className}`}>
      <div className="flex items-center justify-center space-x-2 text-sm">
        <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
        <span className="text-amber-800 dark:text-amber-200 font-medium">
          Demo Mode Active
        </span>
        <span className="text-amber-700 dark:text-amber-300">
          • All data is simulated • No real trading • For demonstration purposes only
        </span>
      </div>
    </div>
  );
}