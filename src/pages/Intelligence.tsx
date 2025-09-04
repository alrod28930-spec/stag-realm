import { useState } from 'react';
import { Brain, Activity, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import Analyst from './Analyst';
import Oracle from './Oracle';
import { useOracleSignals } from '@/hooks/useOracleSignals';
import { ProcessedSignal } from '@/types/oracle';

interface OracleProps {
  onAnalyzeSignal?: (signal: ProcessedSignal) => void;
}

interface AnalystProps {
  selectedSignal?: ProcessedSignal | null;
}

const Intelligence = () => {
  const [activeTab, setActiveTab] = useState<'oracle' | 'analyst'>('oracle');
  const [selectedSignal, setSelectedSignal] = useState<ProcessedSignal | null>(null);
  const { signals } = useOracleSignals();

  const handleAnalyzeSignal = (signal: ProcessedSignal) => {
    setSelectedSignal(signal);
    setActiveTab('analyst');
  };

  const handleQuickSwitch = () => {
    setActiveTab(activeTab === 'oracle' ? 'analyst' : 'oracle');
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-primary rounded-lg shadow-gold">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground font-serif">
              Intelligence Hub
            </h1>
            <p className="text-muted-foreground">
              AI-powered market analysis and trading insights
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleQuickSwitch}
          variant="outline"
          className="flex items-center gap-2"
        >
          <ArrowRight className="w-4 h-4" />
          Switch to {activeTab === 'oracle' ? 'Analyst' : 'Oracle'}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Active Signals</p>
                <p className="text-2xl font-bold">{signals.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Brain className="w-5 h-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">AI Analysis Ready</p>
                <Badge variant="secondary" className="text-xs">
                  {activeTab === 'analyst' ? 'Active' : 'Standby'}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full bg-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">System Status</p>
                <p className="text-sm font-medium text-green-600">Operational</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cross-Integration Notice */}
      {selectedSignal && activeTab === 'analyst' && (
        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Analyzing Oracle Signal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="outline" className="text-xs">
                {selectedSignal.type.replace('_', ' ').toUpperCase()}
              </Badge>
              <span>{selectedSignal.signal}</span>
              {selectedSignal.symbol && (
                <Badge variant="secondary">{selectedSignal.symbol}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'oracle' | 'analyst')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="oracle" className="flex items-center gap-2">
            <Activity className="w-4 h-4" />
            Oracle Signals
          </TabsTrigger>
          <TabsTrigger value="analyst" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Analyst
          </TabsTrigger>
        </TabsList>

        <TabsContent value="oracle" className="mt-6">
          <OracleWithProps onAnalyzeSignal={handleAnalyzeSignal} />
        </TabsContent>

        <TabsContent value="analyst" className="mt-6">
          <AnalystWithProps selectedSignal={selectedSignal} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Enhanced Oracle component with analyze signal functionality
const OracleWithProps = ({ onAnalyzeSignal }: OracleProps) => {
  return <Oracle onAnalyzeSignal={onAnalyzeSignal} />;
};

// Enhanced Analyst component with signal context
const AnalystWithProps = ({ selectedSignal }: AnalystProps) => {
  return <Analyst selectedSignal={selectedSignal} />;
};

export default Intelligence;