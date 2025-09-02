import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Filter, 
  Download, 
  Calendar as CalendarIcon,
  Clock, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  Copy,
  FileText,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { format, subDays, startOfMonth, endOfMonth } from 'date-fns';
import { recorderService, RecorderEvent, RecorderExport } from '@/services/recorderService';
import { toast } from 'sonner';

const EVENT_TYPES = [
  'trade.intent', 'trade.executed', 'trade.canceled',
  'risk.soft_pull', 'risk.hard_pull', 'risk.toggle.changed',
  'oracle.signal.created', 'search.requested', 'recommendation.shown',
  'analyst.note', 'alert.created', 'disclaimer.accepted',
  'bot.state.changed', 'settings.updated', 'subscription.updated'
];

const SEVERITY_LEVELS = [
  { value: 1, label: 'Info', color: 'bg-blue-500' },
  { value: 2, label: 'Warn', color: 'bg-yellow-500' },
  { value: 3, label: 'High', color: 'bg-orange-500' },
  { value: 4, label: 'Critical', color: 'bg-red-500' }
];

export default function Recorder() {
  const [events, setEvents] = useState<RecorderEvent[]>([]);
  const [exports, setExports] = useState<RecorderExport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<RecorderEvent | null>(null);
  
  // Filters
  const [searchText, setSearchText] = useState('');
  const [selectedEventTypes, setSelectedEventTypes] = useState<string[]>([]);
  const [selectedSeverities, setSelectedSeverities] = useState<number[]>([]);
  const [dateRange, setDateRange] = useState({
    from: subDays(new Date(), 7),
    to: new Date()
  });
  const [entityType, setEntityType] = useState('');
  const [entityId, setEntityId] = useState('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const itemsPerPage = 50;

  useEffect(() => {
    loadEvents();
    loadExports();
  }, [currentPage, selectedEventTypes, selectedSeverities, dateRange, searchText, entityType, entityId]);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const { data, count } = await recorderService.getEvents({
        from: dateRange.from.toISOString(),
        to: dateRange.to.toISOString(),
        event_type: selectedEventTypes.length > 0 ? selectedEventTypes : undefined,
        severity: selectedSeverities.length > 0 ? selectedSeverities : undefined,
        entity_type: entityType || undefined,
        entity_id: entityId || undefined,
        text: searchText || undefined,
        page: currentPage,
        limit: itemsPerPage
      });
      
      setEvents(data);
      setTotalCount(count);
    } catch (error) {
      console.error('Failed to load events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const loadExports = async () => {
    try {
      const data = await recorderService.getExports();
      setExports(data);
    } catch (error) {
      console.error('Failed to load exports:', error);
    }
  };

  const handleExportCSV = async () => {
    try {
      const url = await recorderService.exportData(
        'csv',
        dateRange.from.toISOString(),
        dateRange.to.toISOString()
      );
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `recorder-export-${format(new Date(), 'yyyy-MM-dd')}.csv`;
        link.click();
        toast.success('CSV export generated successfully');
        loadExports();
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
  };

  const handleExportPDF = async () => {
    try {
      const url = await recorderService.exportData(
        'pdf',
        startOfMonth(new Date()).toISOString(),
        endOfMonth(new Date()).toISOString()
      );
      if (url) {
        const link = document.createElement('a');
        link.href = url;
        link.download = `recorder-monthly-${format(new Date(), 'yyyy-MM')}.pdf`;
        link.click();
        toast.success('PDF export generated successfully');
        loadExports();
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
  };

  const getSeverityIcon = (severity: number) => {
    switch (severity) {
      case 4: return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 3: return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 2: return <Clock className="h-4 w-4 text-yellow-500" />;
      default: return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getSeverityBadge = (severity: number) => {
    const level = SEVERITY_LEVELS.find(l => l.value === severity);
    return (
      <Badge variant="secondary" className={`${level?.color} text-white`}>
        {level?.label || 'Unknown'}
      </Badge>
    );
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const quickFilters = [
    { label: 'Today', action: () => setDateRange({ from: new Date(), to: new Date() }) },
    { label: 'This Week', action: () => setDateRange({ from: subDays(new Date(), 7), to: new Date() }) },
    { label: 'Trades', action: () => setSelectedEventTypes(['trade.intent', 'trade.executed', 'trade.canceled']) },
    { label: 'Risk', action: () => setSelectedEventTypes(['risk.soft_pull', 'risk.hard_pull']) },
    { label: 'Oracle', action: () => setSelectedEventTypes(['oracle.signal.created']) },
    { label: 'Analyst', action: () => setSelectedEventTypes(['analyst.note']) },
    { label: 'System', action: () => setSelectedEventTypes(['settings.updated', 'subscription.updated']) }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Recorder</h1>
              <p className="text-muted-foreground mt-2">
                Complete audit trail of all system events and activities
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                <Download className="h-4 w-4" />
                Export CSV
              </Button>
              <Button onClick={handleExportPDF} variant="outline" className="gap-2">
                <FileText className="h-4 w-4" />
                Export PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-6">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Rail - Quick Filters */}
          <div className="col-span-3">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Quick Filters</h3>
              <div className="space-y-2">
                {quickFilters.map((filter) => (
                  <Button
                    key={filter.label}
                    variant="ghost"
                    size="sm"
                    onClick={filter.action}
                    className="w-full justify-start"
                  >
                    {filter.label}
                  </Button>
                ))}
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="col-span-6">
            {/* Filters Bar */}
            <Card className="p-4 mb-6">
              <div className="flex flex-wrap gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search events..."
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="gap-2">
                      <CalendarIcon className="h-4 w-4" />
                      {dateRange.from && dateRange.to
                        ? `${format(dateRange.from, 'MMM dd')} - ${format(dateRange.to, 'MMM dd')}`
                        : 'Select dates'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => range?.from && range?.to && setDateRange({ from: range.from, to: range.to })}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                <Select onValueChange={(value) => setSelectedEventTypes(value ? [value] : [])}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Event Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Types</SelectItem>
                    {EVENT_TYPES.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex gap-2">
                  {SEVERITY_LEVELS.map((level) => (
                    <div key={level.value} className="flex items-center space-x-2">
                      <Checkbox
                        id={`severity-${level.value}`}
                        checked={selectedSeverities.includes(level.value)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSeverities([...selectedSeverities, level.value]);
                          } else {
                            setSelectedSeverities(selectedSeverities.filter(s => s !== level.value));
                          }
                        }}
                      />
                      <label
                        htmlFor={`severity-${level.value}`}
                        className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                      >
                        {level.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </Card>

            {/* Events Table */}
            <Card>
              <div className="p-4 border-b">
                <h3 className="font-semibold">Events ({totalCount})</h3>
              </div>
              <ScrollArea className="h-[600px]">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Summary</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {events.map((event) => (
                      <Sheet key={event.id}>
                        <SheetTrigger asChild>
                          <TableRow className="cursor-pointer hover:bg-muted/50">
                            <TableCell>
                              {event.ts ? format(new Date(event.ts), 'MMM dd, HH:mm:ss') : '-'}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{event.event_type}</Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {getSeverityIcon(event.severity || 1)}
                                {getSeverityBadge(event.severity || 1)}
                              </div>
                            </TableCell>
                            <TableCell>
                              {event.entity_type && (
                                <Badge variant="secondary">
                                  {event.entity_type}
                                  {event.entity_id && `:${event.entity_id.substring(0, 8)}`}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="max-w-[300px] truncate">
                              {event.summary}
                            </TableCell>
                          </TableRow>
                        </SheetTrigger>
                        <SheetContent className="w-[600px] sm:w-[600px]">
                          <SheetHeader>
                            <SheetTitle className="flex items-center gap-2">
                              {getSeverityIcon(event.severity || 1)}
                              Event Details
                            </SheetTitle>
                          </SheetHeader>
                          <div className="mt-6 space-y-4">
                            <div>
                              <label className="text-sm font-medium">Event ID</label>
                              <div className="flex items-center gap-2 mt-1">
                                <code className="flex-1 p-2 bg-muted rounded text-sm">
                                  {event.id}
                                </code>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => copyToClipboard(event.id || '')}
                                >
                                  <Copy className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium">Timestamp</label>
                              <div className="mt-1 p-2 bg-muted rounded text-sm">
                                {event.ts ? format(new Date(event.ts), 'PPpp') : '-'}
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium">Summary</label>
                              <div className="mt-1 p-2 bg-muted rounded text-sm">
                                {event.summary}
                              </div>
                            </div>

                            <div>
                              <label className="text-sm font-medium">Payload</label>
                              <ScrollArea className="mt-1 h-[300px]">
                                <pre className="p-2 bg-muted rounded text-xs overflow-auto">
                                  {JSON.stringify(event.payload_json || {}, null, 2)}
                                </pre>
                              </ScrollArea>
                            </div>
                          </div>
                        </SheetContent>
                      </Sheet>
                    ))}
                  </TableBody>
                </Table>
              </ScrollArea>
              
              {/* Pagination */}
              <div className="p-4 border-t flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalCount)} of {totalCount} events
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage * itemsPerPage >= totalCount}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Rail - Export History */}
          <div className="col-span-3">
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Export History</h3>
              <div className="space-y-3">
                {exports.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No exports yet</p>
                ) : (
                  exports.map((exp) => (
                    <div key={exp.id} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <Badge variant={exp.status === 'completed' ? 'default' : 'secondary'}>
                          {exp.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {exp.format?.toUpperCase()}
                        </span>
                      </div>
                      <div className="text-sm">
                        {exp.ts ? format(new Date(exp.ts), 'MMM dd, HH:mm') : '-'}
                      </div>
                      {exp.status === 'completed' && exp.file_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full mt-2"
                          onClick={() => {
                            const link = document.createElement('a');
                            link.href = exp.file_url!;
                            link.download = `export-${exp.id}.${exp.format}`;
                            link.click();
                          }}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>

      {/* Compliance Footer */}
      <div className="border-t border-border bg-muted/30 p-4 text-center">
        <p className="text-xs text-muted-foreground">
          All events are logged for audit purposes. StagAlgo provides educational trading tools, not financial advice. 
          Users remain responsible for all trading decisions and compliance with applicable regulations.
        </p>
      </div>
    </div>
  );
}