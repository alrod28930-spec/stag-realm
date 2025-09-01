import { useState } from 'react';
import { Info, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { LegalFooter } from '@/types/compliance';

interface ComplianceFooterProps {
  footer: LegalFooter;
  onDismiss?: () => void;
}

export function ComplianceFooter({ footer, onDismiss }: ComplianceFooterProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed && footer.showDismiss) return null;

  const handleDismiss = () => {
    setDismissed(true);
    onDismiss?.();
  };

  const getVariantStyles = () => {
    switch (footer.variant) {
      case 'minimal':
        return 'text-xs text-muted-foreground border-none bg-transparent p-2';
      case 'standard':
        return 'text-sm border-border/50 bg-muted/10 p-3';
      case 'detailed':
        return 'text-sm border-orange-200 bg-orange-50 dark:bg-orange-950/20 dark:border-orange-800 p-4';
      default:
        return 'text-xs text-muted-foreground border-none bg-transparent p-2';
    }
  };

  if (footer.variant === 'minimal') {
    return (
      <div className="flex items-center justify-center py-2 border-t border-border/50">
        <div className="flex items-center gap-2">
          <Info className="w-3 h-3 text-muted-foreground/60" />
          <span className="text-xs text-muted-foreground">
            {footer.content}
          </span>
        </div>
      </div>
    );
  }

  return (
    <Alert className={getVariantStyles()}>
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-2 flex-1">
          <Info className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <AlertDescription className="text-foreground leading-relaxed">
              {footer.content}
            </AlertDescription>
            
            {footer.variant === 'detailed' && (
              <div className="flex items-center gap-2 mt-2">
                <Badge variant="outline" className="text-xs">
                  Compliance Notice
                </Badge>
                <span className="text-xs text-muted-foreground">
                  StagAlgo Software Tool
                </span>
              </div>
            )}
          </div>
        </div>
        
        {footer.showDismiss && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-auto p-1 ml-2"
          >
            <X className="w-3 h-3" />
          </Button>
        )}
      </div>
    </Alert>
  );
}