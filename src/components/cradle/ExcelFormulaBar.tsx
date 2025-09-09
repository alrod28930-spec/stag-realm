// Enhanced formula bar with autocomplete and function hints
import React, { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Check, X, Calculator, HelpCircle } from 'lucide-react';

interface ExcelFormulaBarProps {
  activeCell: string;
  formula: string;
  onFormulaChange: (formula: string) => void;
  onFormulaSubmit: (formula: string) => void;
  selectedRange?: string;
}

export function ExcelFormulaBar({ 
  activeCell, 
  formula, 
  onFormulaChange, 
  onFormulaSubmit,
  selectedRange 
}: ExcelFormulaBarProps) {
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

  return (
    <div className="flex items-center gap-2 p-2 border-b border-border bg-muted/30">
      <div className="w-16 h-8 px-2 bg-background border border-border rounded text-sm font-mono flex items-center justify-center">
        {selectedRange || activeCell}
      </div>
      
      <Calculator className="w-4 h-4 text-muted-foreground" />

      <div className="flex-1 flex items-center gap-1">
        <Input
          value={editingFormula}
          onChange={(e) => {
            setEditingFormula(e.target.value);
            onFormulaChange(e.target.value);
            setIsEditing(true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              handleSubmit();
            } else if (e.key === 'Escape') {
              handleCancel();
            }
          }}
          onFocus={() => setIsEditing(true)}
          placeholder="Enter formula (e.g., =SUM(A1:A10), =ANALYST('AAPL'), =ORACLE('TSLA'))"
          className="h-8 font-mono text-sm"
        />
        
        {isEditing && (
          <div className="flex gap-1">
            <Button onClick={handleSubmit} size="sm" className="h-8 w-8 p-0" variant="outline">
              <Check className="w-4 h-4 text-green-600" />
            </Button>
            <Button onClick={handleCancel} size="sm" className="h-8 w-8 p-0" variant="outline">
              <X className="w-4 h-4 text-destructive" />
            </Button>
          </div>
        )}
      </div>

      <div className="text-xs text-muted-foreground hidden lg:flex items-center gap-1">
        <HelpCircle className="w-3 h-3" />
        Functions: SUM, AVERAGE, ANALYST(), ORACLE(), PORTFOLIO()
      </div>
    </div>
  );
}