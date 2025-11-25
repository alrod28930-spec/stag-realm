import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, ArrowRight, Crown, Zap, Star } from 'lucide-react';
import type { SubscriptionTier } from '@/hooks/useSubscriptionAccess';

interface UpgradeCTAProps {
  requiredTier: SubscriptionTier;
  featureName: string;
  description?: string;
  className?: string;
}

const TIER_CONFIGS = {
  standard: {
    name: 'Standard',
    icon: Star,
    color: 'text-blue-600',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
  },
  pro: {
    name: 'Pro',
    icon: Zap,
    color: 'text-purple-600',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
  },
  elite: {
    name: 'Elite',
    icon: Crown,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-200',
  },
};

const UpgradeCTA: React.FC<UpgradeCTAProps> = ({
  requiredTier,
  featureName,
  description,
  className = '',
}) => {
  if (requiredTier === 'lite') {
    return null;
  }

  const config = TIER_CONFIGS[requiredTier];
  const Icon = config.icon;

  return (
    <Card className={`${config.bgColor} ${config.borderColor} ${className}`}>
      <CardHeader className="text-center pb-4">
        <div className="flex justify-center mb-2">
          <div className={`rounded-full p-3 bg-white shadow-sm`}>
            <Lock className={`h-6 w-6 ${config.color}`} />
          </div>
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Icon className={`h-5 w-5 ${config.color}`} />
          {config.name} Feature
        </CardTitle>
        <CardDescription>
          {description || `${featureName} requires ${config.name} subscription`}
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-sm text-muted-foreground mb-4">
          Upgrade your subscription to unlock this feature and get access to advanced tools and capabilities.
        </p>
        <Button asChild className="w-full">
          <Link to="/subscription" className="flex items-center justify-center gap-2">
            Upgrade to {config.name}
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default UpgradeCTA;