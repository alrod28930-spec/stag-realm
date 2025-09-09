// Advanced Excel-like toolbar with functional formatting buttons
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Plus, 
  Save, 
  Download, 
  Upload, 
  Trash2, 
  Bold, 
  Italic, 
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  FileSpreadsheet,
  FileText,
  Undo,
  Redo,
  Scissors,
  Copy,
  Clipboard,
  Type,
  DollarSign,
  Percent
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { Cell } from '@/utils/excelFormulas';

interface ExcelToolbarProps {
  currentSheet: string;
  selectedCells: string[];
  selectedCellData: Record<string, Cell>;
  onNewSheet: () => void;
  onSaveSheet: () => void;
  onRenameSheet: (name: string) => void;
  onDeleteSheet: () => void;
  onImportData: (data: any) => void;
  onExportData: (format: 'csv' | 'xlsx') => void;
  onUndo: () => void;
  onRedo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onCopy: () => void;
  onCut: () => void;
  onPaste: () => void;
  onApplyFormatting: (formatting: Partial<Cell['style']>) => void;
  onSetFormat: (format: Cell['format']) => void;
}

const colorPalette = [
  '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  '#800000', '#008000', '#000080', '#808000', '#800080', '#008080', '#C0C0C0', '#808080',
  '#FF9999', '#99FF99', '#9999FF', '#FFFF99', '#FF99FF', '#99FFFF', '#FFE6CC', '#CCFFCC'
];

export function ExcelToolbar({
  currentSheet,
  selectedCells,
  selectedCellData,
  onNewSheet,
  onSaveSheet,
  onRenameSheet,
  onDeleteSheet,
  onImportData,
  onExportData,
  onUndo,
  onRedo,
  canUndo,
  canRedo,
  onCopy,
  onCut,
  onPaste,
  onApplyFormatting,
  onSetFormat
}: ExcelToolbarProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(currentSheet);
  const { toast } = useToast();

  // Get current formatting state from selected cells
  const getFormatState = (property: keyof Cell['style']): boolean => {
    if (selectedCells.length === 0) return false;
    return selectedCells.some(cellId => selectedCellData[cellId]?.style?.[property]);
  };

  const isBold = getFormatState('bold');
  const isItalic = getFormatState('italic');
  const isUnderline = getFormatState('underline');

  const handleRename = () => {
    onRenameSheet(newName);
    setIsRenaming(false);
  };

  const handleFileImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
          // Parse CSV
          const csv = e.target?.result as string;
          const lines = csv.split('\n');
          const data: Record<string, any> = {};
          
          lines.forEach((line, rowIndex) => {
            if (line.trim()) {
              const values = line.split(',');
              values.forEach((value, colIndex) => {
                const cellId = `${String.fromCharCode(65 + colIndex)}${rowIndex + 1}`;
                data[cellId] = { value: value.trim().replace(/"/g, '') };
              });
            }
          });
          
          onImportData(data);
          toast({
            title: "Import successful",
            description: `Imported ${file.name} successfully.`
          });
        } else {
          toast({
            title: "Unsupported format",
            description: "Please import CSV files only.",
            variant: "destructive"
          });
        }
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Failed to parse the file.",
          variant: "destructive"
        });
      }
    };
    reader.readAsText(file);
    
    // Reset input
    event.target.value = '';
  };

  const handleBoldToggle = () => {
    onApplyFormatting({ bold: !isBold });
  };

  const handleItalicToggle = () => {
    onApplyFormatting({ italic: !isItalic });
  };

  const handleUnderlineToggle = () => {
    onApplyFormatting({ underline: !isUnderline });
  };

  const handleAlignmentChange = (alignment: 'left' | 'center' | 'right') => {
    onApplyFormatting({ textAlign: alignment });
  };

  const handleColorChange = (color: string, isBackground = false) => {
    if (isBackground) {
      onApplyFormatting({ backgroundColor: color });
    } else {
      onApplyFormatting({ color: color });
    }
  };

  const handleFormatChange = (format: Cell['format']) => {
    onSetFormat(format);
  };

  return (
    <div className="flex items-center gap-2 p-3 border-b border-border bg-background flex-wrap">
      {/* Sheet Management */}
      <div className="flex items-center gap-2 border-r border-border pr-4">
        <Button onClick={onNewSheet} size="sm" variant="outline">
          <Plus className="w-4 h-4 mr-2" />
          New Sheet
        </Button>
        
        {isRenaming ? (
          <div className="flex items-center gap-1">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onBlur={handleRename}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRename();
                if (e.key === 'Escape') setIsRenaming(false);
              }}
              className="h-8 w-32 text-sm"
              autoFocus
            />
          </div>
        ) : (
          <Button
            onClick={() => setIsRenaming(true)}
            size="sm"
            variant="ghost"
            className="font-medium"
          >
            {currentSheet}
          </Button>
        )}

        <Button onClick={onSaveSheet} size="sm" variant="outline">
          <Save className="w-4 h-4 mr-2" />
          Save
        </Button>

        <Button
          onClick={onDeleteSheet}
          size="sm"
          variant="outline"
          className="text-destructive hover:text-destructive"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Edit Actions */}
      <div className="flex items-center gap-1 border-r border-border pr-4">
        <Button
          onClick={onUndo}
          disabled={!canUndo}
          size="sm"
          variant="outline"
          title="Undo"
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          size="sm"
          variant="outline"
          title="Redo"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* Clipboard Actions */}
      <div className="flex items-center gap-1 border-r border-border pr-4">
        <Button onClick={onCut} size="sm" variant="outline" title="Cut">
          <Scissors className="w-4 h-4" />
        </Button>
        <Button onClick={onCopy} size="sm" variant="outline" title="Copy">
          <Copy className="w-4 h-4" />
        </Button>
        <Button onClick={onPaste} size="sm" variant="outline" title="Paste">
          <Clipboard className="w-4 h-4" />
        </Button>
      </div>

      {/* Formatting */}
      <div className="flex items-center gap-1 border-r border-border pr-4">
        <Button 
          onClick={handleBoldToggle}
          size="sm" 
          variant={isBold ? "default" : "outline"}
          title="Bold"
        >
          <Bold className="w-4 h-4" />
        </Button>
        <Button 
          onClick={handleItalicToggle}
          size="sm" 
          variant={isItalic ? "default" : "outline"}
          title="Italic"
        >
          <Italic className="w-4 h-4" />
        </Button>
        <Button 
          onClick={handleUnderlineToggle}
          size="sm" 
          variant={isUnderline ? "default" : "outline"}
          title="Underline"
        >
          <Underline className="w-4 h-4" />
        </Button>
      </div>

      {/* Alignment */}
      <div className="flex items-center gap-1 border-r border-border pr-4">
        <Button 
          onClick={() => handleAlignmentChange('left')}
          size="sm" 
          variant="outline"
          title="Align Left"
        >
          <AlignLeft className="w-4 h-4" />
        </Button>
        <Button 
          onClick={() => handleAlignmentChange('center')}
          size="sm" 
          variant="outline"
          title="Align Center"
        >
          <AlignCenter className="w-4 h-4" />
        </Button>
        <Button 
          onClick={() => handleAlignmentChange('right')}
          size="sm" 
          variant="outline"
          title="Align Right"
        >
          <AlignRight className="w-4 h-4" />
        </Button>
      </div>

      {/* Colors */}
      <div className="flex items-center gap-1 border-r border-border pr-4">
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" title="Text Color">
              <Type className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="grid grid-cols-8 gap-1 p-2">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color, false)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" variant="outline" title="Background Color">
              <Palette className="w-4 h-4" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64">
            <div className="grid grid-cols-8 gap-1 p-2">
              {colorPalette.map((color) => (
                <button
                  key={color}
                  className="w-6 h-6 rounded border border-border hover:scale-110 transition-transform"
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color, true)}
                />
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {/* Number Formatting */}
      <div className="flex items-center gap-1 border-r border-border pr-4">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Type className="w-4 h-4 mr-2" />
              Format
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => handleFormatChange('general')}>
              General
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFormatChange('number')}>
              Number
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFormatChange('currency')}>
              <DollarSign className="w-4 h-4 mr-2" />
              Currency
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFormatChange('percentage')}>
              <Percent className="w-4 h-4 mr-2" />
              Percentage
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFormatChange('date')}>
              Date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleFormatChange('text')}>
              Text
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Import/Export */}
      <div className="flex items-center gap-2">
        <div className="relative">
          <input
            type="file"
            accept=".csv"
            onChange={handleFileImport}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <Button size="sm" variant="outline">
            <Upload className="w-4 h-4 mr-2" />
            Import CSV
          </Button>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => onExportData('csv')}>
              <FileText className="w-4 h-4 mr-2" />
              Export as CSV
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExportData('xlsx')}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export as Excel (Coming Soon)
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Selection Info */}
      {selectedCells.length > 1 && (
        <div className="ml-auto text-sm text-muted-foreground">
          {selectedCells.length} cells selected
        </div>
      )}
    </div>
  );
}