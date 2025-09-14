import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface DividendInput {
  symbol: string;
  shares: number;
  currentPrice: number;
  adps: number;
  frequency: 'M' | 'Q' | 'S' | 'A';
  monthsHorizon: number;
  dripEnabled: boolean;
  withholdingPct: number;
  growthRate: number;
  priceAssumption?: number;
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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const input: DividendInput = await req.json();

    // Calculate frequency multiplier
    const getPaymentsPerYear = (frequency: string): number => {
      switch (frequency) {
        case 'M': return 12;
        case 'Q': return 4;
        case 'S': return 2;
        case 'A': return 1;
        default: return 4;
      }
    };

    const paymentsPerYear = getPaymentsPerYear(input.frequency);
    const quarterlyDividend = input.adps / paymentsPerYear;
    
    // Calculate current yield
    const currentYield = input.currentPrice > 0 ? (input.adps / input.currentPrice) * 100 : 0;
    const annualIncomeNow = input.shares * input.adps;

    // Calculate projections month by month
    const incomeCalendar = [];
    let runningShares = input.shares;
    let totalGrossIncome = 0;
    let totalNetIncome = 0;

    const currentDate = new Date();
    const monthsBetweenPayments = 12 / paymentsPerYear;

    for (let monthOffset = 0; monthOffset < input.monthsHorizon; monthOffset++) {
      const paymentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset);
      
      // Check if this month has a dividend payment based on frequency
      let isDividendMonth = false;
      
      if (input.frequency === 'M') {
        isDividendMonth = true; // Every month
      } else if (input.frequency === 'Q') {
        isDividendMonth = monthOffset % 3 === 0; // Every 3 months
      } else if (input.frequency === 'S') {
        isDividendMonth = monthOffset % 6 === 0; // Every 6 months  
      } else if (input.frequency === 'A') {
        isDividendMonth = monthOffset % 12 === 0; // Every 12 months
      }
      
      if (isDividendMonth) {
        // Calculate dividend growth
        const yearsElapsed = monthOffset / 12;
        const growthMultiplier = Math.pow(1 + input.growthRate / 100, yearsElapsed);
        const adjustedDividendPerShare = quarterlyDividend * growthMultiplier;
        
        const grossIncome = runningShares * adjustedDividendPerShare;
        const netIncome = grossIncome * (1 - input.withholdingPct / 100);
        
        totalGrossIncome += grossIncome;
        totalNetIncome += netIncome;

        // If DRIP is enabled, reinvest net income
        let newShares = 0;
        if (input.dripEnabled && input.currentPrice > 0) {
          const sharePrice = input.priceAssumption || input.currentPrice;
          newShares = netIncome / sharePrice;
          runningShares += newShares;
        }

        incomeCalendar.push({
          month: paymentDate.getMonth() + 1,
          year: paymentDate.getFullYear(),
          grossIncome,
          netIncome,
          shares: newShares,
          dividendPerShare: adjustedDividendPerShare,
          cumulativeShares: runningShares,
        });
      }
    }

    const result: ProjectionResult = {
      currentYield,
      annualIncomeNow,
      grossIncomeTotal: totalGrossIncome,
      netIncomeTotal: totalNetIncome,
      endShares: runningShares,
      incomeCalendar,
    };

    return new Response(
      JSON.stringify({ data: result }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calc-dividend-projection function:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});