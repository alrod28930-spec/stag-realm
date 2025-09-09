// Main Excel-like spreadsheet component
import React, { useState, useCallback, useEffect } from 'react';
import { ExcelGrid } from './ExcelGrid';
import { ExcelToolbar } from './ExcelToolbar';
import { ExcelFormulaBar } from './ExcelFormulaBar';
import { ComplianceBanner } from './ComplianceBanner';
import { CradleErrorBoundary } from './CradleErrorBoundary';
import { useExcelEngine } from '@/hooks/useExcelEngine';
import { useCradleSheets } from '@/hooks/useCradleSheets';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileSpreadsheet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { Cell } from '@/utils/excelFormulas';
import { getCellId } from '@/utils/excelUtils';

export function ExcelSpreadsheet() {
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const [selection, setSelection] = useState<any>(null);
  const [currentFormula, setCurrentFormula] = useState('');
  const { toast } = useToast();
  
  const { sheets, loading, createSheet, updateSheet, deleteSheet, renameSheet } = useCradleSheets();
  const engine = useExcelEngine();

  // Set active sheet on load
  React.useEffect(() => {
    if (sheets.length > 0 && !activeSheetId) {
      setActiveSheetId(sheets[0].id);
      if (sheets[0].data?.cells) {
        engine.setData({
          cells: sheets[0].data.cells || {},
          rows: sheets[0].data.rows || 1000,
          cols: sheets[0].data.cols || 100,
          columnWidths: sheets[0].data.columnWidths || {},
          rowHeights: sheets[0].data.rowHeights || {},
          frozenRows: 0,
          frozenCols: 0
        });
      }
    }
  }, [sheets, activeSheetId, engine]);

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  const handleCellChange = useCallback((cellId: string, value: string) => {
    engine.updateCell(cellId, value);
    
    // Auto-save to database/localStorage
    if (activeSheet) {
      const updatedData = {
        ...activeSheet.data,
        cells: engine.data.cells
      };
      updateSheet(activeSheet.id, updatedData);
    }
  }, [engine, activeSheet, updateSheet]);

  const handleNewSheet = useCallback(async () => {
    const newSheet = await createSheet(`Sheet ${sheets.length + 1}`);
    if (newSheet) {
      setActiveSheetId(newSheet.id);
      engine.setData({
        cells: {},
        rows: 1000,
        cols: 100,
        columnWidths: {},
        rowHeights: {},
        frozenRows: 0,
        frozenCols: 0
      });
    }
  }, [createSheet, sheets.length, engine]);

  const getSelectedCellData = useCallback((): Record<string, Cell> => {
    if (!selection) return {};
    
    const selectedCells = selection.isSelecting ? [] : 
      selection.selectedRange ? 
        // Get all cells in range
        (() => {
          const cells: string[] = [];
          if (selection.selectedRange) {
            const { startRow, endRow, startCol, endCol } = selection.selectedRange;
            for (let r = startRow; r <= endRow; r++) {
              for (let c = startCol; c <= endCol; c++) {
                cells.push(getCellId(r, c));
              }
            }
          }
          return cells;
        })() :
        [getCellId(selection.activeCell.row, selection.activeCell.col)];
    
    const cellData: Record<string, Cell> = {};
    selectedCells.forEach(cellId => {
      if (engine.data.cells[cellId]) {
        cellData[cellId] = engine.data.cells[cellId];
      }
    });
    
    return cellData;
  }, [selection, engine.data.cells]);

  const getSelectedCellIds = useCallback((): string[] => {
    if (!selection) return [];
    
    if (selection.selectedRange) {
      const cells: string[] = [];
      const { startRow, endRow, startCol, endCol } = selection.selectedRange;
      for (let r = startRow; r <= endRow; r++) {
        for (let c = startCol; c <= endCol; c++) {
          cells.push(getCellId(r, c));
        }
      }
      return cells;
    }
    
    return [getCellId(selection.activeCell.row, selection.activeCell.col)];
  }, [selection]);

  // Update formula bar when selection changes
  useEffect(() => {
    if (selection) {
      const cellId = getCellId(selection.activeCell.row, selection.activeCell.col);
      const cell = engine.data.cells[cellId];
      setCurrentFormula(cell?.formula || cell?.value || '');
    }
  }, [selection, engine.data.cells]);

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-full" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (sheets.length === 0) {
    return (
      <div className="space-y-6">
        <ComplianceBanner />
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <FileSpreadsheet className="w-16 h-16 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-xl font-semibold mb-2">Excel-like Spreadsheet</h3>
                <p className="text-muted-foreground mb-6">
                  Create professional spreadsheets with advanced Excel features, formulas, and StagAlgo integrations.
                </p>
                <Button onClick={handleNewSheet} className="bg-gradient-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Excel Spreadsheet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <CradleErrorBoundary>
      <div className="space-y-4">
        <ComplianceBanner />
        
        <Tabs value={activeSheetId} onValueChange={setActiveSheetId} className="w-full">
          <div className="border-b border-border">
            <TabsList className="h-10 p-0 bg-transparent">
              {sheets.map((sheet) => (
                <TabsTrigger key={sheet.id} value={sheet.id} className="data-[state=active]:bg-background">
                  {sheet.name}
                </TabsTrigger>
              ))}
              <Button onClick={handleNewSheet} size="sm" variant="ghost" className="ml-2 h-8 w-8 p-0">
                <Plus className="w-4 h-4" />
              </Button>
            </TabsList>
          </div>

          <TabsContent value={activeSheetId} className="space-y-0 mt-0">
            <ExcelToolbar
              currentSheet={activeSheet?.name || ''}
              selectedCells={getSelectedCellIds()}
              selectedCellData={getSelectedCellData()}
              onNewSheet={handleNewSheet}
              onSaveSheet={() => {
                if (activeSheet) {
                  updateSheet(activeSheet.id, engine.data);
                  toast({
                    title: "Sheet saved",
                    description: "Your changes have been saved."
                  });
                }
              }}
              onRenameSheet={(name) => activeSheet && renameSheet(activeSheet.id, name)}
              onDeleteSheet={() => {
                if (activeSheet && sheets.length > 1) {
                  deleteSheet(activeSheet.id);
                  // Switch to first remaining sheet
                  const remainingSheets = sheets.filter(s => s.id !== activeSheet.id);
                  if (remainingSheets.length > 0) {
                    setActiveSheetId(remainingSheets[0].id);
                  }
                }
              }}
              onImportData={(data) => {
                engine.updateCells(data, 'Import data');
                if (activeSheet) {
                  updateSheet(activeSheet.id, { ...activeSheet.data, cells: engine.data.cells });
                }
              }}
              onExportData={engine.exportToCSV}
              onUndo={engine.undo}
              onRedo={engine.redo}
              canUndo={engine.canUndo}
              canRedo={engine.canRedo}
              onCopy={() => {
                const selectedCells = getSelectedCellIds();
                engine.copyCells(selectedCells);
              }}
              onCut={() => {
                const selectedCells = getSelectedCellIds();
                engine.cutCells(selectedCells);
              }}
              onPaste={() => {
                if (selection) {
                  const cellId = getCellId(selection.activeCell.row, selection.activeCell.col);
                  engine.pasteCells(cellId);
                }
              }}
              onApplyFormatting={(formatting) => {
                const selectedCells = getSelectedCellIds();
                engine.applyCellFormatting(selectedCells, formatting);
                if (activeSheet) {
                  updateSheet(activeSheet.id, { ...activeSheet.data, cells: engine.data.cells });
                }
              }}
              onSetFormat={(format) => {
                const selectedCells = getSelectedCellIds();
                engine.setCellFormat(selectedCells, format);
                if (activeSheet) {
                  updateSheet(activeSheet.id, { ...activeSheet.data, cells: engine.data.cells });
                }
              }}
            />

            <ExcelFormulaBar
              activeCell={selection ? getCellId(selection.activeCell.row, selection.activeCell.col) : 'A1'}
              formula={currentFormula}
              onFormulaChange={setCurrentFormula}
              onFormulaSubmit={(formula) => {
                if (selection) {
                  const cellId = getCellId(selection.activeCell.row, selection.activeCell.col);
                  handleCellChange(cellId, formula);
                }
              }}
            />

            <ExcelGrid
              data={engine.data.cells}
              rows={engine.data.rows}
              cols={engine.data.cols}
              columnWidths={engine.data.columnWidths}
              rowHeights={engine.data.rowHeights}
              onCellChange={handleCellChange}
              onCellDoubleClick={() => {}}
              onSelectionChange={setSelection}
              onColumnResize={engine.setColumnWidth}
              onRowResize={engine.setRowHeight}
              onContextMenu={() => {}}
            />
          </TabsContent>
        </Tabs>
      </div>
    </CradleErrorBoundary>
  );
}