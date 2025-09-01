import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { complianceService } from '@/services/compliance';

interface LegalFooterProps {
  component: string;
  variant?: 'minimal' | 'standard' | 'detailed';
  className?: string;
}

export function LegalFooter({ component, variant = 'minimal', className }: LegalFooterProps) {
  const [isDismissed, setIsDismissed] = useState(false);
  
  const footer = complianceService.getLegalFooter(component, variant);
  
  if (!footer || isDismissed) return null;

  const handleDismiss = () => {
    setIsDismissed(true);
  };

  return (
    <div className={`bg-muted/30 border border-border/50 rounded-lg p-3 text-xs text-muted-foreground ${className}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="flex-1">
          {footer.content}
        </p>
        {footer.showDismiss && (
          <Button
            variant="ghost"
            size="sm"
            className="h-4 w-4 p-0 hover:bg-muted"
            onClick={handleDismiss}
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </div>
  );
}