import React, { useState } from 'react';
import { VoiceAnalyst } from './VoiceAnalyst';
import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';

export function GlobalVoiceInterface() {
  const [isVisible, setIsVisible] = useState(false);

  if (!isVisible) {
    return null; // Quick access now handled by TopBar
  }

  return (
    <VoiceAnalyst 
      isMinimized={false}
      onToggleMinimize={() => setIsVisible(false)}
    />
  );
}