import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  ArrowLeft, 
  ArrowRight, 
  RotateCcw, 
  ExternalLink, 
  Shield, 
  Globe,
  Home
} from 'lucide-react';

export default function BrokerageDock() {
  const [currentUrl, setCurrentUrl] = useState('https://app.alpaca.markets');
  const [inputUrl, setInputUrl] = useState('https://app.alpaca.markets');
  const [isLoading, setIsLoading] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  // Popular trading platforms for quick access
  const quickAccess = [
    { name: 'Alpaca', url: 'https://app.alpaca.markets' },
    { name: 'TradingView', url: 'https://www.tradingview.com' },
    { name: 'Interactive Brokers', url: 'https://www.interactivebrokers.com' },
    { name: 'TD Ameritrade', url: 'https://invest.ameritrade.com' },
    { name: 'E*TRADE', url: 'https://us.etrade.com' },
    { name: 'Yahoo Finance', url: 'https://finance.yahoo.com' }
  ];

  const formatUrl = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url;
    }
    return url;
  };

  const navigateToUrl = (url: string) => {
    const formattedUrl = formatUrl(url);
    setCurrentUrl(formattedUrl);
    setInputUrl(formattedUrl);
    setIsLoading(true);
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    navigateToUrl(inputUrl);
  };

  const handleRefresh = () => {
    if (iframeRef.current) {
      iframeRef.current.src = currentUrl;
      setIsLoading(true);
    }
  };

  const handleBack = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.history.back();
      } catch (error) {
        console.log('Cannot access iframe history due to cross-origin restrictions');
      }
    }
  };

  const handleForward = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      try {
        iframeRef.current.contentWindow.history.forward();
      } catch (error) {
        console.log('Cannot access iframe history due to cross-origin restrictions');
      }
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedText = e.dataTransfer.getData('text/plain');
    
    // Check if dropped text looks like a URL
    if (droppedText && (droppedText.includes('.') || droppedText.startsWith('http'))) {
      navigateToUrl(droppedText);
    }
  };

  const openInNewTab = () => {
    window.open(currentUrl, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brokerage Dock</h1>
          <p className="text-muted-foreground">
            Simple web browser for accessing trading platforms and financial sites
          </p>
        </div>
      </div>

      {/* Compliance Banner */}
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Compliance Notice:</strong> StagAlgo does not hold, custody, or manage your funds. 
          You are viewing external websites through a secure browser window.
        </AlertDescription>
      </Alert>

      {/* Quick Access Buttons */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Quick Access
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {quickAccess.map((site) => (
              <Button
                key={site.name}
                variant="outline"
                size="sm"
                onClick={() => navigateToUrl(site.url)}
                className="text-xs"
              >
                {site.name}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Browser Interface */}
      <Card className="h-[800px]">
        <CardHeader className="pb-4">
          {/* Navigation Controls */}
          <div className="flex items-center gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleBack}
              className="p-2"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleForward}
              className="p-2"
            >
              <ArrowRight className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className="p-2"
            >
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigateToUrl('https://app.alpaca.markets')}
              className="p-2"
            >
              <Home className="h-4 w-4" />
            </Button>
          </div>

          {/* URL Bar */}
          <form onSubmit={handleUrlSubmit} className="flex gap-2">
            <Input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="Enter website URL or drag and drop a link here..."
              className="flex-1"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            />
            <Button type="submit" variant="outline">
              Go
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={openInNewTab}
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </form>
        </CardHeader>

        <CardContent className="p-0">
          <div 
            className="relative h-[680px] w-full"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {isLoading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="animate-pulse text-muted-foreground">Loading...</div>
              </div>
            )}
            
            <iframe
              ref={iframeRef}
              src={currentUrl}
              className="w-full h-full border-0 rounded-b-lg"
              title="Brokerage Dock Browser"
              sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-downloads"
              onLoad={() => setIsLoading(false)}
              onError={() => setIsLoading(false)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardContent className="pt-6">
          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>How to use:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Type any website URL in the address bar and click "Go"</li>
              <li>Use quick access buttons for popular trading platforms</li>
              <li>Drag and drop URLs from your browser into the address bar</li>
              <li>Use navigation buttons to go back, forward, or refresh</li>
              <li>Click the external link button to open the current page in a new tab</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}