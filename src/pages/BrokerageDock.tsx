import { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, ExternalLink } from 'lucide-react';

export default function BrokerageDock() {
  const [currentUrl, setCurrentUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const formatUrl = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url;
    }
    return url;
  };

  // Handle iframe loading with proper timing
  useEffect(() => {
    if (!currentUrl || !iframeRef.current) return;

    console.log('Setting up iframe for URL:', currentUrl);
    setIsLoading(true);
    setLoadError(false);

    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // Set up timeout for loading
    timeoutRef.current = setTimeout(() => {
      console.log('Iframe load timeout for:', currentUrl);
      setIsLoading(false);
      setLoadError(true);
    }, 10000);

    const iframe = iframeRef.current;

    const handleLoad = () => {
      console.log('Iframe loaded successfully:', currentUrl);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsLoading(false);
      setLoadError(false);
    };

    const handleError = () => {
      console.log('Iframe load error:', currentUrl);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      setIsLoading(false);
      setLoadError(true);
    };

    // Set up event listeners
    iframe.onload = handleLoad;
    iframe.onerror = handleError;

    // Cleanup function
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      if (iframe) {
        iframe.onload = null;
        iframe.onerror = null;
      }
    };
  }, [currentUrl]);

  const navigateToUrl = (url: string) => {
    const formattedUrl = formatUrl(url);
    console.log('Navigating to URL:', formattedUrl);
    setCurrentUrl(formattedUrl);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const droppedText = e.dataTransfer.getData('text/plain');
    
    if (droppedText && (droppedText.includes('.') || droppedText.startsWith('http'))) {
      navigateToUrl(droppedText);
    }
  };

  const openInNewTab = () => {
    if (currentUrl) {
      window.open(currentUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Brokerage Dock</h1>
        <p className="text-muted-foreground">
          Drop any URL into the window below to view websites
        </p>
      </div>

      {/* Compliance Banner */}
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Compliance Notice:</strong> StagAlgo does not hold, custody, or manage your funds.
        </AlertDescription>
      </Alert>

      {/* Simple Drag & Drop Window */}
      <Card>
        <CardContent className="p-6">
          <div 
            className="relative h-[500px] w-full border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10 hover:border-muted-foreground/50 transition-colors"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {!currentUrl && (
              <div className="absolute inset-0 flex items-center justify-center text-center">
                <div className="text-muted-foreground">
                  <p className="text-lg font-medium mb-2">Drop a URL here</p>
                  <p className="text-sm">Drag and drop any website URL into this window</p>
                </div>
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <div className="ml-3 text-muted-foreground">Loading...</div>
              </div>
            )}
            
            {loadError && (
              <div className="absolute inset-0 bg-background/90 flex items-center justify-center z-10">
                <div className="text-center space-y-4">
                  <div className="text-destructive">
                    <Shield className="h-12 w-12 mx-auto mb-2" />
                    <h3 className="text-lg font-medium">Cannot Load Site</h3>
                    <p className="text-sm text-muted-foreground">
                      This website blocks iframe embedding for security.
                    </p>
                  </div>
                  <button 
                    onClick={openInNewTab}
                    className="inline-flex items-center px-4 py-2 border border-muted rounded-md text-sm hover:bg-muted/50 transition-colors"
                  >
                    <ExternalLink className="h-4 w-4 mr-2" />
                    Open Externally
                  </button>
                </div>
              </div>
            )}
            
            {currentUrl && (
              <iframe
                ref={iframeRef}
                src={currentUrl}
                className="w-full h-full border-0 rounded-lg"
                title="Web Portal"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-downloads"
                style={{ display: loadError ? 'none' : 'block' }}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}