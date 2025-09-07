import { useState, useCallback, useRef } from 'react';
import { useToast } from '@/hooks/use-toast';

interface Cell {
  value: string;
  formula?: string;
  type?: 'text' | 'number' | 'formula';
  error?: string;
}

interface SpreadsheetData {
  cells: Record<string, Cell>;
  rows: number;
  cols: number;
}

interface HistoryState {
  cells: Record<string, Cell>;
  timestamp: number;
}

export function useSpreadsheetEngine(initialData?: SpreadsheetData) {
  const [data, setData] = useState<SpreadsheetData>({
    cells: {},
    rows: 100,
    cols: 26,
    ...initialData
  });
  
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { toast } = useToast();

  // Save state to history for undo/redo
  const saveToHistory = useCallback((cells: Record<string, Cell>) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({ cells: { ...cells }, timestamp: Date.now() });
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  }, [history, historyIndex]);

  // Basic formula evaluation
  const evaluateFormula = useCallback((formula: string, cellId: string): string => {
    try {
      // Remove leading =
      const expr = formula.startsWith('=') ? formula.slice(1) : formula;
      
      // StagAlgo integrations
      if (expr.startsWith('ANALYST(')) {
        const symbolMatch = expr.match(/ANALYST\(['"]([^'"]+)['"]\)/);
        if (symbolMatch) {
          return `[Analyst: ${symbolMatch[1]}] Buy signal detected`;
        }
      }
      
      if (expr.startsWith('ORACLE(')) {
        const symbolMatch = expr.match(/ORACLE\(['"]([^'"]+)['"]\)/);
        if (symbolMatch) {
          return `[Oracle: ${symbolMatch[1]}] Bullish trend`;
        }
      }
      
      if (expr.startsWith('PORTFOLIO(')) {
        const metricMatch = expr.match(/PORTFOLIO\(['"]([^'"]+)['"]\)/);
        if (metricMatch) {
          const metric = metricMatch[1].toUpperCase();
          switch (metric) {
            case 'TOTAL_RETURN': return '12.5%';
            case 'CASH': return '$50,000';
            case 'EQUITY': return '$150,000';
            default: return 'N/A';
          }
        }
      }
      
      if (expr.startsWith('BID(')) {
        const indexMatch = expr.match(/BID\(['"]([^'"]+)['"]\)/);
        if (indexMatch) {
          return `[BID: ${indexMatch[1]}] Last: $425.30`;
        }
      }
      
      if (expr.startsWith('TRADEBOT(')) {
        const botMatch = expr.match(/TRADEBOT\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/);
        if (botMatch) {
          const [, botName, metric] = botMatch;
          switch (metric.toLowerCase()) {
            case 'winrate': return '68.5%';
            case 'return': return '15.2%';
            case 'trades': return '156';
            default: return 'N/A';
          }
        }
      }
      
      // Basic math functions
      if (expr.startsWith('SUM(')) {
        const rangeMatch = expr.match(/SUM\(([A-Z]+\d+:[A-Z]+\d+)\)/);
        if (rangeMatch) {
          const range = rangeMatch[1];
          const values = getCellRangeValues(range);
          const sum = values.reduce((acc, val) => acc + (parseFloat(val) || 0), 0);
          return sum.toString();
        }
      }
      
      if (expr.startsWith('AVERAGE(')) {
        const rangeMatch = expr.match(/AVERAGE\(([A-Z]+\d+:[A-Z]+\d+)\)/);
        if (rangeMatch) {
          const range = rangeMatch[1];
          const values = getCellRangeValues(range);
          const nums = values.map(v => parseFloat(v)).filter(n => !isNaN(n));
          const avg = nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
          return avg.toString();
        }
      }
      
      // Simple cell reference (e.g., =A1)
      if (/^[A-Z]+\d+$/.test(expr)) {
        const referencedCell = data.cells[expr];
        return referencedCell?.value || '0';
      }
      
      // Basic arithmetic evaluation (simplified)
      const numericResult = evalSimpleExpression(expr);
      return numericResult !== null ? numericResult.toString() : expr;
      
    } catch (error) {
      return '#ERROR!';
    }
  }, [data.cells]);

  // Helper function to get values from a cell range
  const getCellRangeValues = (range: string): string[] => {
    const [start, end] = range.split(':');
    const startCol = start.match(/[A-Z]+/)?.[0] || 'A';
    const startRow = parseInt(start.match(/\d+/)?.[0] || '1');
    const endCol = end.match(/[A-Z]+/)?.[0] || 'A';
    const endRow = parseInt(end.match(/\d+/)?.[0] || '1');
    
    const values: string[] = [];
    
    // Simplified range parsing - assumes single column ranges for now
    if (startCol === endCol) {
      for (let row = startRow; row <= endRow; row++) {
        const cellId = `${startCol}${row}`;
        const cell = data.cells[cellId];
        values.push(cell?.value || '0');
      }
    }
    
    return values;
  };

  // Simplified expression evaluator
  const evalSimpleExpression = (expr: string): number | null => {
    try {
      // Remove spaces and validate basic math expression
      const cleaned = expr.replace(/\s+/g, '');
      if (!/^[\d+\-*/().]+$/.test(cleaned)) return null;
      
      // Use Function constructor for safe evaluation (in real app, use proper parser)
      return new Function(`return ${cleaned}`)();
    } catch {
      return null;
    }
  };

  const updateCell = useCallback((cellId: string, value: string) => {
    const newCells = { ...data.cells };
    
    if (value === '') {
      delete newCells[cellId];
    } else {
      const isFormula = value.startsWith('=');
      const cell: Cell = {
        value: isFormula ? evaluateFormula(value, cellId) : value,
        type: isFormula ? 'formula' : isNaN(Number(value)) ? 'text' : 'number'
      };
      
      if (isFormula) {
        cell.formula = value;
      }
      
      newCells[cellId] = cell;
    }
    
    // Save to history before updating
    saveToHistory(data.cells);
    
    setData(prev => ({ ...prev, cells: newCells }));
  }, [data.cells, evaluateFormula, saveToHistory]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const historicalState = history[newIndex];
      setData(prev => ({ ...prev, cells: historicalState.cells }));
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const historicalState = history[newIndex];
      setData(prev => ({ ...prev, cells: historicalState.cells }));
      setHistoryIndex(newIndex);
    }
  }, [history, historyIndex]);

  const exportToCSV = useCallback(() => {
    const rows: string[] = [];
    const maxRow = Math.max(...Object.keys(data.cells).map(cellId => {
      const match = cellId.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    }), 1);
    
    const maxCol = Math.max(...Object.keys(data.cells).map(cellId => {
      const match = cellId.match(/[A-Z]+/);
      if (!match) return 0;
      let col = 0;
      for (let i = 0; i < match[0].length; i++) {
        col = col * 26 + (match[0].charCodeAt(i) - 64);
      }
      return col;
    }), 1);

    for (let row = 1; row <= maxRow; row++) {
      const rowData: string[] = [];
      for (let col = 1; col <= maxCol; col++) {
        const colLetter = String.fromCharCode(64 + col);
        const cellId = `${colLetter}${row}`;
        const cell = data.cells[cellId];
        rowData.push(cell?.value ? `"${cell.value}"` : '');
      }
      rows.push(rowData.join(','));
    }
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'spreadsheet.csv';
    a.click();
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export successful",
      description: "Spreadsheet exported as CSV file."
    });
  }, [data.cells, toast]);

  return {
    data,
    updateCell,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    exportToCSV,
    setData
  };
}