import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { CreditCard, FileText, Settings, ExternalLink } from 'lucide-react';
import { BillingInvoice } from '@/hooks/useSubscription';
import { formatDistanceToNow } from 'date-fns';

interface BillingManagementProps {
  invoices: BillingInvoice[];
  hasActiveSubscription: boolean;
  onManagePayment: () => void;
  onOpenPortal: () => void;
  isOwner: boolean;
}

export function BillingManagement({ 
  invoices, 
  hasActiveSubscription, 
  onManagePayment, 
  onOpenPortal, 
  isOwner 
}: BillingManagementProps) {
  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  if (!isOwner) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing & Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-muted/50 border border-border rounded-lg p-4">
            <p className="text-sm text-muted-foreground">
              Billing is managed by the workspace owner. Contact your workspace administrator to make changes.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Billing & Payments
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button 
              onClick={onManagePayment} 
              variant="outline" 
              className="justify-start"
              disabled={!hasActiveSubscription}
            >
              <CreditCard className="h-4 w-4 mr-2" />
              Update Payment Method
            </Button>
            
            <Button 
              onClick={onOpenPortal} 
              variant="outline" 
              className="justify-start"
              disabled={!hasActiveSubscription}
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage Subscription
            </Button>
          </div>
          
          {!hasActiveSubscription && (
            <p className="text-xs text-muted-foreground">
              Payment and subscription management is available after subscribing to a plan.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <div className="text-center py-8">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No invoices yet</p>
              <p className="text-xs text-muted-foreground mt-1">
                Invoices will appear here after your first payment
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Invoice</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell>
                      <div>
                        <div className="text-sm">
                          {formatDistanceToNow(new Date(invoice.created_at), { addSuffix: true })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(invoice.created_at).toLocaleDateString()}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {formatAmount(invoice.amount_total, invoice.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">Paid</Badge>
                    </TableCell>
                    <TableCell>
                      {invoice.hosted_invoice_url ? (
                        <Button 
                          variant="ghost" 
                          size="sm"
                          asChild
                        >
                          <a 
                            href={invoice.hosted_invoice_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View
                          </a>
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">N/A</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}