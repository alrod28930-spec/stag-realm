// Advanced Excel-like spreadsheet engine
import { useState, useCallback, useRef, useMemo } from 'react';
import { useToast } from '@/hooks/use-toast';
import { FormulaEngine, Cell, CellData } from '@/utils/excelFormulas';
import { getCellId, getColumnLetter, parseColumnLetter, formatCellValue, detectCellType } from '@/utils/excelUtils';

export interface SpreadsheetData {
  cells: CellData;
  rows: number;
  cols: number;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  frozenRows: number;
  frozenCols: number;
}

interface HistoryState {
  cells: CellData;
  timestamp: number;
  action: string;
}

export function useExcelEngine(initialData?: Partial<SpreadsheetData>) {
  const [data, setData] = useState<SpreadsheetData>({
    cells: {},
    rows: 1000,
    cols: 100,
    columnWidths: {},
    rowHeights: {},
    frozenRows: 0,
    frozenCols: 0,
    ...initialData
  });

  const [history, setHistory] = useState<HistoryState[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const { toast } = useToast();

  // Formula engine with current cells
  const formulaEngine = useMemo(() => new FormulaEngine(data.cells), [data.cells]);

  // Clipboard data
  const clipboardRef = useRef<{
    cells: CellData;
    range: string;
    isCut: boolean;
  } | null>(null);

  // Save state to history
  const saveToHistory = useCallback((action: string) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push({
      cells: { ...data.cells },
      timestamp: Date.now(),
      action
    });
    
    // Limit history size
    if (newHistory.length > 100) {
      newHistory.shift();
    } else {
      setHistoryIndex(newHistory.length - 1);
    }
    
    setHistory(newHistory);
  }, [history, historyIndex, data.cells]);

  // Update single cell
  const updateCell = useCallback((cellId: string, value: string, skipHistory = false) => {
    if (!skipHistory) {
      saveToHistory(`Update ${cellId}`);
    }

    setData(prev => {
      const newCells = { ...prev.cells };
      
      if (value === '') {
        delete newCells[cellId];
      } else {
        const type = detectCellType(value);
        const isFormula = type === 'formula';
        
        let evaluatedValue = value;
        if (isFormula) {
          formulaEngine.updateCells(newCells);
          evaluatedValue = formulaEngine.evaluateFormula(value, cellId);
        }

        const cell: Cell = {
          value: evaluatedValue,
          type,
          format: 'general'
        };

        if (isFormula) {
          cell.formula = value;
        }

        newCells[cellId] = cell;

        // Update formula engine and recalculate dependents
        formulaEngine.updateCells(newCells);
        const dependentUpdates = formulaEngine.recalculateDependents(cellId);
        
        dependentUpdates.forEach((newValue, depCellId) => {
          if (newCells[depCellId]) {
            newCells[depCellId] = {
              ...newCells[depCellId],
              value: newValue
            };
          }
        });
      }

      return { ...prev, cells: newCells };
    });
  }, [formulaEngine, saveToHistory]);

  // Update multiple cells at once
  const updateCells = useCallback((updates: Record<string, string>, action = 'Bulk update') => {
    saveToHistory(action);

    setData(prev => {
      const newCells = { ...prev.cells };
      
      Object.entries(updates).forEach(([cellId, value]) => {
        if (value === '') {
          delete newCells[cellId];
        } else {
          const type = detectCellType(value);
          const isFormula = type === 'formula';
          
          let evaluatedValue = value;
          if (isFormula) {
            evaluatedValue = formulaEngine.evaluateFormula(value, cellId);
          }

          const cell: Cell = {
            value: evaluatedValue,
            type,
            format: 'general'
          };

          if (isFormula) {
            cell.formula = value;
          }

          newCells[cellId] = cell;
        }
      });

      // Update formula engine and recalculate all dependencies
      formulaEngine.updateCells(newCells);
      
      // Recalculate all formula cells
      Object.entries(newCells).forEach(([cellId, cell]) => {
        if (cell.formula) {
          const newValue = formulaEngine.evaluateFormula(cell.formula, cellId);
          if (newValue !== cell.value) {
            newCells[cellId] = { ...cell, value: newValue };
          }
        }
      });

      return { ...prev, cells: newCells };
    });
  }, [formulaEngine, saveToHistory]);

  // Apply formatting to cells
  const applyCellFormatting = useCallback((cellIds: string[], formatting: Partial<Cell['style']>) => {
    saveToHistory('Apply formatting');

    setData(prev => {
      const newCells = { ...prev.cells };
      
      cellIds.forEach(cellId => {
        const existingCell = newCells[cellId] || { value: '', type: 'text' };
        newCells[cellId] = {
          ...existingCell,
          style: {
            ...existingCell.style,
            ...formatting
          }
        };
      });

      return { ...prev, cells: newCells };
    });
  }, [saveToHistory]);

  // Set cell format (number, currency, percentage, etc.)
  const setCellFormat = useCallback((cellIds: string[], format: Cell['format']) => {
    setData(prev => {
      const newCells = { ...prev.cells };
      
      cellIds.forEach(cellId => {
        const existingCell = newCells[cellId];
        if (existingCell) {
          newCells[cellId] = {
            ...existingCell,
            format
          };
        }
      });

      return { ...prev, cells: newCells };
    });
  }, []);

  // Copy cells to clipboard
  const copyCells = useCallback((cellIds: string[]) => {
    const cellData: CellData = {};
    cellIds.forEach(cellId => {
      if (data.cells[cellId]) {
        cellData[cellId] = { ...data.cells[cellId] };
      }
    });

    clipboardRef.current = {
      cells: cellData,
      range: cellIds.join(','),
      isCut: false
    };

    toast({
      title: "Copied",
      description: `Copied ${cellIds.length} cell(s) to clipboard.`
    });
  }, [data.cells, toast]);

  // Cut cells to clipboard
  const cutCells = useCallback((cellIds: string[]) => {
    const cellData: CellData = {};
    cellIds.forEach(cellId => {
      if (data.cells[cellId]) {
        cellData[cellId] = { ...data.cells[cellId] };
      }
    });

    clipboardRef.current = {
      cells: cellData,
      range: cellIds.join(','),
      isCut: true
    };

    // Clear the cut cells
    const updates: Record<string, string> = {};
    cellIds.forEach(cellId => {
      updates[cellId] = '';
    });
    updateCells(updates, 'Cut cells');

    toast({
      title: "Cut",
      description: `Cut ${cellIds.length} cell(s) to clipboard.`
    });
  }, [updateCells, toast]);

  // Paste cells from clipboard
  const pasteCells = useCallback((targetCellId: string) => {
    if (!clipboardRef.current) {
      toast({
        title: "Nothing to paste",
        description: "Clipboard is empty.",
        variant: "destructive"
      });
      return;
    }

    const { cells: clipboardCells } = clipboardRef.current;
    const updates: Record<string, string> = {};

    // For simplicity, paste at target position
    // In a full implementation, you'd handle range mapping
    Object.entries(clipboardCells).forEach(([originalCellId, cell]) => {
      updates[targetCellId] = cell.formula || cell.value;
    });

    updateCells(updates, 'Paste cells');

    toast({
      title: "Pasted",
      description: "Cells pasted successfully."
    });
  }, [updateCells, toast]);

  // Insert row
  const insertRow = useCallback((rowIndex: number) => {
    saveToHistory(`Insert row ${rowIndex + 1}`);

    setData(prev => {
      const newCells: CellData = {};
      
      // Shift all cells down
      Object.entries(prev.cells).forEach(([cellId, cell]) => {
        const [colStr, rowStr] = cellId.match(/([A-Z]+)(\d+)/)?.slice(1) || [];
        const row = parseInt(rowStr) - 1;
        
        if (row >= rowIndex) {
          const newCellId = `${colStr}${row + 2}`;
          newCells[newCellId] = { ...cell };
        } else {
          newCells[cellId] = { ...cell };
        }
      });

      return {
        ...prev,
        cells: newCells,
        rows: prev.rows + 1
      };
    });
  }, [saveToHistory]);

  // Insert column
  const insertColumn = useCallback((colIndex: number) => {
    saveToHistory(`Insert column ${getColumnLetter(colIndex)}`);

    setData(prev => {
      const newCells: CellData = {};
      
      // Shift all cells right
      Object.entries(prev.cells).forEach(([cellId, cell]) => {
        const [colStr, rowStr] = cellId.match(/([A-Z]+)(\d+)/)?.slice(1) || [];
        const col = parseColumnLetter(colStr);
        
        if (col >= colIndex) {
          const newCellId = `${getColumnLetter(col + 1)}${rowStr}`;
          newCells[newCellId] = { ...cell };
        } else {
          newCells[cellId] = { ...cell };
        }
      });

      return {
        ...prev,
        cells: newCells,
        cols: prev.cols + 1
      };
    });
  }, [saveToHistory]);

  // Delete row
  const deleteRow = useCallback((rowIndex: number) => {
    saveToHistory(`Delete row ${rowIndex + 1}`);

    setData(prev => {
      const newCells: CellData = {};
      
      // Shift cells up and remove target row
      Object.entries(prev.cells).forEach(([cellId, cell]) => {
        const [colStr, rowStr] = cellId.match(/([A-Z]+)(\d+)/)?.slice(1) || [];
        const row = parseInt(rowStr) - 1;
        
        if (row < rowIndex) {
          newCells[cellId] = { ...cell };
        } else if (row > rowIndex) {
          const newCellId = `${colStr}${row}`;
          newCells[newCellId] = { ...cell };
        }
        // Skip cells in the deleted row
      });

      return {
        ...prev,
        cells: newCells,
        rows: Math.max(1, prev.rows - 1)
      };
    });
  }, [saveToHistory]);

  // Delete column
  const deleteColumn = useCallback((colIndex: number) => {
    saveToHistory(`Delete column ${getColumnLetter(colIndex)}`);

    setData(prev => {
      const newCells: CellData = {};
      
      // Shift cells left and remove target column
      Object.entries(prev.cells).forEach(([cellId, cell]) => {
        const [colStr, rowStr] = cellId.match(/([A-Z]+)(\d+)/)?.slice(1) || [];
        const col = parseColumnLetter(colStr);
        
        if (col < colIndex) {
          newCells[cellId] = { ...cell };
        } else if (col > colIndex) {
          const newCellId = `${getColumnLetter(col - 1)}${rowStr}`;
          newCells[newCellId] = { ...cell };
        }
        // Skip cells in the deleted column
      });

      return {
        ...prev,
        cells: newCells,
        cols: Math.max(1, prev.cols - 1)
      };
    });
  }, [saveToHistory]);

  // Set column width
  const setColumnWidth = useCallback((colIndex: number, width: number) => {
    setData(prev => ({
      ...prev,
      columnWidths: {
        ...prev.columnWidths,
        [colIndex]: width
      }
    }));
  }, []);

  // Set row height
  const setRowHeight = useCallback((rowIndex: number, height: number) => {
    setData(prev => ({
      ...prev,
      rowHeights: {
        ...prev.rowHeights,
        [rowIndex]: height
      }
    }));
  }, []);

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      const historicalState = history[newIndex];
      setData(prev => ({ ...prev, cells: historicalState.cells }));
      setHistoryIndex(newIndex);
      
      toast({
        title: "Undo",
        description: `Undid: ${historicalState.action}`
      });
    }
  }, [history, historyIndex, toast]);

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      const historicalState = history[newIndex];
      setData(prev => ({ ...prev, cells: historicalState.cells }));
      setHistoryIndex(newIndex);
      
      toast({
        title: "Redo",
        description: `Redid: ${historicalState.action}`
      });
    }
  }, [history, historyIndex, toast]);

  // Export to CSV
  const exportToCSV = useCallback(() => {
    const rows: string[] = [];
    const cellIds = Object.keys(data.cells);
    
    if (cellIds.length === 0) {
      toast({
        title: "No data to export",
        description: "The spreadsheet is empty.",
        variant: "destructive"
      });
      return;
    }

    // Find data bounds
    const maxRow = Math.max(...cellIds.map(cellId => {
      const match = cellId.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    }));
    
    const maxCol = Math.max(...cellIds.map(cellId => {
      const match = cellId.match(/[A-Z]+/);
      if (!match) return 0;
      return parseColumnLetter(match[0]);
    }));

    // Generate CSV
    for (let row = 1; row <= maxRow; row++) {
      const rowData: string[] = [];
      for (let col = 0; col <= maxCol; col++) {
        const cellId = getCellId(row - 1, col);
        const cell = data.cells[cellId];
        const value = cell ? formatCellValue(cell.value, cell.format) : '';
        
        // Escape CSV value
        const escapedValue = value.includes(',') || value.includes('"') || value.includes('\n') 
          ? `"${value.replace(/"/g, '""')}"` 
          : value;
        rowData.push(escapedValue);
      }
      rows.push(rowData.join(','));
    }
    
    const csvContent = rows.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'excel-spreadsheet.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Export successful",
      description: "Spreadsheet exported as CSV file."
    });
  }, [data.cells, toast]);

  return {
    data,
    updateCell,
    updateCells,
    applyCellFormatting,
    setCellFormat,
    copyCells,
    cutCells,
    pasteCells,
    insertRow,
    insertColumn,
    deleteRow,
    deleteColumn,
    setColumnWidth,
    setRowHeight,
    undo,
    redo,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    exportToCSV,
    setData: (newData: Partial<SpreadsheetData>) => {
      setData(prev => ({ ...prev, ...newData }));
    }
  };
}