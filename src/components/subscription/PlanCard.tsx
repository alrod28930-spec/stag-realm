import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Zap, Crown, Sparkles } from 'lucide-react';

export interface PlanFeature {
  name: string;
  included: boolean;
  tooltip?: string;
}

export interface Plan {
  code: string;
  name: string;
  price: number;
  description: string;
  features: PlanFeature[];
  popular?: boolean;
  trial?: number;
  priceId?: string;
}

interface PlanCardProps {
  plan: Plan;
  currentPlan?: string | null;
  onSelect: (plan: Plan) => void;
  disabled?: boolean;
}

const getPlanIcon = (code: string) => {
  switch (code) {
    case 'lite': return null;
    case 'standard': return <Zap className="h-5 w-5 text-primary" />;
    case 'pro': return <Crown className="h-5 w-5 text-accent" />;
    case 'elite': return <Sparkles className="h-5 w-5 text-warning" />;
    default: return null;
  }
};

const getPlanVariant = (code: string) => {
  switch (code) {
    case 'pro': return 'premium';
    case 'elite': return 'hero'; 
    default: return 'default';
  }
};

export function PlanCard({ plan, currentPlan, onSelect, disabled }: PlanCardProps) {
  const isCurrentPlan = currentPlan === plan.code;
  const isUpgrade = currentPlan && plan.code !== currentPlan;
  
  return (
    <Card className={`relative transition-all duration-200 hover:shadow-elegant ${
      plan.popular ? 'border-primary shadow-glow' : ''
    } ${isCurrentPlan ? 'ring-2 ring-primary' : ''}`}>
      {plan.popular && (
        <Badge className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-gradient-primary text-primary-foreground">
          Most Popular
        </Badge>
      )}
      
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          {getPlanIcon(plan.code)}
          <CardTitle className="text-xl">{plan.name}</CardTitle>
        </div>
        
        <div className="space-y-1">
          <div className="text-3xl font-bold">
            ${plan.price}
            <span className="text-base font-normal text-muted-foreground">/month</span>
          </div>
          {plan.trial && (
            <Badge variant="secondary" className="text-xs">
              {plan.trial} day free trial
            </Badge>
          )}
        </div>
        
        <CardDescription>{plan.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <ul className="space-y-3">
          {plan.features.map((feature, index) => (
            <li key={index} className="flex items-start gap-3">
              <Check className={`h-4 w-4 mt-0.5 ${
                feature.included ? 'text-success' : 'text-muted-foreground opacity-50'
              }`} />
              <span className={`text-sm ${
                !feature.included ? 'text-muted-foreground line-through' : ''
              }`}>
                {feature.name}
              </span>
            </li>
          ))}
        </ul>
      </CardContent>

      <CardFooter>
        <Button
          onClick={() => onSelect(plan)}
          disabled={disabled}
          variant={isCurrentPlan ? 'secondary' : getPlanVariant(plan.code) as any}
          className="w-full"
          size="lg"
        >
          {isCurrentPlan 
            ? 'Current Plan' 
            : isUpgrade 
              ? (currentPlan && ['lite', 'standard'].includes(currentPlan) && ['pro', 'elite'].includes(plan.code) 
                  ? 'Upgrade' 
                  : 'Change Plan'
                )
              : 'Get Started'
          }
        </Button>
      </CardFooter>
    </Card>
  );
}