import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  Target,
  Zap,
  Activity,
  AlertTriangle
} from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface SimulationParams {
  initialCapital: number;
  annualReturn: number;
  volatility: number;
  timeHorizon: number; // years
  numSimulations: number;
  monthlyContribution: number;
}

interface SimulationResult {
  finalValues: number[];
  percentiles: {
    p5: number;
    p25: number;
    p50: number;
    p75: number;
    p95: number;
  };
  probabilityPositive: number;
  probabilityDoubling: number;
  probabilityHalving: number;
  expectedValue: number;
  worstCase: number;
  bestCase: number;
  valueAtRisk: number; // 5% VaR
  paths: { month: number; value: number; simulation: number }[];
  distribution: { range: string; count: number; percentage: number }[];
}

interface MonteCarloSimulationProps {
  onSimulationComplete?: (results: SimulationResult) => void;
}

export function MonteCarloSimulation({ onSimulationComplete }: MonteCarloSimulationProps) {
  const [params, setParams] = useState<SimulationParams>({
    initialCapital: 100000,
    annualReturn: 8, // 8%
    volatility: 20, // 20%
    timeHorizon: 10,
    numSimulations: 1000,
    monthlyContribution: 0
  });

  const [results, setResults] = useState<SimulationResult | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const runSimulation = async () => {
    setIsRunning(true);
    setProgress(0);
    
    const {
      initialCapital,
      annualReturn,
      volatility,
      timeHorizon,
      numSimulations,
      monthlyContribution
    } = params;

    const monthlyReturn = annualReturn / 100 / 12;
    const monthlyVolatility = (volatility / 100) / Math.sqrt(12);
    const totalMonths = timeHorizon * 12;
    
    const finalValues: number[] = [];
    const paths: { month: number; value: number; simulation: number }[] = [];
    
    // Run Monte Carlo simulations
    for (let sim = 0; sim < numSimulations; sim++) {
      let currentValue = initialCapital;
      
      for (let month = 0; month <= totalMonths; month++) {
        if (month > 0) {
          // Generate random return using normal distribution (Box-Muller transform)
          const u1 = Math.random();
          const u2 = Math.random();
          const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
          const monthlyRandomReturn = monthlyReturn + monthlyVolatility * z0;
          
          currentValue = currentValue * (1 + monthlyRandomReturn) + monthlyContribution;
        }
        
        // Store some paths for visualization (sample every 10th simulation)
        if (sim % 10 === 0) {
          paths.push({
            month,
            value: currentValue,
            simulation: sim
          });
        }
      }
      
      finalValues.push(currentValue);
      
      // Update progress
      if (sim % Math.floor(numSimulations / 100) === 0) {
        setProgress((sim / numSimulations) * 100);
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }

    // Calculate statistics
    const sortedValues = [...finalValues].sort((a, b) => a - b);
    const n = sortedValues.length;
    
    const percentiles = {
      p5: sortedValues[Math.floor(n * 0.05)],
      p25: sortedValues[Math.floor(n * 0.25)],
      p50: sortedValues[Math.floor(n * 0.50)],
      p75: sortedValues[Math.floor(n * 0.75)],
      p95: sortedValues[Math.floor(n * 0.95)]
    };

    const probabilityPositive = finalValues.filter(v => v > initialCapital).length / numSimulations;
    const probabilityDoubling = finalValues.filter(v => v >= initialCapital * 2).length / numSimulations;
    const probabilityHalving = finalValues.filter(v => v <= initialCapital * 0.5).length / numSimulations;
    
    const expectedValue = finalValues.reduce((sum, val) => sum + val, 0) / numSimulations;
    const worstCase = Math.min(...finalValues);
    const bestCase = Math.max(...finalValues);
    const valueAtRisk = percentiles.p5;

    // Create distribution buckets
    const minValue = Math.min(...finalValues);
    const maxValue = Math.max(...finalValues);
    const bucketSize = (maxValue - minValue) / 20;
    const distribution = [];
    
    for (let i = 0; i < 20; i++) {
      const rangeStart = minValue + i * bucketSize;
      const rangeEnd = minValue + (i + 1) * bucketSize;
      const count = finalValues.filter(v => v >= rangeStart && v < rangeEnd).length;
      const percentage = (count / numSimulations) * 100;
      
      distribution.push({
        range: `$${(rangeStart / 1000).toFixed(0)}K-${(rangeEnd / 1000).toFixed(0)}K`,
        count,
        percentage
      });
    }

    const simulationResults: SimulationResult = {
      finalValues,
      percentiles,
      probabilityPositive,
      probabilityDoubling,
      probabilityHalving,
      expectedValue,
      worstCase,
      bestCase,
      valueAtRisk,
      paths,
      distribution: distribution.filter(d => d.count > 0)
    };

    setResults(simulationResults);
    setProgress(100);
    setIsRunning(false);

    if (onSimulationComplete) {
      onSimulationComplete(simulationResults);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  const getConfidenceColor = (probability: number) => {
    if (probability >= 0.8) return 'text-accent';
    if (probability >= 0.6) return 'text-warning';
    return 'text-destructive';
  };

  return (
    <div className="space-y-6">
      {/* Simulation Parameters */}
      <Card className="bg-gradient-card shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5" />
            Monte Carlo Risk Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <label className="text-sm font-medium">Initial Capital</label>
              <Input
                type="number"
                value={params.initialCapital}
                onChange={(e) => setParams(prev => ({ ...prev, initialCapital: parseInt(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Monthly Contribution</label>
              <Input
                type="number"
                value={params.monthlyContribution}
                onChange={(e) => setParams(prev => ({ ...prev, monthlyContribution: parseInt(e.target.value) || 0 }))}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Time Horizon (Years)</label>
              <Input
                type="number"
                value={params.timeHorizon}
                onChange={(e) => setParams(prev => ({ ...prev, timeHorizon: parseInt(e.target.value) || 1 }))}
                className="mt-1"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">
                Expected Annual Return: {params.annualReturn}%
              </label>
              <Slider
                value={[params.annualReturn]}
                onValueChange={(value) => setParams(prev => ({ ...prev, annualReturn: value[0] }))}
                max={20}
                min={-5}
                step={0.5}
                className="mt-2"
              />
            </div>
            
            <div>
              <label className="text-sm font-medium">
                Volatility (Annual): {params.volatility}%
              </label>
              <Slider
                value={[params.volatility]}
                onValueChange={(value) => setParams(prev => ({ ...prev, volatility: value[0] }))}
                max={50}
                min={5}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <label className="text-sm font-medium">
                Number of Simulations: {params.numSimulations}
              </label>
              <Slider
                value={[params.numSimulations]}
                onValueChange={(value) => setParams(prev => ({ ...prev, numSimulations: value[0] }))}
                max={10000}
                min={100}
                step={100}
                className="mt-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <Button 
              onClick={runSimulation} 
              disabled={isRunning}
              className="flex items-center gap-2"
            >
              {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              {isRunning ? 'Running...' : 'Run Simulation'}
            </Button>
            
            {isRunning && (
              <div className="flex-1">
                <Progress value={progress} className="h-2" />
                <div className="text-xs text-muted-foreground mt-1">
                  {progress.toFixed(0)}% complete
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {results && (
        <div className="space-y-6">
          {/* Key Statistics */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Simulation Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency(results.expectedValue)}</div>
                  <div className="text-sm text-muted-foreground">Expected Value</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{formatCurrency(results.percentiles.p50)}</div>
                  <div className="text-sm text-muted-foreground">Median (50th %ile)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-destructive">{formatCurrency(results.valueAtRisk)}</div>
                  <div className="text-sm text-muted-foreground">Value at Risk (5%)</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-accent">{formatCurrency(results.percentiles.p95)}</div>
                  <div className="text-sm text-muted-foreground">95th Percentile</div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <div className={`text-xl font-bold ${getConfidenceColor(results.probabilityPositive)}`}>
                    {(results.probabilityPositive * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Probability of Profit</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <div className={`text-xl font-bold ${getConfidenceColor(results.probabilityDoubling)}`}>
                    {(results.probabilityDoubling * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Probability of Doubling</div>
                </div>
                <div className="text-center p-4 rounded-lg bg-muted/20">
                  <div className="text-xl font-bold text-destructive">
                    {(results.probabilityHalving * 100).toFixed(1)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Probability of 50% Loss</div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Outcome Distribution */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Outcome Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={results.distribution}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="range" angle={-45} textAnchor="end" height={100} />
                      <YAxis />
                      <Tooltip 
                        formatter={(value: any) => [`${value.toFixed(1)}%`, 'Probability']}
                        labelFormatter={(label) => `Range: ${label}`}
                      />
                      <Bar dataKey="percentage" fill="hsl(var(--primary))" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Sample Paths */}
            <Card className="bg-gradient-card shadow-card">
              <CardHeader>
                <CardTitle>Sample Portfolio Paths</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={results.paths}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                      <Tooltip 
                        formatter={(value: any) => [formatCurrency(value), 'Portfolio Value']}
                        labelFormatter={(label) => `Month: ${label}`}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="hsl(var(--primary))" 
                        fill="hsl(var(--primary))"
                        fillOpacity={0.1}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Risk Analysis */}
          <Card className="bg-gradient-card shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Risk Analysis Summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Percentile Analysis</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">95th Percentile (Best 5%):</span>
                      <span className="font-medium text-accent">{formatCurrency(results.percentiles.p95)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">75th Percentile:</span>
                      <span className="font-medium">{formatCurrency(results.percentiles.p75)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">50th Percentile (Median):</span>
                      <span className="font-medium">{formatCurrency(results.percentiles.p50)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">25th Percentile:</span>
                      <span className="font-medium">{formatCurrency(results.percentiles.p25)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">5th Percentile (Worst 5%):</span>
                      <span className="font-medium text-destructive">{formatCurrency(results.percentiles.p5)}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-3">Extreme Scenarios</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Best Case Scenario:</span>
                      <span className="font-medium text-accent">{formatCurrency(results.bestCase)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Worst Case Scenario:</span>
                      <span className="font-medium text-destructive">{formatCurrency(results.worstCase)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Expected Return:</span>
                      <span className="font-medium">
                        {(((results.expectedValue - params.initialCapital) / params.initialCapital) * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Range (95% Confidence):</span>
                      <span className="font-medium">
                        {formatCurrency(results.percentiles.p5)} - {formatCurrency(results.percentiles.p95)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}