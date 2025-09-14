import React from 'react';
import { Link } from 'react-router-dom';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Crown, ArrowRight } from 'lucide-react';
import { useSubscriptionAccess } from '@/hooks/useSubscriptionAccess';

const DemoModeBanner: React.FC = () => {
  const { subscriptionStatus } = useSubscriptionAccess();

  if (!subscriptionStatus.isDemo) {
    return null;
  }

  return (
    <Alert className="border-warning bg-warning/10 text-warning-foreground mb-4">
      <Crown className="h-4 w-4" />
      <AlertDescription className="flex items-center justify-between">
        <span className="font-medium">
          Demo Mode: Upgrade to unlock live trading, real-time data, and bot execution.
        </span>
        <Button 
          asChild 
          size="sm" 
          variant="outline"
          className="ml-4 border-warning text-warning hover:bg-warning hover:text-warning-foreground"
        >
          <Link to="/subscription" className="flex items-center gap-1">
            Upgrade Now
            <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
};

export default DemoModeBanner;