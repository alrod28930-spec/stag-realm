// Advanced formula evaluation system for Excel-like functionality
import { getCellsInRange, parseRange, parseCellId, getCellId, CellPosition } from './excelUtils';

export interface Cell {
  value: string;
  formula?: string;
  type?: 'text' | 'number' | 'formula' | 'boolean' | 'date';
  style?: {
    bold?: boolean;
    italic?: boolean;
    underline?: boolean;
    color?: string;
    backgroundColor?: string;
    fontSize?: string;
    fontFamily?: string;
    textAlign?: 'left' | 'center' | 'right';
    borderTop?: string;
    borderRight?: string;
    borderBottom?: string;
    borderLeft?: string;
  };
  format?: 'general' | 'number' | 'currency' | 'percentage' | 'date' | 'text';
  error?: string;
}

export type CellData = Record<string, Cell>;

export class FormulaEngine {
  private cells: CellData;
  private dependencies: Map<string, Set<string>> = new Map();
  private dependents: Map<string, Set<string>> = new Map();
  private calculating: Set<string> = new Set();

  constructor(cells: CellData = {}) {
    this.cells = cells;
    this.buildDependencyGraph();
  }

  // Update cells and rebuild dependencies
  updateCells(cells: CellData) {
    this.cells = cells;
    this.buildDependencyGraph();
  }

  // Build dependency graph for formula cells
  private buildDependencyGraph() {
    this.dependencies.clear();
    this.dependents.clear();

    Object.entries(this.cells).forEach(([cellId, cell]) => {
      if (cell.formula) {
        const refs = this.extractCellReferences(cell.formula);
        this.dependencies.set(cellId, new Set(refs));
        
        refs.forEach(ref => {
          if (!this.dependents.has(ref)) {
            this.dependents.set(ref, new Set());
          }
          this.dependents.get(ref)!.add(cellId);
        });
      }
    });
  }

  // Extract cell references from formula
  private extractCellReferences(formula: string): string[] {
    const refs: string[] = [];
    
    // Single cell references (A1, B2, etc.)
    const cellPattern = /\b[A-Z]+\d+\b/g;
    let match;
    while ((match = cellPattern.exec(formula)) !== null) {
      refs.push(match[0]);
    }
    
    // Range references (A1:B3)
    const rangePattern = /\b[A-Z]+\d+:[A-Z]+\d+\b/g;
    while ((match = rangePattern.exec(formula)) !== null) {
      const range = parseRange(match[0]);
      const cellsInRange = getCellsInRange(range);
      refs.push(...cellsInRange);
    }
    
    return [...new Set(refs)]; // Remove duplicates
  }

  // Evaluate a single formula
  evaluateFormula(formula: string, cellId: string): string {
    try {
      // Check for circular references
      if (this.calculating.has(cellId)) {
        return '#CIRCULAR!';
      }

      this.calculating.add(cellId);
      
      // Remove leading =
      const expr = formula.startsWith('=') ? formula.slice(1) : formula;
      
      // Handle different function types
      const result = this.evaluateExpression(expr, cellId);
      
      this.calculating.delete(cellId);
      return result;
      
    } catch (error) {
      this.calculating.delete(cellId);
      return '#ERROR!';
    }
  }

  // Main expression evaluator
  private evaluateExpression(expr: string, cellId: string): string {
    // StagAlgo custom functions
    if (expr.startsWith('ANALYST(')) {
      return this.evaluateAnalystFunction(expr);
    }
    
    if (expr.startsWith('ORACLE(')) {
      return this.evaluateOracleFunction(expr);
    }
    
    if (expr.startsWith('PORTFOLIO(')) {
      return this.evaluatePortfolioFunction(expr);
    }
    
    if (expr.startsWith('BID(')) {
      return this.evaluateBidFunction(expr);
    }
    
    if (expr.startsWith('TRADEBOT(')) {
      return this.evaluateTradebotFunction(expr);
    }

    // Standard Excel functions
    if (expr.startsWith('SUM(')) {
      return this.evaluateSumFunction(expr);
    }
    
    if (expr.startsWith('AVERAGE(') || expr.startsWith('AVG(')) {
      return this.evaluateAverageFunction(expr);
    }
    
    if (expr.startsWith('COUNT(')) {
      return this.evaluateCountFunction(expr);
    }
    
    if (expr.startsWith('MAX(')) {
      return this.evaluateMaxFunction(expr);
    }
    
    if (expr.startsWith('MIN(')) {
      return this.evaluateMinFunction(expr);
    }
    
    if (expr.startsWith('IF(')) {
      return this.evaluateIfFunction(expr);
    }
    
    if (expr.startsWith('CONCATENATE(') || expr.startsWith('CONCAT(')) {
      return this.evaluateConcatenateFunction(expr);
    }

    // Cell reference (e.g., A1)
    if (/^[A-Z]+\d+$/.test(expr)) {
      return this.getCellValue(expr);
    }
    
    // Range operations or arithmetic
    return this.evaluateArithmetic(expr);
  }

  // Get cell value with dependency tracking
  private getCellValue(cellId: string): string {
    const cell = this.cells[cellId];
    if (!cell) return '0';
    
    if (cell.formula && !this.calculating.has(cellId)) {
      return this.evaluateFormula(cell.formula, cellId);
    }
    
    return cell.value || '0';
  }

  // StagAlgo function evaluations (mock implementations)
  private evaluateAnalystFunction(expr: string): string {
    const symbolMatch = expr.match(/ANALYST\(['"]([^'"]+)['"]\)/);
    if (symbolMatch) {
      const symbol = symbolMatch[1];
      // Mock analyst data - in real implementation, this would call the analyst service
      const mockData = {
        'AAPL': 'BUY - Strong fundamentals, 15% upside',
        'TSLA': 'HOLD - Volatile, wait for dip',
        'MSFT': 'BUY - Cloud growth continues',
        'GOOGL': 'BUY - AI advantage strong'
      };
      return mockData[symbol as keyof typeof mockData] || `Analyzing ${symbol}...`;
    }
    return '#ERROR!';
  }

  private evaluateOracleFunction(expr: string): string {
    const symbolMatch = expr.match(/ORACLE\(['"]([^'"]+)['"]\)/);
    if (symbolMatch) {
      const symbol = symbolMatch[1];
      const mockSignals = {
        'AAPL': 'Bullish - 85% confidence',
        'TSLA': 'Bearish - 72% confidence', 
        'MSFT': 'Bullish - 91% confidence',
        'GOOGL': 'Neutral - 45% confidence'
      };
      return mockSignals[symbol as keyof typeof mockSignals] || `Oracle analyzing ${symbol}...`;
    }
    return '#ERROR!';
  }

  private evaluatePortfolioFunction(expr: string): string {
    const metricMatch = expr.match(/PORTFOLIO\(['"]([^'"]+)['"]\)/);
    if (metricMatch) {
      const metric = metricMatch[1].toUpperCase();
      const mockPortfolio = {
        'TOTAL_VALUE': '$125,450.00',
        'TOTAL_RETURN': '+12.5%',
        'CASH': '$15,230.00',
        'EQUITY': '$110,220.00',
        'DAY_PNL': '+$1,234.56',
        'POSITIONS': '8'
      };
      return mockPortfolio[metric as keyof typeof mockPortfolio] || 'N/A';
    }
    return '#ERROR!';
  }

  private evaluateBidFunction(expr: string): string {
    const symbolMatch = expr.match(/BID\(['"]([^'"]+)['"]\)/);
    if (symbolMatch) {
      const symbol = symbolMatch[1];
      const mockPrices = {
        'AAPL': '$175.43',
        'TSLA': '$242.17',
        'MSFT': '$412.88',
        'GOOGL': '$152.34'
      };
      return mockPrices[symbol as keyof typeof mockPrices] || `$${(Math.random() * 500 + 50).toFixed(2)}`;
    }
    return '#ERROR!';
  }

  private evaluateTradebotFunction(expr: string): string {
    const botMatch = expr.match(/TRADEBOT\(['"]([^'"]+)['"],\s*['"]([^'"]+)['"]\)/);
    if (botMatch) {
      const [, botName, metric] = botMatch;
      const mockData = {
        'winrate': '68.5%',
        'return': '+15.2%',
        'trades': '156',
        'profit': '+$12,543',
        'drawdown': '-2.1%'
      };
      return mockData[metric.toLowerCase() as keyof typeof mockData] || 'N/A';
    }
    return '#ERROR!';
  }

  // Standard Excel function evaluations
  private evaluateSumFunction(expr: string): string {
    const args = this.parseArguments(expr, 'SUM');
    let sum = 0;
    
    args.forEach(arg => {
      if (arg.includes(':')) {
        // Range
        const range = parseRange(arg);
        const cells = getCellsInRange(range);
        cells.forEach(cellId => {
          const value = parseFloat(this.getCellValue(cellId));
          if (!isNaN(value)) sum += value;
        });
      } else {
        // Single cell or number
        const value = /^[A-Z]+\d+$/.test(arg) ? 
          parseFloat(this.getCellValue(arg)) : 
          parseFloat(arg);
        if (!isNaN(value)) sum += value;
      }
    });
    
    return sum.toString();
  }

  private evaluateAverageFunction(expr: string): string {
    const args = this.parseArguments(expr, /AVERAGE|AVG/);
    let sum = 0;
    let count = 0;
    
    args.forEach(arg => {
      if (arg.includes(':')) {
        // Range
        const range = parseRange(arg);
        const cells = getCellsInRange(range);
        cells.forEach(cellId => {
          const value = parseFloat(this.getCellValue(cellId));
          if (!isNaN(value)) {
            sum += value;
            count++;
          }
        });
      } else {
        // Single cell or number
        const value = /^[A-Z]+\d+$/.test(arg) ? 
          parseFloat(this.getCellValue(arg)) : 
          parseFloat(arg);
        if (!isNaN(value)) {
          sum += value;
          count++;
        }
      }
    });
    
    return count > 0 ? (sum / count).toString() : '0';
  }

  private evaluateCountFunction(expr: string): string {
    const args = this.parseArguments(expr, 'COUNT');
    let count = 0;
    
    args.forEach(arg => {
      if (arg.includes(':')) {
        // Range
        const range = parseRange(arg);
        const cells = getCellsInRange(range);
        cells.forEach(cellId => {
          const value = this.getCellValue(cellId);
          if (value && value !== '0' && !isNaN(parseFloat(value))) {
            count++;
          }
        });
      } else {
        // Single cell or number
        const value = /^[A-Z]+\d+$/.test(arg) ? 
          this.getCellValue(arg) : arg;
        if (value && value !== '0' && !isNaN(parseFloat(value))) {
          count++;
        }
      }
    });
    
    return count.toString();
  }

  private evaluateMaxFunction(expr: string): string {
    const args = this.parseArguments(expr, 'MAX');
    let max = -Infinity;
    
    args.forEach(arg => {
      if (arg.includes(':')) {
        // Range
        const range = parseRange(arg);
        const cells = getCellsInRange(range);
        cells.forEach(cellId => {
          const value = parseFloat(this.getCellValue(cellId));
          if (!isNaN(value)) max = Math.max(max, value);
        });
      } else {
        // Single cell or number
        const value = /^[A-Z]+\d+$/.test(arg) ? 
          parseFloat(this.getCellValue(arg)) : 
          parseFloat(arg);
        if (!isNaN(value)) max = Math.max(max, value);
      }
    });
    
    return max === -Infinity ? '0' : max.toString();
  }

  private evaluateMinFunction(expr: string): string {
    const args = this.parseArguments(expr, 'MIN');
    let min = Infinity;
    
    args.forEach(arg => {
      if (arg.includes(':')) {
        // Range
        const range = parseRange(arg);
        const cells = getCellsInRange(range);
        cells.forEach(cellId => {
          const value = parseFloat(this.getCellValue(cellId));
          if (!isNaN(value)) min = Math.min(min, value);
        });
      } else {
        // Single cell or number
        const value = /^[A-Z]+\d+$/.test(arg) ? 
          parseFloat(this.getCellValue(arg)) : 
          parseFloat(arg);
        if (!isNaN(value)) min = Math.min(min, value);
      }
    });
    
    return min === Infinity ? '0' : min.toString();
  }

  private evaluateIfFunction(expr: string): string {
    const args = this.parseArguments(expr, 'IF');
    if (args.length !== 3) return '#ERROR!';
    
    const [condition, trueValue, falseValue] = args;
    const conditionResult = this.evaluateCondition(condition);
    
    return conditionResult ? 
      this.resolveValue(trueValue) : 
      this.resolveValue(falseValue);
  }

  private evaluateConcatenateFunction(expr: string): string {
    const args = this.parseArguments(expr, /CONCATENATE|CONCAT/);
    return args.map(arg => this.resolveValue(arg)).join('');
  }

  // Helper function to parse function arguments
  private parseArguments(expr: string, funcName: string | RegExp): string[] {
    const pattern = typeof funcName === 'string' ? 
      new RegExp(`${funcName}\\((.*)\\)`) : 
      new RegExp(`(?:${funcName.source})\\((.*)\\)`);
    
    const match = expr.match(pattern);
    if (!match) return [];
    
    const argsStr = match[1];
    const args: string[] = [];
    let current = '';
    let parenCount = 0;
    let inQuotes = false;
    
    for (let i = 0; i < argsStr.length; i++) {
      const char = argsStr[i];
      
      if (char === '"' && (i === 0 || argsStr[i - 1] !== '\\')) {
        inQuotes = !inQuotes;
      }
      
      if (!inQuotes) {
        if (char === '(') parenCount++;
        if (char === ')') parenCount--;
        
        if (char === ',' && parenCount === 0) {
          args.push(current.trim());
          current = '';
          continue;
        }
      }
      
      current += char;
    }
    
    if (current.trim()) {
      args.push(current.trim());
    }
    
    return args;
  }

  // Resolve value (could be cell reference, number, or string)
  private resolveValue(value: string): string {
    // Remove quotes if string literal
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      return value.slice(1, -1);
    }
    
    // Cell reference
    if (/^[A-Z]+\d+$/.test(value)) {
      return this.getCellValue(value);
    }
    
    // Number
    if (!isNaN(parseFloat(value))) {
      return value;
    }
    
    return value;
  }

  // Evaluate condition for IF function
  private evaluateCondition(condition: string): boolean {
    // Simple condition evaluation
    const operators = ['>=', '<=', '!=', '<>', '=', '>', '<'];
    
    for (const op of operators) {
      if (condition.includes(op)) {
        const [left, right] = condition.split(op).map(s => s.trim());
        const leftVal = this.resolveValue(left);
        const rightVal = this.resolveValue(right);
        
        const leftNum = parseFloat(leftVal);
        const rightNum = parseFloat(rightVal);
        
        if (!isNaN(leftNum) && !isNaN(rightNum)) {
          // Numeric comparison
          switch (op) {
            case '>=': return leftNum >= rightNum;
            case '<=': return leftNum <= rightNum;
            case '!=':
            case '<>': return leftNum !== rightNum;
            case '=': return leftNum === rightNum;
            case '>': return leftNum > rightNum;
            case '<': return leftNum < rightNum;
          }
        } else {
          // String comparison
          switch (op) {
            case '!=':
            case '<>': return leftVal !== rightVal;
            case '=': return leftVal === rightVal;
            default: return false;
          }
        }
      }
    }
    
    // If no operator, treat as boolean
    const value = this.resolveValue(condition);
    return value.toLowerCase() === 'true' || (parseFloat(value) || 0) !== 0;
  }

  // Simple arithmetic evaluation
  private evaluateArithmetic(expr: string): string {
    try {
      // Replace cell references with their values
      let processedExpr = expr;
      const cellRefs = expr.match(/\b[A-Z]+\d+\b/g) || [];
      
      cellRefs.forEach(cellId => {
        const value = this.getCellValue(cellId);
        const numValue = parseFloat(value) || 0;
        processedExpr = processedExpr.replace(new RegExp(`\\b${cellId}\\b`, 'g'), numValue.toString());
      });
      
      // Basic validation
      if (!/^[\d+\-*/.() ]+$/.test(processedExpr)) {
        return '#ERROR!';
      }
      
      // Safe evaluation (in production, use a proper expression parser)
      const result = Function(`"use strict"; return (${processedExpr})`)();
      return typeof result === 'number' ? result.toString() : '#ERROR!';
    } catch {
      return '#ERROR!';
    }
  }

  // Get all cells that depend on the given cell
  getDependentCells(cellId: string): string[] {
    const dependents = this.dependents.get(cellId);
    return dependents ? Array.from(dependents) : [];
  }

  // Recalculate all dependent cells
  recalculateDependents(cellId: string): Map<string, string> {
    const updates = new Map<string, string>();
    const toRecalculate = new Set([cellId]);
    const processed = new Set<string>();
    
    while (toRecalculate.size > 0) {
      const current = toRecalculate.values().next().value;
      toRecalculate.delete(current);
      
      if (processed.has(current)) continue;
      processed.add(current);
      
      const dependents = this.getDependentCells(current);
      dependents.forEach(dep => {
        const cell = this.cells[dep];
        if (cell && cell.formula) {
          const newValue = this.evaluateFormula(cell.formula, dep);
          if (newValue !== cell.value) {
            updates.set(dep, newValue);
            toRecalculate.add(dep);
          }
        }
      });
    }
    
    return updates;
  }
}