import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { 
  Calculator, 
  DollarSign, 
  TrendingUp, 
  Calendar,
  AlertTriangle,
  Save,
  Download
} from 'lucide-react';

interface DividendCalculatorProps {
  symbol?: string;
  shares?: number;
  currentPrice?: number;
  onClose?: () => void;
}

interface DividendData {
  symbol: string;
  adps: number;
  frequency: 'M' | 'Q' | 'S' | 'A';
  growth_rate?: number;
  ex_date?: string;
  pay_date?: string;
}

interface ProjectionResult {
  currentYield: number;
  annualIncomeNow: number;
  grossIncomeTotal: number;
  netIncomeTotal: number;
  endShares: number;
  incomeCalendar: Array<{
    month: number;
    year: number;
    grossIncome: number;
    netIncome: number;
    shares: number;
    dividendPerShare: number;
    cumulativeShares: number;
  }>;
}

export const DividendCalculator: React.FC<DividendCalculatorProps> = ({
  symbol: initialSymbol = '',
  shares: initialShares = 0,
  currentPrice: initialPrice = 0,
  onClose
}) => {
  const [symbol, setSymbol] = useState(initialSymbol);
  const [shares, setShares] = useState(initialShares);
  const [currentPrice, setCurrentPrice] = useState(initialPrice);
  const [adps, setAdps] = useState(0);
  const [frequency, setFrequency] = useState<'M' | 'Q' | 'S' | 'A'>('Q');
  const [monthsHorizon, setMonthsHorizon] = useState(12);
  const [dripEnabled, setDripEnabled] = useState(false);
  const [withholdingPct, setWithholdingPct] = useState(0);
  const [growthRate, setGrowthRate] = useState(0);
  const [priceAssumption, setPriceAssumption] = useState<number | undefined>();
  
  const [dividendData, setDividendData] = useState<DividendData | null>(null);
  const [projectionResult, setProjectionResult] = useState<ProjectionResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const { toast } = useToast();
  const { user } = useAuthStore();
  
  // Get workspace ID from user context  
  const workspaceId = user?.organizationId || '00000000-0000-0000-0000-000000000001';
  const userId = user?.id || '00000000-0000-0000-0000-000000000000';

  // Fetch dividend data when symbol changes
  useEffect(() => {
    if (symbol) {
      fetchDividendData(symbol);
    }
  }, [symbol]);

  // Calculate projection when key inputs change (debounced)
  useEffect(() => {
    if (symbol && shares > 0 && currentPrice > 0 && adps > 0 && user?.id) {
      const timeoutId = setTimeout(() => {
        calculateProjection();
      }, 500); // Debounce calculations
      return () => clearTimeout(timeoutId);
    }
  }, [symbol, shares, currentPrice, adps, frequency, monthsHorizon, dripEnabled, withholdingPct, growthRate, priceAssumption, user?.id]);

  const fetchDividendData = async (sym: string) => {
    if (!user?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-dividends', {
        body: { 
          symbol: sym.toUpperCase(),
          workspace_id: workspaceId
        }
      });

      if (error) throw error;

      if (data?.data) {
        const divData = data.data;
        setDividendData(divData);
        setAdps(divData.adps || 0);
        setFrequency(divData.frequency || 'Q');
        setGrowthRate(divData.growth_rate || 0);
      }
    } catch (error) {
      console.error('Error fetching dividend data:', error);
      toast({
        title: "Error",
        description: "Could not fetch dividend data. Using defaults.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProjection = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('calc-dividend-projection', {
        body: {
          symbol,
          shares,
          currentPrice,
          adps,
          frequency,
          monthsHorizon,
          dripEnabled,
          withholdingPct,
          growthRate,
          priceAssumption
        }
      });

      if (error) throw error;

      setProjectionResult(data?.data || null);
    } catch (error) {
      console.error('Error calculating projection:', error);
      toast({
        title: "Error",
        description: "Could not calculate dividend projection.",
        variant: "destructive",
      });
    }
  };

  const saveCalculation = async () => {
    if (!user?.id) {
      toast({
        title: "Error",
        description: "You must be logged in to save calculations.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('div_calculations')
        .insert({
          workspace_id: workspaceId,
          user_id: userId,
          symbol,
          shares,
          current_price: currentPrice,
          adps,
          frequency,
          months_horizon: monthsHorizon,
          drip_enabled: dripEnabled,
          withholding_pct: withholdingPct,
          growth_rate: growthRate,
          price_assumption: priceAssumption
        });

      if (error) throw error;

      toast({
        title: "Saved",
        description: "Dividend calculation saved successfully.",
      });
    } catch (error) {
      console.error('Error saving calculation:', error);
      toast({
        title: "Error",
        description: "Could not save calculation.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportToCsv = () => {
    if (!projectionResult) return;

    const csvData = [
      ['Month', 'Year', 'Gross Income', 'Net Income', 'New Shares', 'Cumulative Shares'],
      ...projectionResult.incomeCalendar.map(item => [
        item.month,
        item.year,
        item.grossIncome.toFixed(2),
        item.netIncome.toFixed(2),
        item.shares.toFixed(4),
        item.cumulativeShares.toFixed(4)
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dividend-projection-${symbol}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const frequencyLabels = {
    'M': 'Monthly',
    'Q': 'Quarterly', 
    'S': 'Semi-Annual',
    'A': 'Annual'
  };

  // Prepare chart data
  const incomeChartData = projectionResult?.incomeCalendar.map(item => ({
    period: `${item.year}-${String(item.month).padStart(2, '0')}`,
    grossIncome: item.grossIncome,
    netIncome: item.netIncome,
    cumulativeShares: item.cumulativeShares
  })) || [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Calculator className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold">Dividend Calculator</h2>
        </div>
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Compliance Disclaimer */}
      <Card className="border-warning/20 bg-warning/5">
        <CardContent className="pt-4">
          <div className="flex items-center gap-2 text-warning">
            <AlertTriangle className="w-4 h-4" />
            <span className="text-sm font-medium">
              Informational only. Not financial or tax advice. Projections are not guaranteed.
            </span>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Calculation Inputs
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="symbol">Symbol</Label>
                <Input
                  id="symbol"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                  placeholder="AAPL"
                  className="uppercase"
                />
              </div>
              <div>
                <Label htmlFor="shares">Shares</Label>
                <Input
                  id="shares"
                  type="number"
                  value={shares}
                  onChange={(e) => setShares(Number(e.target.value))}
                  placeholder="100"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="currentPrice">Current Price</Label>
                <Input
                  id="currentPrice"
                  type="number"
                  step="0.01"
                  value={currentPrice}
                  onChange={(e) => setCurrentPrice(Number(e.target.value))}
                  placeholder="150.00"
                />
              </div>
              <div>
                <Label htmlFor="adps">Annual DPS</Label>
                <Input
                  id="adps"
                  type="number"
                  step="0.01"
                  value={adps}
                  onChange={(e) => setAdps(Number(e.target.value))}
                  placeholder="2.50"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="frequency">Frequency</Label>
                <Select value={frequency} onValueChange={(value: any) => setFrequency(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Monthly</SelectItem>
                    <SelectItem value="Q">Quarterly</SelectItem>
                    <SelectItem value="S">Semi-Annual</SelectItem>
                    <SelectItem value="A">Annual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="monthsHorizon">Months Horizon</Label>
                <Input
                  id="monthsHorizon"
                  type="number"
                  value={monthsHorizon}
                  onChange={(e) => setMonthsHorizon(Number(e.target.value))}
                  placeholder="12"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="withholdingPct">Withholding %</Label>
                <Input
                  id="withholdingPct"
                  type="number"
                  step="0.1"
                  value={withholdingPct}
                  onChange={(e) => setWithholdingPct(Number(e.target.value))}
                  placeholder="15.0"
                />
              </div>
              <div>
                <Label htmlFor="growthRate">Growth Rate %/yr</Label>
                <Input
                  id="growthRate"
                  type="number"
                  step="0.1"
                  value={growthRate}
                  onChange={(e) => setGrowthRate(Number(e.target.value))}
                  placeholder="3.0"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="priceAssumption">Price Assumption (DRIP)</Label>
              <Input
                id="priceAssumption"
                type="number"
                step="0.01"
                value={priceAssumption || ''}
                onChange={(e) => setPriceAssumption(e.target.value ? Number(e.target.value) : undefined)}
                placeholder="Use current price"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="drip"
                checked={dripEnabled}
                onCheckedChange={setDripEnabled}
              />
              <Label htmlFor="drip">Enable DRIP Reinvestment</Label>
            </div>

            <Separator />

            <div>
              <Button
                onClick={saveCalculation}
                disabled={isSaving || !projectionResult || !user?.id}
                className="flex-1"
              >
                <Save className="w-4 h-4 mr-2" />
                {!user?.id ? 'Login to Save' : 'Save'}
              </Button>
              <Button
                onClick={exportToCsv}
                disabled={!projectionResult}
                variant="outline"
              >
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-6">
          {projectionResult && (
            <>
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-primary">
                        {projectionResult.currentYield.toFixed(2)}%
                      </div>
                      <div className="text-sm text-muted-foreground">Current Yield</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-success">
                        ${projectionResult.annualIncomeNow.toFixed(0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Annual Income</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-chart-2">
                        ${projectionResult.netIncomeTotal.toFixed(0)}
                      </div>
                      <div className="text-sm text-muted-foreground">Net Income ({monthsHorizon}m)</div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-chart-3">
                        {projectionResult.endShares.toFixed(2)}
                      </div>
                      <div className="text-sm text-muted-foreground">End Shares</div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Projected Income by Month</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={incomeChartData}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="period" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => [`$${value.toFixed(2)}`, 'Income']} />
                        <Bar dataKey="netIncome" fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {dripEnabled && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Share Growth (DRIP)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={250}>
                        <LineChart data={incomeChartData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="period" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => [value.toFixed(4), 'Shares']} />
                          <Line 
                            type="monotone" 
                            dataKey="cumulativeShares" 
                            stroke="hsl(var(--success))" 
                            strokeWidth={2}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                )}
              </div>
            </>
          )}

          {isLoading && (
            <Card>
              <CardContent className="pt-8">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="mt-2 text-muted-foreground">Calculating projection...</p>
                </div>
              </CardContent>
            </Card>
          )}

          {!projectionResult && !isLoading && symbol && (
            <Card>
              <CardContent className="pt-8">
                <div className="text-center text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-4" />
                  <p>Enter symbol, shares, and price to see dividend projections</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};