import { AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function ComplianceFooter() {
  return (
    <Card className="bg-muted/30 border-amber-200/50">
      <CardContent className="py-4">
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-medium mb-1">Important Disclaimer</p>
            <p>
              <strong>Educational use only.</strong> Performance targets are goals, not guarantees. 
              All orders are mirrored via your connected brokerage account; StagAlgo never holds 
              or manages your funds. Trading involves substantial risk of loss. You are responsible 
              for all trading outcomes and compliance with applicable regulations.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}