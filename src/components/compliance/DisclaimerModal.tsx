import { useState } from 'react';
import { AlertTriangle, Info, ShieldAlert, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { DisclaimerType } from '@/types/compliance';

interface DisclaimerModalProps {
  disclaimer: DisclaimerType;
  isOpen: boolean;
  onClose: () => void;
  onAcknowledge: () => void;
  eventId: string;
  context?: any;
}

export function DisclaimerModal({
  disclaimer,
  isOpen,
  onClose,
  onAcknowledge,
  eventId,
  context
}: DisclaimerModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const getSeverityIcon = () => {
    switch (disclaimer.severity) {
      case 'critical':
        return <ShieldAlert className="w-6 h-6 text-red-400" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-orange-400" />;
      case 'info':
        return <Info className="w-6 h-6 text-blue-400" />;
      default:
        return <Info className="w-6 h-6 text-muted-foreground" />;
    }
  };

  const getSeverityColor = () => {
    switch (disclaimer.severity) {
      case 'critical':
        return 'border-red-400/20 bg-red-400/5';
      case 'warning':
        return 'border-orange-400/20 bg-orange-400/5';
      case 'info':
        return 'border-blue-400/20 bg-blue-400/5';
      default:
        return 'border-border bg-background';
    }
  };

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    const scrolledToBottom = scrollTop + clientHeight >= scrollHeight - 10;
    setHasScrolledToBottom(scrolledToBottom);
  };

  const handleAcknowledge = () => {
    onAcknowledge();
    onClose();
    setAcknowledged(false);
    setHasScrolledToBottom(false);
  };

  const canProceed = !disclaimer.requiresAcknowledgment || 
    (acknowledged && (disclaimer.content.length < 500 || hasScrolledToBottom));

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open && !disclaimer.requiresAcknowledgment) {
        onClose();
      }
    }}>
      <DialogContent 
        className={`max-w-2xl ${getSeverityColor()}`}
        onEscapeKeyDown={(e) => {
          if (!disclaimer.requiresAcknowledgment) {
            onClose();
          } else if (disclaimer.severity !== 'critical') {
            onClose();
          } else {
            e.preventDefault();
          }
        }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            {getSeverityIcon()}
            <div className="flex-1">
              <DialogTitle className="text-lg font-semibold">
                {disclaimer.title}
              </DialogTitle>
              <DialogDescription>
                {disclaimer.type.replace('_', ' ').toUpperCase()} - 
                {disclaimer.requiresAcknowledgment ? ' Acknowledgment Required' : ' Information'}
              </DialogDescription>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">
                  {disclaimer.type.replace('_', ' ').toUpperCase()}
                </Badge>
                {disclaimer.requiresAcknowledgment && (
                  <Badge variant="outline" className="text-xs text-orange-400">
                    Acknowledgment Required
                  </Badge>
                )}
              </div>
            </div>
            {!disclaimer.requiresAcknowledgment && (
              <Button variant="ghost" size="sm" onClick={onClose}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* Disclaimer Content */}
          <ScrollArea 
            className="max-h-80 pr-4"
            onScrollCapture={handleScroll}
          >
            <div className="space-y-3">
              {disclaimer.content.split('\n\n').map((paragraph, index) => {
                // Handle bold formatting
                const formattedParagraph = paragraph
                  .split('**')
                  .map((part, i) => 
                    i % 2 === 1 ? <strong key={i} className="font-semibold">{part}</strong> : part
                  );

                // Handle bullet points
                if (paragraph.startsWith('•')) {
                  return (
                    <ul key={index} className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                      {paragraph.split('\n').map((line, lineIndex) => (
                        <li key={lineIndex} className="ml-2">
                          {line.replace('• ', '')}
                        </li>
                      ))}
                    </ul>
                  );
                }

                return (
                  <p key={index} className="text-sm text-foreground leading-relaxed">
                    {formattedParagraph}
                  </p>
                );
              })}
            </div>
          </ScrollArea>

          {/* Scroll indicator for long content */}
          {disclaimer.content.length > 500 && !hasScrolledToBottom && disclaimer.requiresAcknowledgment && (
            <div className="text-center">
              <Badge variant="outline" className="text-xs text-muted-foreground">
                Please scroll to read the complete disclaimer
              </Badge>
            </div>
          )}

          {/* Acknowledgment Checkbox */}
          {disclaimer.requiresAcknowledgment && (
            <div className="flex items-start space-x-3 p-4 bg-muted/20 rounded-lg border border-border">
              <Checkbox
                id={`ack-${disclaimer.id}`}
                checked={acknowledged}
                onCheckedChange={(checked) => setAcknowledged(checked === true)}
                disabled={disclaimer.content.length > 500 && !hasScrolledToBottom}
              />
              <label 
                htmlFor={`ack-${disclaimer.id}`} 
                className="text-sm leading-relaxed cursor-pointer"
              >
                I have read and understand this disclaimer. I acknowledge that:
                <ul className="list-disc list-inside mt-2 space-y-1 text-xs text-muted-foreground">
                  <li>This information is for educational purposes only</li>
                  <li>No financial advice is being provided</li>
                  <li>I am responsible for my own investment decisions</li>
                  <li>Trading involves substantial risk of loss</li>
                </ul>
              </label>
            </div>
          )}

          {/* Context Information (for debugging/audit) */}
          {context && process.env.NODE_ENV === 'development' && (
            <details className="text-xs text-muted-foreground">
              <summary className="cursor-pointer">Debug Info</summary>
              <pre className="mt-2 p-2 bg-muted/20 rounded text-xs overflow-auto">
                {JSON.stringify({ eventId, context, disclaimerId: disclaimer.id }, null, 2)}
              </pre>
            </details>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-xs text-muted-foreground">
              Session: {eventId.split('_')[1]}
            </div>
            
            <div className="flex gap-2">
              {!disclaimer.requiresAcknowledgment && (
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
              )}
              
              {disclaimer.requiresAcknowledgment && (
                <>
                  <Button 
                    variant="outline"
                    onClick={onClose}
                    disabled={disclaimer.severity === 'critical'}
                  >
                    {disclaimer.severity === 'critical' ? 'Must Acknowledge' : 'Cancel'}
                  </Button>
                  <Button 
                    onClick={handleAcknowledge}
                    disabled={!canProceed}
                    className="min-w-24"
                  >
                    {acknowledged ? 'I Understand' : 'Acknowledge'}
                  </Button>
                </>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}