import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  DollarSign, 
  Target,
  Shield,
  Clock
} from 'lucide-react';

interface OrderValidationProps {
  order: {
    symbol: string;
    side: 'buy' | 'sell';
    quantity: number;
    price: number;
  };
  account: {
    cash: number;
    equity: number;
    positions: any[];
  };
  riskSettings: {
    maxPositionSize: number;
    maxRiskPerTrade: number;
    maxDailyLoss: number;
  };
}

interface ValidationCheck {
  id: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  severity: 'low' | 'medium' | 'high';
}

export function OrderValidation({ order, account, riskSettings }: OrderValidationProps) {
  const calculateOrderValue = () => order.quantity * order.price;
  const orderValue = calculateOrderValue();

  const runValidationChecks = (): ValidationCheck[] => {
    const checks: ValidationCheck[] = [];

    // Buying power check
    if (order.side === 'buy') {
      const sufficientFunds = account.cash >= orderValue;
      checks.push({
        id: 'buying-power',
        name: 'Buying Power',
        status: sufficientFunds ? 'pass' : 'fail',
        message: sufficientFunds 
          ? `Sufficient funds: $${account.cash.toLocaleString()} available`
          : `Insufficient funds: Need $${orderValue.toLocaleString()}, have $${account.cash.toLocaleString()}`,
        severity: 'high'
      });
    }

    // Position size check
    const positionSizePercent = (orderValue / account.equity) * 100;
    const positionSizeOk = positionSizePercent <= riskSettings.maxPositionSize;
    checks.push({
      id: 'position-size',
      name: 'Position Size',
      status: positionSizeOk ? 'pass' : positionSizePercent <= riskSettings.maxPositionSize * 1.2 ? 'warning' : 'fail',
      message: `${positionSizePercent.toFixed(1)}% of equity (limit: ${riskSettings.maxPositionSize}%)`,
      severity: 'medium'
    });

    // Risk per trade check
    const riskPerTrade = (orderValue * 0.02) / account.equity * 100; // Assuming 2% stop loss
    const riskOk = riskPerTrade <= riskSettings.maxRiskPerTrade;
    checks.push({
      id: 'risk-per-trade',
      name: 'Risk Per Trade',
      status: riskOk ? 'pass' : 'warning',
      message: `${riskPerTrade.toFixed(2)}% risk (limit: ${riskSettings.maxRiskPerTrade}%)`,
      severity: 'medium'
    });

    // Market hours check
    const now = new Date();
    const marketOpen = now.getHours() >= 9 && now.getHours() < 16;
    checks.push({
      id: 'market-hours',
      name: 'Market Hours',
      status: marketOpen ? 'pass' : 'warning',
      message: marketOpen ? 'Market is open' : 'Market is closed - order will queue',
      severity: 'low'
    });

    // Symbol validation
    const validSymbol = /^[A-Z]{1,5}$/.test(order.symbol);
    checks.push({
      id: 'symbol-validation',
      name: 'Symbol Format',
      status: validSymbol ? 'pass' : 'fail',
      message: validSymbol ? 'Valid symbol format' : 'Invalid symbol format',
      severity: 'high'
    });

    // Minimum order size
    const minOrderValue = 500; // $500 minimum
    const orderSizeOk = orderValue >= minOrderValue;
    checks.push({
      id: 'min-order-size',
      name: 'Minimum Order Size',
      status: orderSizeOk ? 'pass' : 'fail',
      message: orderSizeOk 
        ? `Order value: $${orderValue.toLocaleString()}` 
        : `Order too small: $${orderValue.toLocaleString()} (min: $${minOrderValue})`,
      severity: 'medium'
    });

    return checks;
  };

  const validationChecks = runValidationChecks();
  const passedChecks = validationChecks.filter(c => c.status === 'pass').length;
  const failedChecks = validationChecks.filter(c => c.status === 'fail').length;
  const warningChecks = validationChecks.filter(c => c.status === 'warning').length;

  const canExecute = failedChecks === 0;

  const getStatusIcon = (status: ValidationCheck['status']) => {
    switch (status) {
      case 'pass': return <CheckCircle className="w-4 h-4 text-accent" />;
      case 'fail': return <XCircle className="w-4 h-4 text-destructive" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-warning" />;
    }
  };

  const getStatusBadge = (status: ValidationCheck['status']) => {
    switch (status) {
      case 'pass': return <Badge variant="default" className="bg-accent text-accent-foreground">Pass</Badge>;
      case 'fail': return <Badge variant="destructive">Fail</Badge>;
      case 'warning': return <Badge variant="outline" className="border-warning text-warning">Warning</Badge>;
    }
  };

  return (
    <Card className="bg-gradient-card shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="w-5 h-5" />
          Order Validation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-accent">{passedChecks}</div>
            <div className="text-sm text-muted-foreground">Passed</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-warning">{warningChecks}</div>
            <div className="text-sm text-muted-foreground">Warnings</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-destructive">{failedChecks}</div>
            <div className="text-sm text-muted-foreground">Failed</div>
          </div>
        </div>

        {/* Overall Status */}
        <Alert className={canExecute ? 'border-accent' : 'border-destructive'}>
          <AlertDescription className="flex items-center gap-2">
            {canExecute ? (
              <>
                <CheckCircle className="w-4 h-4 text-accent" />
                Order ready for execution
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 text-destructive" />
                Order cannot be executed - resolve failed checks
              </>
            )}
          </AlertDescription>
        </Alert>

        {/* Detailed Checks */}
        <div className="space-y-2">
          <h4 className="font-semibold">Validation Details</h4>
          {validationChecks.map((check) => (
            <div key={check.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-3">
                {getStatusIcon(check.status)}
                <div>
                  <div className="font-medium">{check.name}</div>
                  <div className="text-sm text-muted-foreground">{check.message}</div>
                </div>
              </div>
              {getStatusBadge(check.status)}
            </div>
          ))}
        </div>

        {/* Order Summary */}
        <div className="mt-6 p-4 rounded-lg bg-muted/20">
          <h4 className="font-semibold mb-2 flex items-center gap-2">
            <Target className="w-4 h-4" />
            Order Summary
          </h4>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Symbol:</span>
              <span className="ml-2 font-medium">{order.symbol}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Side:</span>
              <span className={`ml-2 font-medium ${order.side === 'buy' ? 'text-accent' : 'text-destructive'}`}>
                {order.side.toUpperCase()}
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Quantity:</span>
              <span className="ml-2 font-medium">{order.quantity.toLocaleString()}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Price:</span>
              <span className="ml-2 font-medium">${order.price.toFixed(2)}</span>
            </div>
            <div className="col-span-2">
              <span className="text-muted-foreground">Total Value:</span>
              <span className="ml-2 font-medium flex items-center gap-1">
                <DollarSign className="w-3 h-3" />
                {orderValue.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}