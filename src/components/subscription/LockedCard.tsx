import React, { useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Lock, Crown, Zap, Star } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { isDemoMode } from '@/utils/demoMode';
import { logFeatureLock, getFeatureTier, getTierDisplayName } from '@/utils/featureGuard';

interface LockedCardProps {
  feature: string;
  title?: string;
  description?: string;
  onUpgrade?: () => void;
}

// Feature metadata mapping
const FEATURE_META: Record<string, {
  title: string;
  description: string;
  requiredTier: string;
  icon: React.ComponentType<{ className?: string }>;
}> = {
  TRADING_DESK: {
    title: 'Trading Desk',
    description: 'Manual order entry cockpit for live trading',
    requiredTier: 'Standard',
    icon: Zap
  },
  BROKERAGE_DOCK: {
    title: 'Brokerage Dock',
    description: 'Embedded broker portal integration',
    requiredTier: 'Standard',
    icon: Crown
  },
  ADV_BOTS: {
    title: 'Advanced Bots',
    description: 'Advanced and customizable trading bots',
    requiredTier: 'Pro',
    icon: Star
  },
  DAY_TRADE_MODE: {
    title: 'Day Trading Mode',
    description: 'High-frequency day trading capabilities',
    requiredTier: 'Pro',
    icon: Zap
  },
  VOICE_ANALYST: {
    title: 'Voice Analyst',
    description: 'Voice and TTS Analyst features',
    requiredTier: 'Elite',
    icon: Crown
  }
};

interface LockedCardProps {
  feature: string;
  title?: string;
  description?: string;
  onUpgrade?: () => void;
  workspaceId?: string;
}

export function LockedCard({ 
  feature, 
  title, 
  description, 
  onUpgrade,
  workspaceId 
}: LockedCardProps) {
  const { toast } = useToast();
  const demoMode = isDemoMode();
  const requiredTier = getFeatureTier(feature);
  const tierDisplayName = getTierDisplayName(requiredTier);

  const meta = FEATURE_META[feature] || {
    title: title || 'Premium Feature',
    description: description || 'This feature requires a subscription upgrade.',
    requiredTier: tierDisplayName,
    icon: Lock
  };

  const IconComponent = meta.icon;

  useEffect(() => {
    // Log that user viewed a locked feature
    logFeatureLock(workspaceId, feature, 'viewed', { 
      required_tier: requiredTier 
    });
  }, [feature, requiredTier, workspaceId]);

  const handleUpgrade = async () => {
    if (demoMode) {
      toast({
        title: "Demo Mode",
        description: "Feature upgrades are not available in demo mode. Please sign up for a real account.",
        variant: "default"
      });
      return;
    }

    // Log upgrade CTA click
    await logFeatureLock(workspaceId, feature, 'upgrade_clicked', { 
      target_tier: requiredTier 
    });

    if (onUpgrade) {
      onUpgrade();
    } else {
      // Default: scroll to subscription page
      const subscriptionSection = document.getElementById('plans-section');
      if (subscriptionSection) {
        subscriptionSection.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Navigate to subscription page if not on it
        window.location.href = '/subscription';
      }
    }
  };

  return (
    <Card className="border-dashed border-muted-foreground/30 bg-muted/20">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <IconComponent className="h-6 w-6 text-muted-foreground" />
        </div>
        <CardTitle className="flex items-center justify-center gap-2">
          <Lock className="h-4 w-4" />
          {meta.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="text-center space-y-4">
        <p className="text-muted-foreground text-sm">
          {meta.description}
        </p>
        
        <div className="flex justify-center">
          <Badge variant="secondary" className="gap-1">
            <Crown className="h-3 w-3" />
            Requires {tierDisplayName}
          </Badge>
        </div>

        <Button 
          onClick={handleUpgrade} 
          className="w-full"
          variant="default"
        >
          Upgrade to {tierDisplayName}
        </Button>

        {demoMode && (
          <p className="text-xs text-muted-foreground">
            Currently in demo mode. Sign up to access premium features.
          </p>
        )}
      </CardContent>
    </Card>
  );
}