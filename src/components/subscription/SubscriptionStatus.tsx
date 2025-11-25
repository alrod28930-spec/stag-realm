import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, CheckCircle, Clock, XCircle, Zap } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface SubscriptionStatusProps {
  planCode?: string | null;
  status?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean;
  workspaceName?: string;
  isDemoMode?: boolean;
  onSubscribe?: () => void;
}

const getStatusIcon = (status: string | null) => {
  switch (status) {
    case 'active': return <CheckCircle className="h-4 w-4 text-success" />;
    case 'trialing': return <Clock className="h-4 w-4 text-info" />;
    case 'past_due': return <AlertCircle className="h-4 w-4 text-warning" />;
    case 'canceled': return <XCircle className="h-4 w-4 text-destructive" />;
    default: return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

const getStatusVariant = (status: string | null) => {
  switch (status) {
    case 'active': return 'default';
    case 'trialing': return 'secondary';
    case 'past_due': return 'destructive';
    case 'canceled': return 'outline';
    default: return 'secondary';
  }
};

const getPlanDisplayName = (code: string | null) => {
  switch (code) {
    case 'lite': return 'Lite';
    case 'standard': return 'Standard';
    case 'pro': return 'Pro';
    case 'elite': return 'Elite';
    default: return 'Unknown';
  }
};

export function SubscriptionStatus({
  planCode,
  status,
  currentPeriodEnd,
  cancelAtPeriodEnd,
  workspaceName,
  isDemoMode,
  onSubscribe
}: SubscriptionStatusProps) {
  const hasActiveSubscription = status === 'active' || status === 'trialing';
  
  if (isDemoMode) {
    return (
      <Card className="border-warning bg-warning/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-warning" />
            Demo Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You're currently in demo mode. Subscribe to unlock live trading and access all features.
          </p>
          <Button onClick={onSubscribe} className="w-full" variant="default">
            Subscribe to Unlock Full Access
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!planCode || !status) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-muted-foreground" />
            No Active Subscription
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            {workspaceName ? `${workspaceName} doesn't have an active subscription.` : 'No active subscription found.'}
          </p>
          <Button onClick={onSubscribe} className="w-full" variant="default">
            Choose a Plan
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={hasActiveSubscription ? 'border-success bg-success/5' : ''}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {getStatusIcon(status)}
            <span>{getPlanDisplayName(planCode)} Plan</span>
          </div>
          <Badge variant={getStatusVariant(status) as any}>
            {status?.replace('_', ' ').toUpperCase()}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {workspaceName && (
          <p className="text-sm text-muted-foreground">
            Workspace: <span className="font-medium">{workspaceName}</span>
          </p>
        )}
        
        {currentPeriodEnd && (
          <div className="space-y-2">
            <p className="text-sm">
              {cancelAtPeriodEnd ? (
                <span className="text-warning">
                  Cancels {formatDistanceToNow(new Date(currentPeriodEnd), { addSuffix: true })}
                </span>
              ) : (
                <span>
                  Renews {formatDistanceToNow(new Date(currentPeriodEnd), { addSuffix: true })}
                </span>
              )}
            </p>
            <p className="text-xs text-muted-foreground">
              {new Date(currentPeriodEnd).toLocaleDateString()}
            </p>
          </div>
        )}

        {status === 'past_due' && (
          <div className="bg-warning/10 border border-warning/20 rounded-lg p-3">
            <p className="text-sm text-warning-foreground">
              Payment failed. Please update your payment method to continue using StagAlgo.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}