import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { useRealPortfolioStore } from '@/stores/realPortfolioStore';
import { Building2 } from 'lucide-react';

export function AllocationsCard() {
  const { positions, portfolio } = useRealPortfolioStore();

  const allocationData = positions.map(pos => ({
    name: pos.symbol,
    value: pos.mv || 0,
    percentage: portfolio?.equity ? ((pos.mv || 0) / portfolio.equity * 100) : 0
  })).filter(item => item.value > 0);

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-card p-3 rounded-lg shadow-lg border">
          <p className="font-semibold">{data.name}</p>
          <p className="text-sm text-muted-foreground">
            ${data.value.toLocaleString()} ({data.percentage.toFixed(1)}%)
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          Allocation by Symbol
        </CardTitle>
        <Building2 className="h-4 w-4 text-primary" />
      </CardHeader>
      <CardContent>
        {allocationData.length > 0 ? (
          <>
            <div className="h-32 mb-4">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={allocationData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={60}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {allocationData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-1">
              {allocationData.slice(0, 3).map((item, index) => (
                <div key={item.name} className="flex justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div 
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: COLORS[index % COLORS.length] }}
                    />
                    <span>{item.name}</span>
                  </div>
                  <span className="font-medium">{item.percentage.toFixed(1)}%</span>
                </div>
              ))}
              {allocationData.length > 3 && (
                <div className="text-xs text-muted-foreground">
                  +{allocationData.length - 3} more symbols
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">No positions to display</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}