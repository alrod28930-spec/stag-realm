import React, { useState } from 'react';
import { VoiceAnalyst } from './VoiceAnalyst';
import { Button } from '@/components/ui/button';
import { MessageCircle, Minimize2, Maximize2 } from 'lucide-react';

export function GlobalVoiceInterface() {
  const [isVisible, setIsVisible] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
    if (!isVisible) {
      setIsMinimized(false);
    }
  };

  const toggleMinimize = () => {
    setIsMinimized(!isMinimized);
  };

  if (!isVisible) {
    return (
      <Button
        onClick={toggleVisibility}
        className="fixed bottom-4 right-4 z-50 rounded-full w-12 h-12 shadow-lg bg-primary hover:bg-primary/90"
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <VoiceAnalyst 
      isMinimized={isMinimized}
      onToggleMinimize={toggleMinimize}
    />
  );
}