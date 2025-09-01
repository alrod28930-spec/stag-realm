import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Crown, 
  CreditCard, 
  Download, 
  Calendar,
  Activity,
  BarChart3,
  Bot,
  Bell,
  Database,
  FileText,
  Shield,
  Check,
  ArrowUp,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Mock current subscription data - replace with actual Supabase data
const mockCurrentPlan = {
  name: 'Pro',
  status: 'Active',
  renewalDate: 'September 15, 2025',
  billingFrequency: 'Monthly',
  cost: '$199',
  tier: 'pro'
};

// Mock usage metrics - replace with actual data
const mockUsageMetrics = {
  botsActive: { current: 3, max: 10 },
  tradesMirrored: 42,
  alertsReceived: 18,
  storageUsed: { current: 750, max: 5000 }, // MB
  exportsGenerated: { csv: 4, pdf: 1 }
};

// Mock transaction history
const mockTransactions = [
  { date: 'Aug 15, 2025', description: 'Pro Plan – Monthly Renewal', amount: '$199', status: 'Paid' },
  { date: 'Jul 15, 2025', description: 'Pro Plan – Monthly Renewal', amount: '$199', status: 'Paid' },
  { date: 'Jun 15, 2025', description: 'Upgrade to Pro Plan', amount: '$199', status: 'Paid' },
  { date: 'Jun 15, 2025', description: 'Standard Plan Refund', amount: '-$99', status: 'Refunded' },
];

const subscriptionTiers = [
  {
    name: 'Lite',
    price: '$49',
    frequency: '/month',
    features: [
      'Paper trading only',
      'Limited analytics',
      'No Oracle insights',
      '30-day Recorder logs',
      'Basic support'
    ],
    tier: 'lite',
    popular: false
  },
  {
    name: 'Standard',
    price: '$99',
    frequency: '/month',
    features: [
      'Live trading enabled',
      'Basic Analyst responses',
      'Oracle feeds available',
      'Monthly CSV exports',
      'Standard support'
    ],
    tier: 'standard',
    popular: false
  },
  {
    name: 'Pro',
    price: '$199',
    frequency: '/month',
    features: [
      'Full Trade Bots access',
      'Analyst voice + advanced support',
      'Complete Oracle feeds',
      'Full Recorder reporting/exports',
      'Risk dashboards'
    ],
    tier: 'pro',
    popular: true
  },
  {
    name: 'Master/Elite',
    price: '$299',
    frequency: '/month',
    features: [
      'All Pro features',
      'Early feature access',
      'Premium priority support',
      '1-year Recorder storage',
      'Full usage metrics dashboard'
    ],
    tier: 'elite',
    popular: false
  }
];

export default function Subscription() {
  const [currentPlan, setCurrentPlan] = useState(mockCurrentPlan);
  const [usageMetrics, setUsageMetrics] = useState(mockUsageMetrics);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [saveCard, setSaveCard] = useState(false);
  const [billingFrequency, setBillingFrequency] = useState('monthly');
  const { toast } = useToast();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'trial': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'expired':
      case 'cancelled': return 'bg-red-500/20 text-red-400 border-red-500/30';
      default: return 'bg-muted text-muted-foreground';
    }
  };

  const getTierIcon = (tier: string) => {
    switch (tier) {
      case 'lite': return <Activity className="w-4 h-4" />;
      case 'standard': return <BarChart3 className="w-4 h-4" />;
      case 'pro': return <Bot className="w-4 h-4" />;
      case 'elite': return <Crown className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const handleUpgrade = (tierName: string) => {
    if (tierName === currentPlan.name) return;
    
    // TODO: Implement Stripe checkout
    toast({
      title: "Upgrade Initiated",
      description: `Upgrading to ${tierName} plan...`,
    });
  };

  const handlePaymentUpdate = () => {
    // TODO: Implement payment method update
    toast({
      title: "Payment Method Updated",
      description: "Your payment information has been securely updated.",
    });
    setShowPaymentForm(false);
  };

  const exportTransactions = (format: 'csv' | 'pdf') => {
    // TODO: Implement transaction export
    toast({
      title: "Export Generated",
      description: `Transaction history exported as ${format.toUpperCase()}.`,
    });
  };

  const refreshSubscription = () => {
    // TODO: Implement subscription status refresh
    toast({
      title: "Subscription Refreshed",
      description: "Your subscription status has been updated.",
    });
  };

  return (
    <div className="space-y-8">
      {/* Header with Crest */}
      <div className="text-center space-y-4">
        <div className="flex justify-center mb-6">
          <div className="relative">
            <img 
              src="/lovable-uploads/aa502076-83e2-4336-bda8-00b2eaac7a75.png" 
              alt="StagAlgo Crest" 
              className="w-20 h-20 object-contain"
            />
            <div className="absolute inset-0 bg-gradient-primary opacity-20 rounded-full blur-xl"></div>
          </div>
        </div>
        
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent font-serif">
          Subscription
        </h1>
        <p className="text-xl text-accent font-medium">
          Manage your plan, billing, and usage
        </p>
        <div className="w-24 h-1 bg-gradient-primary mx-auto rounded-full opacity-60"></div>
      </div>

      <ScrollArea className="h-[calc(100vh-16rem)]">
        <div className="space-y-8 pr-4">
          {/* Current Plan Section */}
          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-accent">
                  {getTierIcon(currentPlan.tier)}
                  Current Plan
                </CardTitle>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={refreshSubscription}
                  className="text-primary border-primary/30 hover:bg-primary/10"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-primary rounded-full flex items-center justify-center shadow-gold">
                      <Crown className="w-6 h-6 text-primary-foreground" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-bold text-accent">{currentPlan.name} Plan</h3>
                      <Badge className={getStatusColor(currentPlan.status)}>
                        {currentPlan.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Cost:</span>
                      <span className="font-semibold text-accent">{currentPlan.cost}/{currentPlan.billingFrequency.toLowerCase()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Renewal:</span>
                      <span className="font-medium">{currentPlan.renewalDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Billing:</span>
                      <span className="font-medium">{currentPlan.billingFrequency}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <Button 
                    className="w-full bg-gradient-primary hover:opacity-90"
                    onClick={() => handleUpgrade('upgrade')}
                  >
                    <ArrowUp className="w-4 h-4 mr-2" />
                    Upgrade Plan
                  </Button>
                  
                  <div className="text-center">
                    <Button variant="link" className="text-primary">
                      <Calendar className="w-4 h-4 mr-2" />
                      Manage Payment
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Usage Metrics Card */}
          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-accent">
                <BarChart3 className="w-6 h-6" />
                Usage Metrics
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Bots Active */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bot className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Bots Active</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-accent font-bold text-lg">
                        {usageMetrics.botsActive.current}
                      </span>
                      <span className="text-muted-foreground">
                        of {usageMetrics.botsActive.max} available
                      </span>
                    </div>
                    <Progress 
                      value={(usageMetrics.botsActive.current / usageMetrics.botsActive.max) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Trades Mirrored */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Trades This Month</span>
                  </div>
                  <div className="text-accent font-bold text-2xl">
                    {usageMetrics.tradesMirrored}
                  </div>
                </div>

                {/* Alerts Received */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Alerts Received</span>
                  </div>
                  <div className="text-accent font-bold text-2xl">
                    {usageMetrics.alertsReceived}
                  </div>
                </div>

                {/* Storage Used */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Database className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Storage Used</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-accent font-bold">
                        {(usageMetrics.storageUsed.current / 1000).toFixed(1)} GB
                      </span>
                      <span className="text-muted-foreground">
                        of {usageMetrics.storageUsed.max / 1000} GB
                      </span>
                    </div>
                    <Progress 
                      value={(usageMetrics.storageUsed.current / usageMetrics.storageUsed.max) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>

                {/* Exports Generated */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" />
                    <span className="text-sm font-medium">Exports Generated</span>
                  </div>
                  <div className="text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">CSV:</span>
                      <span className="text-accent font-semibold">{usageMetrics.exportsGenerated.csv}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">PDF:</span>
                      <span className="text-accent font-semibold">{usageMetrics.exportsGenerated.pdf}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="text-xs text-muted-foreground text-center p-2 bg-primary/5 rounded-lg">
                Usage resets each billing cycle
              </div>
            </CardContent>
          </Card>

          {/* Subscription Tiers */}
          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-accent">
                <Crown className="w-6 h-6" />
                Subscription Tiers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {subscriptionTiers.map((tier) => (
                  <Card key={tier.name} className={`relative ${tier.popular ? 'border-primary shadow-gold' : 'border-border'} bg-gradient-card`}>
                    {tier.popular && (
                      <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                        <Badge className="bg-gradient-primary text-primary-foreground">
                          Most Popular
                        </Badge>
                      </div>
                    )}
                    
                    <CardHeader className="text-center">
                      <div className="flex items-center justify-center gap-2 mb-2">
                        {getTierIcon(tier.tier)}
                        <CardTitle className="text-xl text-accent">{tier.name}</CardTitle>
                      </div>
                      
                      <div className="flex items-baseline justify-center gap-1">
                        <span className="text-3xl font-bold text-primary">{tier.price}</span>
                        <span className="text-muted-foreground">{tier.frequency}</span>
                      </div>
                    </CardHeader>
                    
                    <CardContent className="space-y-4">
                      <ul className="space-y-2">
                        {tier.features.map((feature, index) => (
                          <li key={index} className="flex items-center gap-2 text-sm">
                            <Check className="w-4 h-4 text-primary flex-shrink-0" />
                            <span>{feature}</span>
                          </li>
                        ))}
                      </ul>
                      
                      <Button 
                        className={`w-full ${
                          tier.name === currentPlan.name 
                            ? 'bg-muted text-muted-foreground cursor-not-allowed' 
                            : tier.popular 
                              ? 'bg-gradient-primary hover:opacity-90' 
                              : 'bg-primary/20 hover:bg-primary/30 text-primary border border-primary/30'
                        }`}
                        onClick={() => handleUpgrade(tier.name)}
                        disabled={tier.name === currentPlan.name}
                      >
                        {tier.name === currentPlan.name ? 'Current Plan' : `Select ${tier.name}`}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Renewal & Payment Section */}
          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardHeader>
              <CardTitle className="flex items-center gap-3 text-accent">
                <CreditCard className="w-6 h-6" />
                Payment & Renewal
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h3 className="font-semibold text-primary">Renewal Status</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Status:</span>
                      <Badge className={getStatusColor(currentPlan.status)}>
                        {currentPlan.status}
                      </Badge>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Next Billing:</span>
                      <span className="font-medium">{currentPlan.renewalDate}</span>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Button variant="outline" size="sm" className="text-red-400 border-red-500/30 hover:bg-red-500/10">
                      Cancel Subscription
                    </Button>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-primary">Payment Method</h3>
                  
                  {!showPaymentForm ? (
                    <div className="space-y-3">
                      <div className="p-3 bg-muted/30 rounded-lg border">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          <span className="text-sm">•••• •••• •••• 4242</span>
                          <span className="text-xs text-muted-foreground">Expires 12/26</span>
                        </div>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setShowPaymentForm(true)}
                        className="w-full"
                      >
                        Update Payment Method
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="cardName">Cardholder Name</Label>
                          <Input id="cardName" placeholder="John Doe" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cardNumber">Card Number</Label>
                          <Input id="cardNumber" placeholder="1234 5678 9012 3456" />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="expiry">Expiry Date</Label>
                          <Input id="expiry" placeholder="MM/YY" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cvv">CVV</Label>
                          <Input id="cvv" placeholder="123" />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="address1">Address Line 1</Label>
                        <Input id="address1" placeholder="123 Main St" />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City</Label>
                          <Input id="city" placeholder="New York" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="zip">ZIP Code</Label>
                          <Input id="zip" placeholder="10001" />
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch 
                          id="save-card" 
                          checked={saveCard}
                          onCheckedChange={setSaveCard}
                        />
                        <Label htmlFor="save-card" className="text-sm">
                          Save card on file (encrypted and secure)
                        </Label>
                      </div>

                      <div className="flex gap-2">
                        <Button 
                          onClick={handlePaymentUpdate}
                          className="bg-gradient-primary hover:opacity-90"
                        >
                          Update Payment Method
                        </Button>
                        <Button 
                          variant="outline" 
                          onClick={() => setShowPaymentForm(false)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Transaction History */}
          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-accent">
                  <FileText className="w-6 h-6" />
                  Transaction History
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportTransactions('csv')}
                    className="text-primary border-primary/30"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => exportTransactions('pdf')}
                    className="text-primary border-primary/30"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    PDF
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-2 text-muted-foreground">Date</th>
                      <th className="text-left py-2 text-muted-foreground">Description</th>
                      <th className="text-right py-2 text-muted-foreground">Amount</th>
                      <th className="text-right py-2 text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mockTransactions.map((transaction, index) => (
                      <tr key={index} className="border-b border-border/50">
                        <td className="py-3 text-sm">{transaction.date}</td>
                        <td className="py-3 text-sm">{transaction.description}</td>
                        <td className="py-3 text-sm text-right font-semibold">
                          {transaction.amount}
                        </td>
                        <td className="py-3 text-right">
                          <Badge 
                            className={
                              transaction.status === 'Paid' 
                                ? 'bg-green-500/20 text-green-400' 
                                : transaction.status === 'Refunded'
                                ? 'bg-blue-500/20 text-blue-400'
                                : 'bg-red-500/20 text-red-400'
                            }
                          >
                            {transaction.status}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Separator className="bg-gradient-to-r from-transparent via-primary/30 to-transparent" />

          {/* Compliance & Security Footer */}
          <Card className="bg-gradient-card shadow-card border-primary/20">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <Shield className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold text-primary">Security & Compliance</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    All payments are processed securely. StagAlgo does not store raw credit card data. 
                    Subscriptions renew automatically unless canceled. You remain responsible for your 
                    subscription management. StagAlgo provides educational trading tools, not financial advice.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </ScrollArea>
    </div>
  );
}