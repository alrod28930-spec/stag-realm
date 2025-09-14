import React, { Suspense } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Loader2, 
  AlertTriangle, 
  ExternalLink,
  TrendingUp,
  BarChart3,
  Briefcase,
  Brain,
  Eye,
  Play,
  Newspaper,
  Star,
  Palette
} from 'lucide-react';
import type { PanelConfig } from '@/types/workspace';

// Panel component imports
import Charts from '@/pages/Charts';
import TradingDesk from '@/pages/TradingDesk';
import Portfolio from '@/pages/Portfolio';
import Intelligence from '@/pages/Intelligence';
import BrokerageDock from '@/pages/BrokerageDock';
import Cradle from '@/pages/Cradle';

interface PanelContentProps {
  panel: PanelConfig;
  isBubbleMode: boolean;
}

const PanelError: React.FC<{ error: string; onRetry?: () => void }> = ({ error, onRetry }) => (
  <div className="h-full flex flex-col items-center justify-center p-6 text-center">
    <AlertTriangle className="w-8 h-8 text-destructive mb-4" />
    <h3 className="font-medium text-destructive mb-2">Panel Error</h3>
    <p className="text-sm text-muted-foreground mb-4">{error}</p>
    {onRetry && (
      <Button variant="outline" size="sm" onClick={onRetry}>
        Try Again
      </Button>
    )}
  </div>
);

const PanelLoading: React.FC = () => (
  <div className="h-full flex items-center justify-center">
    <div className="text-center">
      <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
      <p className="text-sm text-muted-foreground">Loading panel...</p>
    </div>
  </div>
);

const ExternalPanel: React.FC<{ url: string; title: string }> = ({ url, title }) => {
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  // Basic URL security check
  const isAllowedUrl = (checkUrl: string) => {
    try {
      const urlObj = new URL(checkUrl);
      const allowedDomains = [
        'app.alpaca.markets',
        'tradingview.com',
        'www.tradingview.com',
        'finviz.com',
        'finance.yahoo.com',
        'yahoo.com',
        'investing.com',
        'marketwatch.com',
        'bloomberg.com',
        'cnbc.com'
      ];
      
      return allowedDomains.some(domain => 
        urlObj.hostname === domain || urlObj.hostname.endsWith('.' + domain)
      );
    } catch {
      return false;
    }
  };

  if (!isAllowedUrl(url)) {
    return (
      <PanelError error="This URL is not allowed for security reasons. Only whitelisted financial platforms are supported." />
    );
  }

  return (
    <div className="h-full flex flex-col">
      {loading && (
        <div className="absolute inset-0 z-10">
          <PanelLoading />
        </div>
      )}
      
      <div className="flex items-center gap-2 p-2 border-b bg-muted/50 text-sm">
        <ExternalLink className="w-4 h-4" />
        <span className="truncate">{url}</span>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => window.open(url, '_blank')}
          className="ml-auto h-6 px-2"
        >
          Open
        </Button>
      </div>
      
      <iframe
        src={url}
        title={title}
        className="flex-1 w-full border-0"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-top-navigation-by-user-activation"
        onLoad={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError('Failed to load external content');
        }}
      />
      
      {error && <PanelError error={error} />}
    </div>
  );
};

const InternalPanel: React.FC<{ contentType: string; props?: Record<string, any> }> = ({ 
  contentType, 
  props 
}) => {
  // Render the appropriate internal component based on contentType
  const renderContent = () => {
    switch (contentType) {
      case 'charts':
        return <Charts />;
      case 'trading-desk':
        return <TradingDesk />;
      case 'portfolio':
        return <Portfolio />;
      case 'analyst':
        return <Intelligence />;
      case 'oracle':
        return (
          <div className="h-full flex items-center justify-center p-6 text-center">
            <div>
              <Eye className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Oracle Panel</h3>
              <p className="text-sm text-muted-foreground">Oracle signals and market insights</p>
            </div>
          </div>
        );
      case 'recorder':
        return (
          <div className="h-full flex items-center justify-center p-6 text-center">
            <div>
              <Play className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Recorder Panel</h3>
              <p className="text-sm text-muted-foreground">System events and audit trail</p>
            </div>
          </div>
        );
      case 'news':
        return (
          <div className="h-full flex items-center justify-center p-6 text-center">
            <div>
              <Newspaper className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">News Panel</h3>
              <p className="text-sm text-muted-foreground">Market news and analysis</p>
            </div>
          </div>
        );
      case 'watchlist':
        return (
          <div className="h-full flex items-center justify-center p-6 text-center">
            <div>
              <Star className="w-12 h-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Watchlist Panel</h3>
              <p className="text-sm text-muted-foreground">Tracked symbols and alerts</p>
            </div>
          </div>
        );
      case 'cradle':
        return <Cradle />;
      case 'brokerage-dock':
        return <BrokerageDock />;
      default:
        return (
          <PanelError error={`Unknown content type: ${contentType}`} />
        );
    }
  };

  return (
    <Suspense fallback={<PanelLoading />}>
      <div className="h-full overflow-hidden">
        {renderContent()}
      </div>
    </Suspense>
  );
};

export const PanelContent: React.FC<PanelContentProps> = ({ panel }) => {
  if (panel.type === 'external' && panel.url) {
    return <ExternalPanel url={panel.url} title={panel.title || 'External Content'} />;
  }

  if (panel.type === 'internal' && panel.contentType) {
    return <InternalPanel contentType={panel.contentType} props={panel.props} />;
  }

  return (
    <PanelError error="Invalid panel configuration" />
  );
};