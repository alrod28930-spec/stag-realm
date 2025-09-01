import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { 
  Play, 
  Pause, 
  Square, 
  Video, 
  Download, 
  Search,
  Calendar,
  Clock,
  BarChart3,
  Filter
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface TradeRecording {
  id: string;
  name: string;
  symbol: string;
  strategy: string;
  duration: string;
  recordedAt: Date;
  profit: number;
  profitPercent: number;
  trades: number;
  status: 'completed' | 'recording' | 'processing';
  fileSize: string;
}

export default function Recorder() {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStrategy, setFilterStrategy] = useState('all');
  const [isRecording, setIsRecording] = useState(false);

  const [recordings] = useState<TradeRecording[]>([
    {
      id: '1',
      name: 'AAPL Momentum Session',
      symbol: 'AAPL',
      strategy: 'Momentum Trading',
      duration: '2h 15m',
      recordedAt: new Date('2024-03-01T09:30:00'),
      profit: 1250.75,
      profitPercent: 2.4,
      trades: 12,
      status: 'completed',
      fileSize: '1.2 GB'
    },
    {
      id: '2',
      name: 'TSLA Scalping Analysis',
      symbol: 'TSLA',
      strategy: 'Scalping',
      duration: '45m',
      recordedAt: new Date('2024-02-28T14:15:00'),
      profit: -125.30,
      profitPercent: -0.8,
      trades: 23,
      status: 'completed',
      fileSize: '850 MB'
    },
    {
      id: '3',
      name: 'Live NVDA Session',
      symbol: 'NVDA',
      strategy: 'Swing Trading',
      duration: '1h 32m',
      recordedAt: new Date(),
      profit: 2150.40,
      profitPercent: 3.7,
      trades: 8,
      status: 'recording',
      fileSize: 'Recording...'
    },
    {
      id: '4',
      name: 'Multi-Stock Portfolio',
      symbol: 'Multiple',
      strategy: 'Portfolio Management',
      duration: '6h 20m',
      recordedAt: new Date('2024-02-27T09:30:00'),
      profit: 3840.90,
      profitPercent: 5.1,
      trades: 47,
      status: 'completed',
      fileSize: '4.7 GB'
    },
    {
      id: '5',
      name: 'Options Strategy Demo',
      symbol: 'SPY',
      strategy: 'Options Trading',
      duration: '3h 45m',
      recordedAt: new Date('2024-02-26T10:00:00'),
      profit: 892.15,
      profitPercent: 1.9,
      trades: 15,
      status: 'processing',
      fileSize: 'Processing...'
    }
  ]);

  const currentStats = {
    sessionLength: '1h 32m',
    tradesExecuted: 8,
    currentProfit: 2150.40,
    currentProfitPercent: 3.7
  };

  const filteredRecordings = recordings.filter(recording => {
    const matchesSearch = recording.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recording.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         recording.strategy.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = filterStrategy === 'all' || recording.strategy.toLowerCase().includes(filterStrategy.toLowerCase());
    
    return matchesSearch && matchesFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-accent text-accent-foreground';
      case 'recording': return 'bg-primary text-primary-foreground animate-pulse';
      case 'processing': return 'bg-warning text-warning-foreground';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <Video className="w-3 h-3" />;
      case 'recording': return <Play className="w-3 h-3" />;
      case 'processing': return <BarChart3 className="w-3 h-3" />;
      default: return <Video className="w-3 h-3" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Trade Recorder</h1>
          <p className="text-muted-foreground mt-2">
            Record, analyze, and replay your trading sessions
          </p>
        </div>
        <div className="flex items-center space-x-3">
          {isRecording ? (
            <>
              <Button 
                variant="outline" 
                onClick={() => setIsRecording(false)}
                className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
              >
                <Square className="w-4 h-4 mr-2" />
                Stop Recording
              </Button>
              <Button 
                variant="outline"
                className="border-warning text-warning hover:bg-warning hover:text-warning-foreground"
              >
                <Pause className="w-4 h-4 mr-2" />
                Pause
              </Button>
            </>
          ) : (
            <Button 
              onClick={() => setIsRecording(true)}
              className="bg-gradient-primary hover:opacity-90"
            >
              <Video className="w-4 h-4 mr-2" />
              Start Recording
            </Button>
          )}
        </div>
      </div>

      {/* Current Recording Status */}
      {isRecording && (
        <Card className="bg-gradient-card shadow-card border-primary/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <div className="w-3 h-3 bg-destructive rounded-full animate-pulse"></div>
              Live Recording Session
            </CardTitle>
            <CardDescription>
              Your current trading session is being recorded
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-2xl font-bold text-primary">{currentStats.sessionLength}</p>
                <p className="text-sm text-muted-foreground">Session Length</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{currentStats.tradesExecuted}</p>
                <p className="text-sm text-muted-foreground">Trades Executed</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">${currentStats.currentProfit.toFixed(2)}</p>
                <p className="text-sm text-muted-foreground">Current Profit</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-accent">+{currentStats.currentProfitPercent}%</p>
                <p className="text-sm text-muted-foreground">Return</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters and Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search recordings..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStrategy} onValueChange={setFilterStrategy}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by strategy" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Strategies</SelectItem>
            <SelectItem value="momentum">Momentum Trading</SelectItem>
            <SelectItem value="scalping">Scalping</SelectItem>
            <SelectItem value="swing">Swing Trading</SelectItem>
            <SelectItem value="options">Options Trading</SelectItem>
            <SelectItem value="portfolio">Portfolio Management</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          More Filters
        </Button>
      </div>

      {/* Recordings Grid */}
      <div className="space-y-4">
        {filteredRecordings.map((recording) => (
          <Card key={recording.id} className="bg-gradient-card shadow-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                {/* Recording Info */}
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center">
                    <Video className="w-6 h-6 text-primary" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h3 className="font-semibold">{recording.name}</h3>
                      <Badge className={getStatusColor(recording.status)}>
                        {getStatusIcon(recording.status)}
                        <span className="ml-1 capitalize">{recording.status}</span>
                      </Badge>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <BarChart3 className="w-3 h-3 mr-1" />
                        {recording.symbol}
                      </span>
                      <span>{recording.strategy}</span>
                      <span className="flex items-center">
                        <Clock className="w-3 h-3 mr-1" />
                        {recording.duration}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-3 h-3 mr-1" />
                        {recording.recordedAt.toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Stats */}
                <div className="flex items-center space-x-8">
                  <div className="text-center">
                    <p className={`font-semibold ${
                      recording.profit >= 0 ? 'text-accent' : 'text-destructive'
                    }`}>
                      {recording.profit >= 0 ? '+' : ''}${Math.abs(recording.profit).toFixed(2)}
                    </p>
                    <p className="text-xs text-muted-foreground">Profit</p>
                  </div>
                  <div className="text-center">
                    <p className={`font-semibold ${
                      recording.profitPercent >= 0 ? 'text-accent' : 'text-destructive'
                    }`}>
                      {recording.profitPercent >= 0 ? '+' : ''}{recording.profitPercent}%
                    </p>
                    <p className="text-xs text-muted-foreground">Return</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold">{recording.trades}</p>
                    <p className="text-xs text-muted-foreground">Trades</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-muted-foreground">{recording.fileSize}</p>
                    <p className="text-xs text-muted-foreground">Size</p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center space-x-2">
                  {recording.status === 'completed' && (
                    <>
                      <Button variant="outline" size="sm">
                        <Play className="w-4 h-4 mr-2" />
                        Replay
                      </Button>
                      <Button variant="outline" size="sm">
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </Button>
                    </>
                  )}
                  {recording.status === 'recording' && (
                    <Button variant="outline" size="sm" disabled>
                      <Play className="w-4 h-4 mr-2" />
                      Live
                    </Button>
                  )}
                  {recording.status === 'processing' && (
                    <Button variant="outline" size="sm" disabled>
                      <BarChart3 className="w-4 h-4 mr-2" />
                      Processing...
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredRecordings.length === 0 && (
        <Card className="bg-gradient-card shadow-card">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <Video className="w-12 h-12 text-muted-foreground mx-auto" />
              <div>
                <h3 className="text-lg font-semibold mb-2">No recordings found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || filterStrategy !== 'all' 
                    ? 'Try adjusting your search or filters'
                    : 'Start your first recording to begin analyzing your trades'
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}