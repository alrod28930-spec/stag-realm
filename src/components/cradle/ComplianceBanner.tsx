import { AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function ComplianceBanner() {
  return (
    <Alert className="bg-warning/10 border-warning/20 text-warning-foreground">
      <AlertTriangle className="h-4 w-4" />
      <AlertDescription className="text-sm">
        <strong>Cradle Spreadsheet Lab - Educational Use Only:</strong> All calculations, formulas, and data analysis in this workspace are for educational and experimental purposes only. Results do not guarantee trading performance or returns. Always conduct your own research and consult with financial professionals before making investment decisions.
      </AlertDescription>
    </Alert>
  );
}