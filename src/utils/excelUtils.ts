// Excel utility functions for spreadsheet operations
export interface CellPosition {
  row: number;
  col: number;
}

export interface CellRange {
  start: CellPosition;
  end: CellPosition;
}

// Convert column number to Excel letters (A, B, C, ..., Z, AA, AB, ...)
export function getColumnLetter(col: number): string {
  let result = '';
  let tempCol = col;
  while (true) {
    result = String.fromCharCode(65 + (tempCol % 26)) + result;
    tempCol = Math.floor(tempCol / 26);
    if (tempCol === 0) break;
    tempCol--; // Adjust for 1-based indexing in Excel style
  }
  return result;
}

// Convert Excel letters to column number
export function parseColumnLetter(colStr: string): number {
  let col = 0;
  for (let i = 0; i < colStr.length; i++) {
    col = col * 26 + (colStr.charCodeAt(i) - 65 + 1);
  }
  return col - 1; // Convert to 0-based indexing
}

// Convert position to cell ID (e.g., A1, B2)
export function getCellId(row: number, col: number): string {
  return `${getColumnLetter(col)}${row + 1}`;
}

// Parse cell ID to position
export function parseCellId(cellId: string): CellPosition {
  const match = cellId.match(/^([A-Z]+)(\d+)$/);
  if (!match) return { row: 0, col: 0 };
  
  const colStr = match[1];
  const row = parseInt(match[2]) - 1;
  const col = parseColumnLetter(colStr);
  
  return { row, col };
}

// Parse range string (e.g., "A1:C3") to range object
export function parseRange(rangeStr: string): CellRange {
  const [startStr, endStr] = rangeStr.split(':');
  const start = parseCellId(startStr);
  const end = endStr ? parseCellId(endStr) : start;
  
  return {
    start: {
      row: Math.min(start.row, end.row),
      col: Math.min(start.col, end.col)
    },
    end: {
      row: Math.max(start.row, end.row),
      col: Math.max(start.col, end.col)
    }
  };
}

// Convert range to string (e.g., A1:C3)
export function rangeToString(range: CellRange): string {
  const startId = getCellId(range.start.row, range.start.col);
  const endId = getCellId(range.end.row, range.end.col);
  return startId === endId ? startId : `${startId}:${endId}`;
}

// Check if position is within range
export function isPositionInRange(pos: CellPosition, range: CellRange): boolean {
  return pos.row >= range.start.row && pos.row <= range.end.row &&
         pos.col >= range.start.col && pos.col <= range.end.col;
}

// Get all cell IDs in a range
export function getCellsInRange(range: CellRange): string[] {
  const cells: string[] = [];
  for (let row = range.start.row; row <= range.end.row; row++) {
    for (let col = range.start.col; col <= range.end.col; col++) {
      cells.push(getCellId(row, col));
    }
  }
  return cells;
}

// Normalize range (ensure start is top-left, end is bottom-right)
export function normalizeRange(start: CellPosition, end: CellPosition): CellRange {
  return {
    start: {
      row: Math.min(start.row, end.row),
      col: Math.min(start.col, end.col)
    },
    end: {
      row: Math.max(start.row, end.row),
      col: Math.max(start.col, end.col)
    }
  };
}

// Check if two ranges overlap
export function rangesOverlap(range1: CellRange, range2: CellRange): boolean {
  return !(range1.end.row < range2.start.row || 
           range2.end.row < range1.start.row || 
           range1.end.col < range2.start.col || 
           range2.end.col < range1.start.col);
}

// Merge overlapping ranges
export function mergeRanges(range1: CellRange, range2: CellRange): CellRange {
  return {
    start: {
      row: Math.min(range1.start.row, range2.start.row),
      col: Math.min(range1.start.col, range2.start.col)
    },
    end: {
      row: Math.max(range1.end.row, range2.end.row),
      col: Math.max(range1.end.col, range2.end.col)
    }
  };
}

// Format cell value for display
export function formatCellValue(value: any, type?: string): string {
  if (value === null || value === undefined || value === '') {
    return '';
  }

  if (type === 'number') {
    const num = parseFloat(value);
    if (isNaN(num)) return value.toString();
    
    // Format numbers with appropriate precision
    if (num % 1 === 0) {
      return num.toString();
    } else {
      return num.toFixed(2);
    }
  }

  if (type === 'currency') {
    const num = parseFloat(value);
    if (isNaN(num)) return value.toString();
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  }

  if (type === 'percentage') {
    const num = parseFloat(value);
    if (isNaN(num)) return value.toString();
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2
    }).format(num / 100);
  }

  return value.toString();
}

// Auto-detect cell type from value
export function detectCellType(value: string): 'text' | 'number' | 'formula' | 'boolean' | 'date' {
  if (!value || typeof value !== 'string') return 'text';
  
  if (value.startsWith('=')) return 'formula';
  
  if (value.toLowerCase() === 'true' || value.toLowerCase() === 'false') {
    return 'boolean';
  }
  
  if (!isNaN(Number(value)) && value.trim() !== '') return 'number';
  
  // Simple date detection
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(value) || 
      /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return 'date';
  }
  
  return 'text';
}

// Convert Excel-style column width to CSS pixels
export function columnWidthToPx(width: number): number {
  // Excel default column width is ~64 pixels for width 8.43
  return Math.round(width * 7.6);
}

// Convert CSS pixels to Excel-style column width
export function pxToColumnWidth(px: number): number {
  return Math.round(px / 7.6 * 100) / 100;
}

// Generate unique cell key for React rendering
export function getCellKey(row: number, col: number): string {
  return `cell-${row}-${col}`;
}

// Check if value represents a valid Excel formula
export function isValidFormula(value: string): boolean {
  if (!value.startsWith('=')) return false;
  
  const formula = value.slice(1);
  // Basic validation - should contain only allowed characters
  return /^[A-Za-z0-9+\-*/().,:\s'"!$]+$/.test(formula);
}