import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Shield, ExternalLink, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface WindowState {
  url: string;
  isLoading: boolean;
  loadError: boolean;
}

export default function BrokerageDock() {
  const [currentWindow, setCurrentWindow] = useState(0);
  const [windows, setWindows] = useState<WindowState[]>([
    { url: '', isLoading: false, loadError: false },
    { url: '', isLoading: false, loadError: false },
    { url: '', isLoading: false, loadError: false }
  ]);

  const iframeRefs = [
    useRef<HTMLIFrameElement>(null),
    useRef<HTMLIFrameElement>(null),
    useRef<HTMLIFrameElement>(null)
  ];
  const timeoutRefs = [
    useRef<NodeJS.Timeout | null>(null),
    useRef<NodeJS.Timeout | null>(null),
    useRef<NodeJS.Timeout | null>(null)
  ];
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const formatUrl = (url: string) => {
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url;
    }
    return url;
  };

  const updateWindowState = (windowIndex: number, updates: Partial<WindowState>) => {
    setWindows(prev => prev.map((window, index) => 
      index === windowIndex ? { ...window, ...updates } : window
    ));
  };

  // Handle iframe loading for each window
  useEffect(() => {
    windows.forEach((window, windowIndex) => {
      if (!window.url || !iframeRefs[windowIndex].current) return;

      console.log(`Setting up iframe ${windowIndex} for URL:`, window.url);
      updateWindowState(windowIndex, { isLoading: true, loadError: false });

      // Clear any existing timeout
      if (timeoutRefs[windowIndex].current) {
        clearTimeout(timeoutRefs[windowIndex].current!);
      }

      // Set up timeout for loading - shorter for better UX
      timeoutRefs[windowIndex].current = setTimeout(() => {
        console.log(`Iframe ${windowIndex} load timeout for:`, window.url);
        updateWindowState(windowIndex, { isLoading: false, loadError: true });
      }, 8000);

      const iframe = iframeRefs[windowIndex].current!;

      const handleLoad = () => {
        console.log(`Iframe ${windowIndex} loaded successfully:`, window.url);
        if (timeoutRefs[windowIndex].current) {
          clearTimeout(timeoutRefs[windowIndex].current!);
          timeoutRefs[windowIndex].current = null;
        }
        
        // Additional check for blocked content after a short delay
        setTimeout(() => {
          try {
            // For known financial sites that block iframes, show error immediately
            const url = window.url.toLowerCase();
            const blockedDomains = ['alpaca.markets', 'robinhood.com', 'schwab.com', 'fidelity.com', 'etrade.com'];
            const isKnownBlocked = blockedDomains.some(domain => url.includes(domain));
            
            if (isKnownBlocked) {
              console.log(`Known blocked domain detected: ${window.url}`);
              updateWindowState(windowIndex, { isLoading: false, loadError: true });
              return;
            }
            
            // Try to detect if content is actually loading
            const iframeDoc = iframe.contentDocument;
            if (iframeDoc && iframeDoc.body && iframeDoc.body.innerHTML.trim() === '') {
              console.log(`Iframe ${windowIndex} appears empty/blocked:`, window.url);
              updateWindowState(windowIndex, { isLoading: false, loadError: true });
            } else {
              updateWindowState(windowIndex, { isLoading: false, loadError: false });
            }
          } catch (e) {
            // Cross-origin error is expected and means the site is actually loading
            console.log(`Iframe ${windowIndex} cross-origin (site loading):`, window.url);
            updateWindowState(windowIndex, { isLoading: false, loadError: false });
          }
        }, 2000);
      };

      const handleError = () => {
        console.log(`Iframe ${windowIndex} load error:`, window.url);
        if (timeoutRefs[windowIndex].current) {
          clearTimeout(timeoutRefs[windowIndex].current!);
          timeoutRefs[windowIndex].current = null;
        }
        updateWindowState(windowIndex, { isLoading: false, loadError: true });
      };

      // Set up event listeners
      iframe.onload = handleLoad;
      iframe.onerror = handleError;
    });

    // Cleanup function
    return () => {
      timeoutRefs.forEach((timeoutRef, index) => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        if (iframeRefs[index].current) {
          iframeRefs[index].current!.onload = null;
          iframeRefs[index].current!.onerror = null;
        }
      });
    };
  }, [windows.map(w => w.url).join(',')]);

  const navigateToUrl = (windowIndex: number, url: string) => {
    const formattedUrl = formatUrl(url);
    console.log(`Navigating window ${windowIndex} to URL:`, formattedUrl);
    console.log('Current window state before update:', windows[windowIndex]);
    updateWindowState(windowIndex, { url: formattedUrl });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (windowIndex: number) => (e: React.DragEvent) => {
    e.preventDefault();
    console.log('Drop event triggered on window', windowIndex);
    
    // Try multiple data transfer types
    const droppedText = e.dataTransfer.getData('text/plain') || 
                       e.dataTransfer.getData('text/uri-list') || 
                       e.dataTransfer.getData('text/html') ||
                       e.dataTransfer.getData('URL');
    
    console.log('Dropped text:', droppedText);
    
    if (droppedText) {
      const extractedUrl = validateAndExtractUrl(droppedText);
      if (extractedUrl) {
        console.log('Attempting to navigate to dropped URL:', extractedUrl);
        navigateToUrl(windowIndex, extractedUrl);
      } else {
        console.log('Dropped text not recognized as URL:', droppedText);
      }
    } else {
      console.log('No text data found in drop event');
      // Try to get data from files if it's a file drop
      const files = Array.from(e.dataTransfer.files);
      console.log('Files dropped:', files);
    }
  };

  const openInNewTab = (windowIndex: number) => {
    const url = windows[windowIndex].url;
    if (url) {
      window.open(url, '_blank');
    }
  };

  const clearWindow = (windowIndex: number) => {
    updateWindowState(windowIndex, { url: '', isLoading: false, loadError: false });
  };

  // Validate and extract URL from text input
  const validateAndExtractUrl = useCallback((text: string): string | null => {
    if (!text || typeof text !== 'string') return null;
    
    // Trim and limit input length for security
    const cleanText = text.trim().substring(0, 2048);
    if (cleanText.length === 0) return null;
    
    // Remove HTML tags for security
    const cleanUrl = cleanText.replace(/<[^>]*>/g, '').trim();
    
    // URL validation patterns
    const urlPattern = /https?:\/\/[^\s]+|[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]*\.+[a-zA-Z]{2,}/;
    const isUrl = cleanUrl.startsWith('http') || 
                 cleanUrl.startsWith('www.') || 
                 urlPattern.test(cleanUrl) ||
                 cleanUrl.includes('.') ||
                 cleanUrl.includes('alpaca.markets');
    
    if (isUrl) {
      return cleanUrl;
    }
    
    // Try to extract URL from within the text
    const urlMatch = cleanText.match(/https?:\/\/[^\s]+/);
    return urlMatch ? urlMatch[0] : null;
  }, []);

  // Handle paste functionality
  const handlePaste = useCallback(async (windowIndex: number) => {
    try {
      if (!navigator.clipboard || !navigator.clipboard.readText) {
        console.log('Clipboard API not available');
        return;
      }
      
      const clipboardText = await navigator.clipboard.readText();
      console.log('Pasted text:', clipboardText);
      
      const extractedUrl = validateAndExtractUrl(clipboardText);
      if (extractedUrl) {
        console.log('Attempting to navigate to pasted URL:', extractedUrl);
        navigateToUrl(windowIndex, extractedUrl);
      } else {
        console.log('No valid URL found in clipboard text');
      }
    } catch (error) {
      console.log('Failed to read clipboard:', error);
    }
  }, [validateAndExtractUrl]);

  // Handle keyboard events for paste
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Check for Ctrl+V (Windows/Linux) or Cmd+V (Mac)
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') {
        // Only handle paste if we're focused on the brokerage dock page
        const activeElement = document.activeElement;
        const isInputField = activeElement?.tagName === 'INPUT' || activeElement?.tagName === 'TEXTAREA';
        
        if (!isInputField) {
          e.preventDefault();
          // Paste into the current window
          handlePaste(currentWindow);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handlePaste, currentWindow]);

  const scrollToWindow = (windowIndex: number) => {
    setCurrentWindow(windowIndex);
    if (scrollContainerRef.current) {
      const windowWidth = scrollContainerRef.current.clientWidth;
      scrollContainerRef.current.scrollTo({
        left: windowIndex * windowWidth,
        behavior: 'smooth'
      });
    }
  };

  const renderWindow = (windowIndex: number) => {
    const window = windows[windowIndex];
    
    return (
      <div key={windowIndex} className="w-full flex-shrink-0">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <Badge variant="outline">
                Window {windowIndex + 1}
              </Badge>
              <div className="flex items-center gap-1">
                {window.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openInNewTab(windowIndex)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
                {window.url && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => clearWindow(windowIndex)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
            
            <div 
              className="relative h-[500px] w-full border-2 border-dashed border-muted-foreground/25 rounded-lg bg-muted/10 hover:border-muted-foreground/50 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop(windowIndex)}
              onDragEnter={(e) => {
                e.preventDefault();
                console.log(`Drag enter on window ${windowIndex}`);
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                console.log(`Drag leave on window ${windowIndex}`);
              }}
            >
              {!window.url && (
                <div className="absolute inset-0 flex items-center justify-center text-center">
                  <div className="text-muted-foreground">
                    <p className="text-lg font-medium mb-2">Drop or Paste a URL here</p>
                    <p className="text-sm mb-1">Drag and drop any website URL into this window</p>
                    <p className="text-xs text-muted-foreground/75">or press Ctrl+V (Cmd+V on Mac) to paste</p>
                  </div>
                </div>
              )}

              {window.isLoading && (
                <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-10">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  <div className="ml-3 text-muted-foreground">Loading...</div>
                </div>
              )}
              
              {window.loadError && (
                <div className="absolute inset-0 bg-background/90 flex items-center justify-center z-10">
                  <div className="text-center space-y-4">
                    <div className="text-destructive">
                      <Shield className="h-12 w-12 mx-auto mb-2" />
                      <h3 className="text-lg font-medium">
                        {window.url.toLowerCase().includes('alpaca') 
                          ? 'Alpaca Blocks Embedding' 
                          : 'Cannot Load Site'}
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm mx-auto">
                        {window.url.toLowerCase().includes('alpaca')
                          ? 'Alpaca and other brokerages block iframe embedding for security. Use the button below to access your account.'
                          : 'This website blocks iframe embedding for security reasons.'}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <button 
                        onClick={() => openInNewTab(windowIndex)}
                        className="inline-flex items-center px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm hover:bg-primary/90 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {window.url.toLowerCase().includes('alpaca') 
                          ? 'Open Alpaca Account' 
                          : 'Open in New Tab'}
                      </button>
                      {window.url.toLowerCase().includes('alpaca') && (
                        <p className="text-xs text-muted-foreground">
                          Quick access: paper.alpaca.markets • app.alpaca.markets
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              {window.url && (
                <iframe
                  ref={iframeRefs[windowIndex]}
                  src={window.url}
                  className="w-full h-full border-0 rounded-lg"
                  title={`Web Portal ${windowIndex + 1}`}
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-top-navigation allow-downloads"
                  style={{ display: window.loadError ? 'none' : 'block' }}
                />
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Brokerage Dock</h1>
          <p className="text-muted-foreground">
            Drop URLs into any window or paste with Ctrl+V (Cmd+V on Mac) - scroll to navigate between windows
          </p>
        </div>
        
        {/* Window Navigation */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrollToWindow(Math.max(0, currentWindow - 1))}
            disabled={currentWindow === 0}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          
          <div className="flex gap-1">
            {[0, 1, 2].map(index => (
              <Button
                key={index}
                variant={currentWindow === index ? "default" : "outline"}
                size="sm"
                onClick={() => scrollToWindow(index)}
                className="w-8 h-8 p-0"
              >
                {index + 1}
              </Button>
            ))}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => scrollToWindow(Math.min(2, currentWindow + 1))}
            disabled={currentWindow === 2}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Compliance Banner */}
      <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <Shield className="h-4 w-4 text-amber-600" />
        <AlertDescription className="text-amber-800 dark:text-amber-200">
          <strong>Compliance Notice:</strong> StagAlgo does not hold, custody, or manage your funds.
        </AlertDescription>
      </Alert>

      {/* Scrollable Windows Container */}
      <div 
        ref={scrollContainerRef}
        className="flex overflow-x-auto scroll-smooth gap-6 pb-4"
        style={{ scrollSnapType: 'x mandatory' }}
        onScroll={(e) => {
          const container = e.currentTarget;
          const windowWidth = container.clientWidth;
          const scrollLeft = container.scrollLeft;
          const windowIndex = Math.round(scrollLeft / windowWidth);
          if (windowIndex !== currentWindow) {
            setCurrentWindow(windowIndex);
          }
        }}
      >
        {[0, 1, 2].map(renderWindow)}
      </div>
    </div>
  );
}