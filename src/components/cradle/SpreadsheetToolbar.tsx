import { useState } from 'react';
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
  Palette,
  FileSpreadsheet,
  FileText,
  Undo,
  Redo
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface SpreadsheetToolbarProps {
  currentSheet: string;
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
}

export function SpreadsheetToolbar({
  currentSheet,
  onNewSheet,
  onSaveSheet,
  onRenameSheet,
  onDeleteSheet,
  onImportData,
  onExportData,
  onUndo,
  onRedo,
  canUndo,
  canRedo
}: SpreadsheetToolbarProps) {
  const [isRenaming, setIsRenaming] = useState(false);
  const [newName, setNewName] = useState(currentSheet);
  const { toast } = useToast();

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

  return (
    <div className="flex items-center gap-2 p-3 border-b border-border bg-background">
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
        >
          <Undo className="w-4 h-4" />
        </Button>
        <Button
          onClick={onRedo}
          disabled={!canRedo}
          size="sm"
          variant="outline"
        >
          <Redo className="w-4 h-4" />
        </Button>
      </div>

      {/* Formatting */}
      <div className="flex items-center gap-1 border-r border-border pr-4">
        <Button size="sm" variant="outline">
          <Bold className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline">
          <Italic className="w-4 h-4" />
        </Button>
        <Button size="sm" variant="outline">
          <Palette className="w-4 h-4" />
        </Button>
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
              Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}