import { useState, useEffect } from 'react';
import { SpreadsheetGrid } from './SpreadsheetGrid';
import { SpreadsheetToolbar } from './SpreadsheetToolbar';
import { FormulaBar } from './FormulaBar';
import { ComplianceBanner } from './ComplianceBanner';
import { useSpreadsheetEngine } from '@/hooks/useSpreadsheetEngine';
import { useCradleSheets } from '@/hooks/useCradleSheets';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileSpreadsheet } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface Sheet {
  id: string;
  name: string;
  data: any;
  active?: boolean;
}

export function CradleSpreadsheet() {
  const [activeCell, setActiveCell] = useState('A1');
  const [currentFormula, setCurrentFormula] = useState('');
  const [activeSheetId, setActiveSheetId] = useState<string>('');
  const { toast } = useToast();
  
  const {
    sheets,
    loading,
    createSheet,
    updateSheet,
    deleteSheet,
    renameSheet
  } = useCradleSheets();

  const {
    data,
    updateCell,
    undo,
    redo,
    canUndo,
    canRedo,
    exportToCSV,
    setData
  } = useSpreadsheetEngine();

  // Set active sheet on load
  useEffect(() => {
    if (sheets.length > 0 && !activeSheetId) {
      setActiveSheetId(sheets[0].id);
      if (sheets[0].data?.cells) {
        setData({
          cells: sheets[0].data.cells || {},
          rows: sheets[0].data.rows || 100,
          cols: sheets[0].data.cols || 26
        });
      }
    }
  }, [sheets, activeSheetId, setData]);

  const activeSheet = sheets.find(s => s.id === activeSheetId);

  const handleCellChange = async (cellId: string, value: string) => {
    updateCell(cellId, value);
    
    // Auto-save to database
    if (activeSheet) {
      const updatedData = {
        ...activeSheet.data,
        cells: { ...data.cells, [cellId]: { value } }
      };
      await updateSheet(activeSheet.id, updatedData);
    }
  };

  const handleFormulaSubmit = async (formula: string) => {
    updateCell(activeCell, formula);
    setCurrentFormula('');
    
    // Auto-save to database
    if (activeSheet) {
      const updatedData = {
        ...activeSheet.data,
        cells: { ...data.cells, [activeCell]: { value: formula } }
      };
      await updateSheet(activeSheet.id, updatedData);
    }
  };

  const handleNewSheet = async () => {
    const newSheet = await createSheet(`Sheet ${sheets.length + 1}`);
    if (newSheet) {
      setActiveSheetId(newSheet.id);
      setData({
        cells: {},
        rows: 100, 
        cols: 26
      });
    }
  };

  const handleSaveSheet = async () => {
    if (activeSheet) {
      const updatedData = {
        ...activeSheet.data,
        cells: data.cells,
        rows: data.rows,
        cols: data.cols,
        activeCell
      };
      await updateSheet(activeSheet.id, updatedData);
      toast({
        title: "Sheet saved",
        description: `${activeSheet.name} has been saved successfully.`
      });
    }
  };

  const handleRenameSheet = async (name: string) => {
    if (activeSheet) {
      await renameSheet(activeSheet.id, name);
    }
  };

  const handleDeleteSheet = async () => {
    if (activeSheet && sheets.length > 1) {
      await deleteSheet(activeSheet.id);
      // Switch to first remaining sheet
      const remainingSheets = sheets.filter(s => s.id !== activeSheet.id);
      if (remainingSheets.length > 0) {
        setActiveSheetId(remainingSheets[0].id);
      }
    } else {
      toast({
        title: "Cannot delete sheet",
        description: "You must have at least one sheet.",
        variant: "destructive"
      });
    }
  };

  const handleSheetSwitch = (sheetId: string) => {
    const sheet = sheets.find(s => s.id === sheetId);
    if (sheet) {
      setActiveSheetId(sheetId);
      setData({
        cells: sheet.data?.cells || {},
        rows: sheet.data?.rows || 100,
        cols: sheet.data?.cols || 26
      });
      setActiveCell(sheet.data?.activeCell || 'A1');
    }
  };

  const handleImportData = async (importedData: Record<string, any>) => {
    setData(prev => ({
      ...prev,
      cells: { ...prev.cells, ...importedData }
    }));
    
    // Save imported data
    if (activeSheet) {
      const updatedData = {
        ...activeSheet.data,
        cells: { ...data.cells, ...importedData }
      };
      await updateSheet(activeSheet.id, updatedData);
    }
  };

  const handleExportData = (format: 'csv' | 'xlsx') => {
    if (format === 'csv') {
      exportToCSV();
    } else {
      toast({
        title: "Export format not supported",
        description: "Excel export will be available in a future update.",
        variant: "destructive"
      });
    }
  };

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
                <h3 className="text-xl font-semibold mb-2">
                  Welcome to the Cradle Spreadsheet Lab
                </h3>
                <p className="text-muted-foreground mb-6">
                  Create your first spreadsheet to start experimenting with strategies, analyzing data, and connecting with StagAlgo's systems.
                </p>
                <Button onClick={handleNewSheet} className="bg-gradient-primary hover:opacity-90">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Sheet
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <ComplianceBanner />
      
      <div className="flex flex-col h-full">
        {/* Sheet Tabs */}
        <Tabs value={activeSheetId} onValueChange={handleSheetSwitch} className="w-full">
          <div className="border-b border-border">
            <TabsList className="h-10 p-0 bg-transparent">
              {sheets.map((sheet) => (
                <TabsTrigger
                  key={sheet.id}
                  value={sheet.id}
                  className="data-[state=active]:bg-background data-[state=active]:border-b-2 data-[state=active]:border-primary rounded-none px-4 py-2"
                >
                  {sheet.name}
                </TabsTrigger>
              ))}
              <Button
                onClick={handleNewSheet}
                size="sm"
                variant="ghost"
                className="ml-2 h-8 w-8 p-0"
              >
                <Plus className="w-4 h-4" />
              </Button>
            </TabsList>
          </div>

          <TabsContent value={activeSheetId} className="space-y-0 mt-0">
            {/* Toolbar */}
            <SpreadsheetToolbar
              currentSheet={activeSheet?.name || ''}
              onNewSheet={handleNewSheet}
              onSaveSheet={handleSaveSheet}
              onRenameSheet={handleRenameSheet}
              onDeleteSheet={handleDeleteSheet}
              onImportData={handleImportData}
              onExportData={handleExportData}
              onUndo={undo}
              onRedo={redo}
              canUndo={canUndo}
              canRedo={canRedo}
            />

            {/* Formula Bar */}
            <FormulaBar
              activeCell={activeCell}
              formula={currentFormula}
              onFormulaChange={setCurrentFormula}
              onFormulaSubmit={handleFormulaSubmit}
            />

            {/* Spreadsheet Grid */}
            <div className="flex-1 overflow-hidden">
              <SpreadsheetGrid
                data={data.cells}
                rows={data.rows}
                cols={data.cols}
                activeCell={activeCell}
                onCellChange={handleCellChange}
                onActiveCellChange={setActiveCell}
                onFormulaChange={setCurrentFormula}
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}