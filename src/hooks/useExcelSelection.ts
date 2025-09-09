// Excel-like cell selection and range management
import { useState, useCallback, useRef } from 'react';
import { CellPosition, CellRange, normalizeRange, getCellId, parseCellId, isPositionInRange } from '@/utils/excelUtils';

export interface SelectionState {
  activeCell: CellPosition;
  selectedRange: CellRange | null;
  isSelecting: boolean;
  multiSelection: CellRange[];
}

export function useExcelSelection(rows: number, cols: number) {
  const [selection, setSelection] = useState<SelectionState>({
    activeCell: { row: 0, col: 0 },
    selectedRange: null,
    isSelecting: false,
    multiSelection: []
  });

  const selectionStartRef = useRef<CellPosition | null>(null);
  const isMouseDownRef = useRef(false);

  // Set active cell
  const setActiveCell = useCallback((position: CellPosition) => {
    setSelection(prev => ({
      ...prev,
      activeCell: position,
      selectedRange: null,
      multiSelection: []
    }));
  }, []);

  // Start selection (mouse down)
  const startSelection = useCallback((position: CellPosition, ctrlKey = false) => {
    isMouseDownRef.current = true;
    selectionStartRef.current = position;

    if (ctrlKey) {
      // Multi-selection with Ctrl key
      setSelection(prev => ({
        ...prev,
        activeCell: position,
        isSelecting: true
      }));
    } else {
      setSelection(prev => ({
        ...prev,
        activeCell: position,
        selectedRange: null,
        isSelecting: true,
        multiSelection: []
      }));
    }
  }, []);

  // Update selection (mouse move while down)
  const updateSelection = useCallback((position: CellPosition) => {
    if (!isMouseDownRef.current || !selectionStartRef.current) return;

    const range = normalizeRange(selectionStartRef.current, position);
    
    setSelection(prev => ({
      ...prev,
      selectedRange: range
    }));
  }, []);

  // End selection (mouse up)
  const endSelection = useCallback((position: CellPosition, ctrlKey = false) => {
    if (!selectionStartRef.current) return;

    isMouseDownRef.current = false;
    const range = normalizeRange(selectionStartRef.current, position);

    if (ctrlKey) {
      // Add to multi-selection
      setSelection(prev => ({
        ...prev,
        multiSelection: [...prev.multiSelection, range],
        selectedRange: null,
        isSelecting: false
      }));
    } else {
      // Single selection
      setSelection(prev => ({
        ...prev,
        selectedRange: range.start.row === range.end.row && 
                      range.start.col === range.end.col ? null : range,
        isSelecting: false
      }));
    }

    selectionStartRef.current = null;
  }, []);

  // Select range programmatically
  const selectRange = useCallback((range: CellRange) => {
    setSelection(prev => ({
      ...prev,
      selectedRange: range,
      activeCell: range.start,
      multiSelection: []
    }));
  }, []);

  // Select entire row
  const selectRow = useCallback((row: number) => {
    const range: CellRange = {
      start: { row, col: 0 },
      end: { row, col: cols - 1 }
    };
    selectRange(range);
  }, [cols, selectRange]);

  // Select entire column
  const selectColumn = useCallback((col: number) => {
    const range: CellRange = {
      start: { row: 0, col },
      end: { row: rows - 1, col }
    };
    selectRange(range);
  }, [rows, selectRange]);

  // Select all cells
  const selectAll = useCallback(() => {
    const range: CellRange = {
      start: { row: 0, col: 0 },
      end: { row: rows - 1, col: cols - 1 }
    };
    selectRange(range);
  }, [rows, cols, selectRange]);

  // Move selection with keyboard
  const moveSelection = useCallback((direction: 'up' | 'down' | 'left' | 'right', extend = false) => {
    setSelection(prev => {
      const { activeCell, selectedRange } = prev;
      let newActiveCell = { ...activeCell };

      switch (direction) {
        case 'up':
          newActiveCell.row = Math.max(0, activeCell.row - 1);
          break;
        case 'down':
          newActiveCell.row = Math.min(rows - 1, activeCell.row + 1);
          break;
        case 'left':
          newActiveCell.col = Math.max(0, activeCell.col - 1);
          break;
        case 'right':
          newActiveCell.col = Math.min(cols - 1, activeCell.col + 1);
          break;
      }

      if (extend && (selectedRange || activeCell.row !== newActiveCell.row || activeCell.col !== newActiveCell.col)) {
        // Extend selection
        const startPos = selectedRange?.start || activeCell;
        const newRange = normalizeRange(startPos, newActiveCell);
        
        return {
          ...prev,
          activeCell: newActiveCell,
          selectedRange: newRange
        };
      } else {
        // Move without extending
        return {
          ...prev,
          activeCell: newActiveCell,
          selectedRange: null,
          multiSelection: []
        };
      }
    });
  }, [rows, cols]);

  // Clear selection
  const clearSelection = useCallback(() => {
    setSelection(prev => ({
      ...prev,
      selectedRange: null,
      multiSelection: []
    }));
  }, []);

  // Check if position is selected
  const isPositionSelected = useCallback((position: CellPosition): boolean => {
    const { activeCell, selectedRange, multiSelection } = selection;
    
    // Check active cell
    if (position.row === activeCell.row && position.col === activeCell.col) {
      return true;
    }

    // Check main selection range
    if (selectedRange && isPositionInRange(position, selectedRange)) {
      return true;
    }

    // Check multi-selection ranges
    return multiSelection.some(range => isPositionInRange(position, range));
  }, [selection]);

  // Get all selected cell IDs
  const getSelectedCellIds = useCallback((): string[] => {
    const { activeCell, selectedRange, multiSelection } = selection;
    const cellIds = new Set<string>();

    // Add active cell
    cellIds.add(getCellId(activeCell.row, activeCell.col));

    // Add cells from main selection
    if (selectedRange) {
      for (let row = selectedRange.start.row; row <= selectedRange.end.row; row++) {
        for (let col = selectedRange.start.col; col <= selectedRange.end.col; col++) {
          cellIds.add(getCellId(row, col));
        }
      }
    }

    // Add cells from multi-selection
    multiSelection.forEach(range => {
      for (let row = range.start.row; row <= range.end.row; row++) {
        for (let col = range.start.col; col <= range.end.col; col++) {
          cellIds.add(getCellId(row, col));
        }
      }
    });

    return Array.from(cellIds);
  }, [selection]);

  // Get selected range as string (e.g., "A1:C3")
  const getSelectedRangeString = useCallback((): string => {
    const { selectedRange, activeCell } = selection;
    
    if (selectedRange) {
      const startId = getCellId(selectedRange.start.row, selectedRange.start.col);
      const endId = getCellId(selectedRange.end.row, selectedRange.end.col);
      return startId === endId ? startId : `${startId}:${endId}`;
    }
    
    return getCellId(activeCell.row, activeCell.col);
  }, [selection]);

  // Navigate to next/previous cell (Tab/Shift+Tab behavior)
  const navigateNext = useCallback((reverse: boolean = false) => {
    setSelection(prev => {
      const { activeCell } = prev;
      let newRow = activeCell.row;
      let newCol = activeCell.col;

      if (reverse) {
        newCol -= 1;
        if (newCol < 0) {
          newCol = cols - 1;
          newRow -= 1;
          if (newRow < 0) {
            newRow = rows - 1;
          }
        }
      } else {
        newCol += 1;
        if (newCol >= cols) {
          newCol = 0;
          newRow += 1;
          if (newRow >= rows) {
            newRow = 0;
          }
        }
      }

      return {
        ...prev,
        activeCell: { row: newRow, col: newCol },
        selectedRange: null,
        multiSelection: []
      };
    });
  }, [rows, cols]);

  return {
    selection,
    setActiveCell,
    startSelection,
    updateSelection,
    endSelection,
    selectRange,
    selectRow,
    selectColumn,
    selectAll,
    moveSelection,
    clearSelection,
    isPositionSelected,
    getSelectedCellIds,
    getSelectedRangeString,
    navigateNext
  };
}