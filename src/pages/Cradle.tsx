import { CradleSpreadsheet } from '@/components/cradle/CradleSpreadsheet';
import { FileSpreadsheet } from 'lucide-react';

export default function Cradle() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8" />
            Cradle Spreadsheet Lab
          </h1>
          <p className="text-muted-foreground mt-2">
            Experiment with strategies, analyze data, and connect formulas to StagAlgo's systems
          </p>
        </div>
      </div>

      {/* Spreadsheet Workspace */}
      <CradleSpreadsheet />
    </div>
  );
}