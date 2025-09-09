// Advanced Excel-like grid with full selection, resizing, and formatting
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Cell } from '@/utils/excelFormulas';
import { 
  CellPosition, 
  getCellId, 
  getColumnLetter, 
  parseCellId, 
  formatCellValue,
  columnWidthToPx 
} from '@/utils/excelUtils';
import { useExcelSelection } from '@/hooks/useExcelSelection';

interface ExcelGridProps {
  data: Record<string, Cell>;
  rows: number;
  cols: number;
  columnWidths: Record<number, number>;
  rowHeights: Record<number, number>;
  onCellChange: (cellId: string, value: string) => void;
  onCellDoubleClick: (cellId: string) => void;
  onSelectionChange: (selection: any) => void;
  onColumnResize: (colIndex: number, width: number) => void;
  onRowResize: (rowIndex: number, height: number) => void;
  onContextMenu: (cellId: string, position: { x: number; y: number }) => void;
  readOnly?: boolean;
}

interface EditingState {
  cellId: string | null;
  value: string;
  originalValue: string;
}

export function ExcelGrid({
  data,
  rows,
  cols,
  columnWidths,
  rowHeights,
  onCellChange,
  onCellDoubleClick,
  onSelectionChange,
  onColumnResize,
  onRowResize,
  onContextMenu,
  readOnly = false
}: ExcelGridProps) {
  const [editing, setEditing] = useState<EditingState>({ cellId: null, value: '', originalValue: '' });
  const [resizing, setResizing] = useState<{ type: 'row' | 'col'; index: number } | null>(null);

  const gridRef = useRef<HTMLDivElement>(null);
  const editInputRef = useRef<HTMLInputElement>(null);
  const resizeStartRef = useRef<{ startPos: number; startSize: number }>({ startPos: 0, startSize: 0 });

  const selection = useExcelSelection(rows, cols);

  // Default sizes
  const defaultColWidth = 80;
  const defaultRowHeight = 24;

  // Notify parent of selection changes
  useEffect(() => {
    onSelectionChange(selection.selection);
  }, [selection.selection, onSelectionChange]);

  // Get cell style with selection highlighting
  const getCellStyle = useCallback((position: CellPosition, cell?: Cell) => {
    const isSelected = selection.isPositionSelected(position);
    const isActive = position.row === selection.selection.activeCell.row && 
                    position.col === selection.selection.activeCell.col;

    let style: React.CSSProperties = {
      width: columnWidthToPx(columnWidths[position.col] || defaultColWidth),
      height: rowHeights[position.row] || defaultRowHeight,
      ...cell?.style
    };

    if (isActive) {
      style.border = '2px solid var(--primary)';
      style.backgroundColor = 'var(--primary)/5';
    } else if (isSelected) {
      style.backgroundColor = 'var(--primary)/10';
    }

    return style;
  }, [selection, columnWidths, rowHeights, defaultColWidth, defaultRowHeight]);

  // Handle cell click
  const handleCellClick = useCallback((position: CellPosition, event: React.MouseEvent) => {
    event.preventDefault();
    
    if (event.ctrlKey || event.metaKey) {
      selection.startSelection(position, true);
      selection.endSelection(position, true);
    } else if (event.shiftKey) {
      selection.updateSelection(position);
      selection.endSelection(position, false);
    } else {
      selection.setActiveCell(position);
    }
  }, [selection]);

  // Handle cell double click
  const handleCellDoubleClick = useCallback((position: CellPosition) => {
    if (readOnly) return;
    
    const cellId = getCellId(position.row, position.col);
    const cell = data[cellId];
    
    setEditing({
      cellId,
      value: cell?.formula || cell?.value || '',
      originalValue: cell?.formula || cell?.value || ''
    });
    
    onCellDoubleClick(cellId);
    
    setTimeout(() => editInputRef.current?.focus(), 0);
  }, [data, onCellDoubleClick, readOnly]);

  // Handle mouse down for selection
  const handleMouseDown = useCallback((position: CellPosition, event: React.MouseEvent) => {
    if (event.button !== 0) return; // Only left mouse button
    
    selection.startSelection(position, event.ctrlKey || event.metaKey);
    
    const handleMouseMove = (e: MouseEvent) => {
      if (!gridRef.current) return;
      
      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate which cell we're over
      let currentRow = 0;
      let currentCol = 0;
      let accumulatedHeight = 32; // Header height
      let accumulatedWidth = 48; // Row header width
      
      // Find row
      for (let r = 0; r < rows; r++) {
        const rowHeight = rowHeights[r] || defaultRowHeight;
        if (y < accumulatedHeight + rowHeight) {
          currentRow = r;
          break;
        }
        accumulatedHeight += rowHeight;
        if (r === rows - 1) currentRow = rows - 1;
      }
      
      // Find column
      for (let c = 0; c < cols; c++) {
        const colWidth = columnWidthToPx(columnWidths[c] || defaultColWidth);
        if (x < accumulatedWidth + colWidth) {
          currentCol = c;
          break;
        }
        accumulatedWidth += colWidth;
        if (c === cols - 1) currentCol = cols - 1;
      }
      
      selection.updateSelection({ row: currentRow, col: currentCol });
    };
    
    const handleMouseUp = (e: MouseEvent) => {
      if (!gridRef.current) return;
      
      const rect = gridRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Calculate final position same as in mousemove
      let currentRow = 0;
      let currentCol = 0;
      let accumulatedHeight = 32;
      let accumulatedWidth = 48;
      
      for (let r = 0; r < rows; r++) {
        const rowHeight = rowHeights[r] || defaultRowHeight;
        if (y < accumulatedHeight + rowHeight) {
          currentRow = r;
          break;
        }
        accumulatedHeight += rowHeight;
        if (r === rows - 1) currentRow = rows - 1;
      }
      
      for (let c = 0; c < cols; c++) {
        const colWidth = columnWidthToPx(columnWidths[c] || defaultColWidth);
        if (x < accumulatedWidth + colWidth) {
          currentCol = c;
          break;
        }
        accumulatedWidth += colWidth;
        if (c === cols - 1) currentCol = cols - 1;
      }
      
      selection.endSelection({ row: currentRow, col: currentCol }, event.ctrlKey || event.metaKey);
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [selection, rows, cols, rowHeights, columnWidths, defaultRowHeight, defaultColWidth]);

  // Handle right-click context menu
  const handleContextMenu = useCallback((position: CellPosition, event: React.MouseEvent) => {
    event.preventDefault();
    const cellId = getCellId(position.row, position.col);
    onContextMenu(cellId, { x: event.clientX, y: event.clientY });
  }, [onContextMenu]);

  // Handle editing input changes
  const handleEditChange = useCallback((value: string) => {
    setEditing(prev => ({ ...prev, value }));
  }, []);

  // Complete editing
  const completeEditing = useCallback((save = true) => {
    if (!editing.cellId) return;
    
    if (save && editing.value !== editing.originalValue) {
      onCellChange(editing.cellId, editing.value);
    }
    
    setEditing({ cellId: null, value: '', originalValue: '' });
  }, [editing, onCellChange]);

  // Cancel editing
  const cancelEditing = useCallback(() => {
    completeEditing(false);
  }, [completeEditing]);

  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (editing.cellId) {
        // Handle editing keys
        if (e.key === 'Enter') {
          e.preventDefault();
          completeEditing(true);
          selection.moveSelection('down');
        } else if (e.key === 'Escape') {
          e.preventDefault();
          cancelEditing();
        } else if (e.key === 'Tab') {
          e.preventDefault();
          completeEditing(true);
          selection.navigateNext(e.shiftKey);
        }
        return;
      }

      // Handle navigation keys
      switch (e.key) {
        case 'ArrowUp':
          e.preventDefault();
          selection.moveSelection('up', e.shiftKey);
          break;
        case 'ArrowDown':
          e.preventDefault();
          selection.moveSelection('down', e.shiftKey);
          break;
        case 'ArrowLeft':
          e.preventDefault();
          selection.moveSelection('left', e.shiftKey);
          break;
        case 'ArrowRight':
          e.preventDefault();
          selection.moveSelection('right', e.shiftKey);
          break;
        case 'Enter':
          e.preventDefault();
          if (e.shiftKey) {
            selection.moveSelection('up');
          } else {
            selection.moveSelection('down');
          }
          break;
        case 'Tab':
          e.preventDefault();
          selection.navigateNext(e.shiftKey);
          break;
        case 'F2':
          e.preventDefault();
          const activePos = selection.selection.activeCell;
          handleCellDoubleClick(activePos);
          break;
        case 'Delete':
        case 'Backspace':
          e.preventDefault();
          if (!readOnly) {
            const selectedCells = selection.getSelectedCellIds();
            selectedCells.forEach(cellId => onCellChange(cellId, ''));
          }
          break;
        case 'a':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            selection.selectAll();
          }
          break;
        default:
          // Start editing if printable character
          if (!readOnly && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
            const activePos = selection.selection.activeCell;
            const cellId = getCellId(activePos.row, activePos.col);
            setEditing({
              cellId,
              value: e.key,
              originalValue: data[cellId]?.formula || data[cellId]?.value || ''
            });
            setTimeout(() => editInputRef.current?.focus(), 0);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editing, selection, handleCellDoubleClick, completeEditing, cancelEditing, onCellChange, data, readOnly]);

  // Column resize handlers
  const startColumnResize = useCallback((colIndex: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setResizing({ type: 'col', index: colIndex });
    resizeStartRef.current = {
      startPos: event.clientX,
      startSize: columnWidthToPx(columnWidths[colIndex] || defaultColWidth)
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - resizeStartRef.current.startPos;
      const newWidth = Math.max(20, resizeStartRef.current.startSize + deltaX);
      const excelWidth = newWidth / 7.6; // Convert back to Excel units
      onColumnResize(colIndex, Math.round(excelWidth * 100) / 100);
    };
    
    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columnWidths, defaultColWidth, onColumnResize]);

  // Row resize handlers
  const startRowResize = useCallback((rowIndex: number, event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    
    setResizing({ type: 'row', index: rowIndex });
    resizeStartRef.current = {
      startPos: event.clientY,
      startSize: rowHeights[rowIndex] || defaultRowHeight
    };
    
    const handleMouseMove = (e: MouseEvent) => {
      const deltaY = e.clientY - resizeStartRef.current.startPos;
      const newHeight = Math.max(12, resizeStartRef.current.startSize + deltaY);
      onRowResize(rowIndex, newHeight);
    };
    
    const handleMouseUp = () => {
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [rowHeights, defaultRowHeight, onRowResize]);

  // Render visible cells (simple virtualization)
  const visibleCells = useMemo(() => {
    const cells: React.ReactNode[] = [];
    
    for (let row = 0; row < Math.min(rows, 100); row++) {
      for (let col = 0; col < Math.min(cols, 50); col++) {
        const position: CellPosition = { row, col };
        const cellId = getCellId(row, col);
        const cell = data[cellId];
        const isEditing = editing.cellId === cellId;
        
        cells.push(
          <div
            key={cellId}
            className={cn(
              "absolute border-r border-b border-border bg-background cursor-cell",
              "hover:bg-muted/30 focus:outline-none",
              selection.isPositionSelected(position) && "bg-primary/10",
              position.row === selection.selection.activeCell.row && 
              position.col === selection.selection.activeCell.col && 
              "ring-2 ring-primary ring-inset bg-primary/5"
            )}
            style={{
              left: 48 + Array.from({ length: col }, (_, i) => 
                columnWidthToPx(columnWidths[i] || defaultColWidth)
              ).reduce((sum, width) => sum + width, 0),
              top: 32 + Array.from({ length: row }, (_, i) => 
                rowHeights[i] || defaultRowHeight
              ).reduce((sum, height) => sum + height, 0),
              width: columnWidthToPx(columnWidths[col] || defaultColWidth),
              height: rowHeights[row] || defaultRowHeight,
              zIndex: isEditing ? 10 : 1
            }}
            onClick={(e) => handleCellClick(position, e)}
            onDoubleClick={() => handleCellDoubleClick(position)}
            onMouseDown={(e) => handleMouseDown(position, e)}
            onContextMenu={(e) => handleContextMenu(position, e)}
          >
            {isEditing ? (
              <input
                ref={editInputRef}
                value={editing.value}
                onChange={(e) => handleEditChange(e.target.value)}
                onBlur={() => completeEditing(true)}
                onKeyDown={(e) => {
                  e.stopPropagation();
                }}
                className="w-full h-full px-2 text-sm bg-background border-2 border-primary outline-none"
                style={{ fontSize: '12px' }}
              />
            ) : (
              <div
                className={cn(
                  "w-full h-full px-2 text-sm flex items-center truncate",
                  cell?.style?.bold && "font-bold",
                  cell?.style?.italic && "italic",
                  cell?.style?.underline && "underline"
                )}
                style={{
                  color: cell?.style?.color,
                  backgroundColor: cell?.style?.backgroundColor,
                  textAlign: cell?.style?.textAlign || 'left',
                  fontSize: cell?.style?.fontSize || '12px',
                  fontFamily: cell?.style?.fontFamily
                }}
              >
                {cell ? formatCellValue(cell.value, cell.format) : ''}
              </div>
            )}
          </div>
        );
      }
    }
    
    return cells;
  }, [
    rows, cols, data, editing, selection, columnWidths, rowHeights, 
    defaultColWidth, defaultRowHeight, handleCellClick, handleCellDoubleClick, 
    handleMouseDown, handleContextMenu, handleEditChange, completeEditing
  ]);

  return (
    <div 
      ref={gridRef}
      className="relative overflow-auto border border-border rounded-lg bg-background select-none"
      style={{ height: '600px' }}
    >
      {/* Column headers */}
      <div className="sticky top-0 left-0 z-30 bg-muted border-b border-border flex">
        {/* Corner cell */}
        <div className="w-12 h-8 bg-muted border-r border-border flex items-center justify-center text-xs font-medium">
          
        </div>
        
        {/* Column header cells */}
        {Array.from({ length: Math.min(cols, 50) }, (_, colIndex) => (
          <div
            key={colIndex}
            className="relative bg-muted border-r border-border flex items-center justify-center text-xs font-medium hover:bg-muted/80 cursor-pointer"
            style={{ 
              width: columnWidthToPx(columnWidths[colIndex] || defaultColWidth),
              height: 32 
            }}
            onClick={() => selection.selectColumn(colIndex)}
          >
            {getColumnLetter(colIndex)}
            {/* Column resize handle */}
            <div
              className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/50"
              onMouseDown={(e) => startColumnResize(colIndex, e)}
            />
          </div>
        ))}
      </div>

      {/* Row headers */}
      <div className="sticky left-0 z-20 bg-muted border-r border-border">
        {Array.from({ length: Math.min(rows, 100) }, (_, rowIndex) => (
          <div
            key={rowIndex}
            className="relative bg-muted border-b border-border flex items-center justify-center text-xs font-medium hover:bg-muted/80 cursor-pointer"
            style={{ 
              width: 48,
              height: rowHeights[rowIndex] || defaultRowHeight,
              position: 'absolute',
              top: 32 + Array.from({ length: rowIndex }, (_, i) => 
                rowHeights[i] || defaultRowHeight
              ).reduce((sum, height) => sum + height, 0)
            }}
            onClick={() => selection.selectRow(rowIndex)}
          >
            {rowIndex + 1}
            {/* Row resize handle */}
            <div
              className="absolute bottom-0 left-0 w-full h-1 cursor-row-resize hover:bg-primary/50"
              onMouseDown={(e) => startRowResize(rowIndex, e)}
            />
          </div>
        ))}
      </div>

      {/* Cell grid */}
      <div className="relative">
        {visibleCells}
      </div>

      {/* Resize cursor overlay */}
      {resizing && (
        <div 
          className="absolute inset-0 z-50"
          style={{ 
            cursor: resizing.type === 'col' ? 'col-resize' : 'row-resize' 
          }}
        />
      )}
    </div>
  );
}