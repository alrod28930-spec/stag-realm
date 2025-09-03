import { AlertTriangle, Shield, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useDemoMode } from '@/utils/demoMode';

interface DemoDisclaimerProps {
  feature?: string;
  className?: string;
}

export function DemoDisclaimer({ feature = 'feature', className = '' }: DemoDisclaimerProps) {
  const { isDemoMode } = useDemoMode();

  if (!isDemoMode) return null;

  return (
    <Card className={`bg-gradient-to-br from-amber-50/50 to-orange-50/30 border-amber-200/50 dark:from-amber-950/20 dark:to-orange-950/10 dark:border-amber-800/30 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center space-x-2 text-amber-800 dark:text-amber-200">
          <Shield className="w-5 h-5" />
          <span>Demo Environment</span>
        </CardTitle>
        <CardDescription className="text-amber-700 dark:text-amber-300">
          This {feature} is running in demonstration mode
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Alert className="bg-amber-100/50 border-amber-300/50 dark:bg-amber-900/20 dark:border-amber-700/30">
          <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <strong>Important:</strong> All data shown is simulated and for demonstration purposes only.
          </AlertDescription>
        </Alert>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
          <div className="flex items-start space-x-2">
            <TrendingUp className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <div className="font-medium text-amber-800 dark:text-amber-200">No Real Trading</div>
              <div className="text-amber-700 dark:text-amber-300">All trades are simulated</div>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <Shield className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <div className="font-medium text-amber-800 dark:text-amber-200">Mock Data</div>
              <div className="text-amber-700 dark:text-amber-300">Fictional portfolio & signals</div>
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5" />
            <div>
              <div className="font-medium text-amber-800 dark:text-amber-200">No Guarantees</div>
              <div className="text-amber-700 dark:text-amber-300">Not investment advice</div>
            </div>
          </div>
        </div>

        <div className="pt-2 border-t border-amber-200/50 dark:border-amber-700/30">
          <p className="text-xs text-amber-600 dark:text-amber-400">
            This demonstration does not constitute investment advice or a recommendation to buy or sell securities. 
            Past performance does not guarantee future results. All investments carry risk of loss.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}