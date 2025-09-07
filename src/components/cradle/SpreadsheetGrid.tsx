import { useState, useRef, useEffect, useCallback } from 'react';
import { cn } from '@/lib/utils';

interface Cell {
  value: string;
  formula?: string;
  type?: 'text' | 'number' | 'formula';
  style?: {
    bold?: boolean;
    italic?: boolean;
    color?: string;
    backgroundColor?: string;
  };
}

interface SpreadsheetGridProps {
  data: Record<string, Cell>;
  rows: number;
  cols: number;
  activeCell: string;
  onCellChange: (cellId: string, value: string) => void;
  onActiveCellChange: (cellId: string) => void;
  onFormulaChange: (formula: string) => void;
}

export function SpreadsheetGrid({
  data,
  rows,
  cols,
  activeCell,
  onCellChange,
  onActiveCellChange,
  onFormulaChange
}: SpreadsheetGridProps) {
  const [editingCell, setEditingCell] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Convert column number to letter (A, B, C, ..., Z, AA, AB, ...)
  const getColumnLetter = (col: number): string => {
    let result = '';
    while (col >= 0) {
      result = String.fromCharCode(65 + (col % 26)) + result;
      col = Math.floor(col / 26) - 1;
    }
    return result;
  };

  // Convert cell coordinates to cell ID (e.g., A1, B2)
  const getCellId = (row: number, col: number): string => {
    return `${getColumnLetter(col)}${row + 1}`;
  };

  // Parse cell ID to coordinates
  const parseCellId = (cellId: string): { row: number; col: number } => {
    const match = cellId.match(/^([A-Z]+)(\d+)$/);
    if (!match) return { row: 0, col: 0 };
    
    const colStr = match[1];
    const row = parseInt(match[2]) - 1;
    
    let col = 0;
    for (let i = 0; i < colStr.length; i++) {
      col = col * 26 + (colStr.charCodeAt(i) - 64);
    }
    col -= 1;
    
    return { row, col };
  };

  const handleCellClick = (cellId: string) => {
    onActiveCellChange(cellId);
    const cell = data[cellId];
    if (cell?.formula) {
      onFormulaChange(cell.formula);
    } else {
      onFormulaChange('');
    }
  };

  const handleCellDoubleClick = (cellId: string) => {
    setEditingCell(cellId);
    const cell = data[cellId];
    setEditValue(cell?.value || '');
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const handleEditComplete = () => {
    if (editingCell) {
      onCellChange(editingCell, editValue);
      setEditingCell(null);
      setEditValue('');
    }
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (editingCell) return;

    const { row, col } = parseCellId(activeCell);
    let newRow = row;
    let newCol = col;

    switch (e.key) {
      case 'ArrowUp':
        newRow = Math.max(0, row - 1);
        break;
      case 'ArrowDown':
        newRow = Math.min(rows - 1, row + 1);
        break;
      case 'ArrowLeft':
        newCol = Math.max(0, col - 1);
        break;
      case 'ArrowRight':
        newCol = Math.min(cols - 1, col + 1);
        break;
      case 'Enter':
        if (e.shiftKey) {
          newRow = Math.max(0, row - 1);
        } else {
          newRow = Math.min(rows - 1, row + 1);
        }
        break;
      case 'Tab':
        e.preventDefault();
        if (e.shiftKey) {
          newCol = Math.max(0, col - 1);
        } else {
          newCol = Math.min(cols - 1, col + 1);
        }
        break;
      case 'F2':
        handleCellDoubleClick(activeCell);
        return;
      default:
        return;
    }

    const newCellId = getCellId(newRow, newCol);
    if (newCellId !== activeCell) {
      onActiveCellChange(newCellId);
      const cell = data[newCellId];
      if (cell?.formula) {
        onFormulaChange(cell.formula);
      } else {
        onFormulaChange('');
      }
    }
  }, [activeCell, data, rows, cols, editingCell, onActiveCellChange, onFormulaChange]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  return (
    <div className="relative overflow-auto border border-border rounded-lg bg-background">
      <div className="sticky top-0 left-0 z-20 bg-muted border-b border-border">
        {/* Corner cell */}
        <div className="absolute top-0 left-0 w-12 h-8 bg-muted border-r border-border flex items-center justify-center text-xs font-medium z-30">
          
        </div>
        
        {/* Column headers */}
        <div className="flex ml-12">
          {Array.from({ length: cols }, (_, i) => (
            <div
              key={i}
              className="w-20 h-8 border-r border-border flex items-center justify-center text-xs font-medium bg-muted"
            >
              {getColumnLetter(i)}
            </div>
          ))}
        </div>
      </div>

      <div className="flex">
        {/* Row headers */}
        <div className="sticky left-0 z-10 bg-muted border-r border-border">
          {Array.from({ length: rows }, (_, i) => (
            <div
              key={i}
              className="w-12 h-8 border-b border-border flex items-center justify-center text-xs font-medium bg-muted"
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Grid cells */}
        <div className="grid-container" ref={gridRef}>
          {Array.from({ length: rows }, (_, rowIndex) => (
            <div key={rowIndex} className="flex">
              {Array.from({ length: cols }, (_, colIndex) => {
                const cellId = getCellId(rowIndex, colIndex);
                const cell = data[cellId];
                const isActive = cellId === activeCell;
                const isEditing = cellId === editingCell;

                return (
                  <div
                    key={cellId}
                    className={cn(
                      "relative w-20 h-8 border-r border-b border-border cursor-cell",
                      "hover:bg-muted/50 focus:outline-none",
                      isActive && "ring-2 ring-primary ring-inset bg-primary/5",
                      cell?.style?.backgroundColor && `bg-[${cell.style.backgroundColor}]`
                    )}
                    onClick={() => handleCellClick(cellId)}
                    onDoubleClick={() => handleCellDoubleClick(cellId)}
                    tabIndex={0}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={handleEditComplete}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === 'Tab') {
                            e.preventDefault();
                            handleEditComplete();
                          } else if (e.key === 'Escape') {
                            setEditingCell(null);
                            setEditValue('');
                          }
                        }}
                        className="w-full h-full px-1 text-xs bg-background border-none outline-none"
                      />
                    ) : (
                      <div
                        className={cn(
                          "w-full h-full px-1 text-xs flex items-center truncate",
                          cell?.style?.bold && "font-bold",
                          cell?.style?.italic && "italic",
                          cell?.style?.color && `text-[${cell.style.color}]`
                        )}
                      >
                        {cell?.value || ''}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}