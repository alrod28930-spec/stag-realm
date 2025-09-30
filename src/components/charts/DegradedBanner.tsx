/**
 * Banner to show when chart is in degraded mode (using cached data)
 */

import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

interface DegradedBannerProps {
  message?: string;
  onRetry?: () => void;
}

export const DegradedBanner: React.FC<DegradedBannerProps> = ({
  message = 'Using cached data - live feed unavailable',
  onRetry,
}) => {
  return (
    <Alert variant="default" className="mb-2 border-warning/50 bg-warning/10">
      <AlertCircle className="h-4 w-4 text-warning" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-sm text-warning">{message}</span>
        {onRetry && (
          <Button
            variant="outline"
            size="sm"
            onClick={onRetry}
            className="ml-2 text-xs"
          >
            Retry
          </Button>
        )}
      </AlertDescription>
    </Alert>
  );
};
