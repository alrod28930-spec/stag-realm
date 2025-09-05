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
import { useScreenSize } from '@/hooks/use-mobile';

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
  const { isMobile, isTablet } = useScreenSize();

  const handleAnalyzeSignal = (signal: ProcessedSignal) => {
    setSelectedSignal(signal);
    setActiveTab('analyst');
  };

  const handleQuickSwitch = () => {
    setActiveTab(activeTab === 'oracle' ? 'analyst' : 'oracle');
  };

  return (
    <div className={`container mx-auto space-y-4 ${isMobile ? 'p-3' : isTablet ? 'p-4' : 'p-6'}`}>
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col space-y-3' : 'flex-row items-center justify-between'}`}>
        <div className="flex items-center gap-4">
          <div className="p-3 bg-gradient-primary rounded-lg shadow-gold">
            <Brain className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <h1 className={`font-bold text-foreground font-serif ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
              Intelligence Hub
            </h1>
            <p className={`text-muted-foreground ${isMobile ? 'text-sm' : ''}`}>
              AI-powered market analysis and trading insights
            </p>
          </div>
        </div>
        
        <Button 
          onClick={handleQuickSwitch}
          variant="outline"
          className={`flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}
          size={isMobile ? 'default' : 'default'}
        >
          <ArrowRight className="w-4 h-4" />
          Switch to {activeTab === 'oracle' ? 'Analyst' : 'Oracle'}
        </Button>
      </div>

      {/* Quick Stats */}
      <div className={`grid gap-4 ${isMobile ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-3'}`}>
        <Card>
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
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
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
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
          <CardContent className={`${isMobile ? 'p-3' : 'p-4'}`}>
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
          <CardHeader className={`${isMobile ? 'pb-2' : 'pb-3'}`}>
            <CardTitle className="text-sm flex items-center gap-2">
              <ArrowRight className="w-4 h-4" />
              Analyzing Oracle Signal
            </CardTitle>
          </CardHeader>
          <CardContent className={`${isMobile ? 'p-3' : ''}`}>
            <div className={`flex items-center gap-2 text-sm ${isMobile ? 'flex-wrap' : ''}`}>
              <Badge variant="outline" className="text-xs">
                {selectedSignal.type.replace('_', ' ').toUpperCase()}
              </Badge>
              <span className={`${isMobile ? 'break-words' : ''}`}>{selectedSignal.signal}</span>
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
            <span className={`${isMobile ? 'text-sm' : ''}`}>Oracle Signals</span>
          </TabsTrigger>
          <TabsTrigger value="analyst" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            <span className={`${isMobile ? 'text-sm' : ''}`}>AI Analyst</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="oracle" className={`${isMobile ? 'mt-4' : 'mt-6'}`}>
          <OracleWithProps onAnalyzeSignal={handleAnalyzeSignal} />
        </TabsContent>

        <TabsContent value="analyst" className={`${isMobile ? 'mt-4' : 'mt-6'}`}>
          <AnalystWithProps selectedSignal={selectedSignal} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

// Enhanced Oracle component with analyze signal functionality
const OracleWithProps = ({ onAnalyzeSignal }: OracleProps) => {
  return <Oracle {...{ onAnalyzeSignal }} />;
};

// Enhanced Analyst component with signal context
const AnalystWithProps = ({ selectedSignal }: AnalystProps) => {
  return <Analyst {...{ selectedSignal }} />;
};

export default Intelligence;