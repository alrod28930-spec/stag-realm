import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Calculator } from 'lucide-react';

interface FormulaBarProps {
  activeCell: string;
  formula: string;
  onFormulaChange: (formula: string) => void;
  onFormulaSubmit: (formula: string) => void;
}

export function FormulaBar({ 
  activeCell, 
  formula, 
  onFormulaChange, 
  onFormulaSubmit 
}: FormulaBarProps) {
  const [editingFormula, setEditingFormula] = useState(formula);
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    setEditingFormula(formula);
  }, [formula]);

  const handleSubmit = () => {
    onFormulaSubmit(editingFormula);
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditingFormula(formula);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    } else if (e.key === 'Escape') {
      handleCancel();
    }
  };

  return (
    <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30">
      {/* Active Cell Display */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="w-16 h-8 px-2 bg-background border border-border rounded text-sm font-mono flex items-center justify-center">
          {activeCell}
        </div>
        
        <Calculator className="w-4 h-4 text-muted-foreground" />
      </div>

      {/* Formula Input */}
      <div className="flex-1 flex items-center gap-1">
        <Input
          value={editingFormula}
          onChange={(e) => {
            setEditingFormula(e.target.value);
            onFormulaChange(e.target.value);
            setIsEditing(true);
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsEditing(true)}
          placeholder="Enter formula (e.g., =SUM(A1:A10), =ANALYST('AAPL'), =ORACLE('TSLA'))"
          className="h-8 font-mono text-sm"
        />
        
        {isEditing && (
          <div className="flex gap-1">
            <Button
              onClick={handleSubmit}
              size="sm"
              className="h-8 w-8 p-0"
              variant="outline"
            >
              <Check className="w-4 h-4 text-green-600" />
            </Button>
            <Button
              onClick={handleCancel}
              size="sm"
              className="h-8 w-8 p-0"
              variant="outline"
            >
              <X className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      {/* Function Helper */}
      <div className="text-xs text-muted-foreground hidden md:block">
        StagAlgo Functions: ANALYST(), ORACLE(), PORTFOLIO(), BID(), TRADEBOT()
      </div>
    </div>
  );
}