import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { Brain, Mic, Volume2, Zap, MessageCircle } from 'lucide-react';
import { VoiceAnalyst } from './VoiceAnalyst';

// Quick personality shortcuts for top bar
const QUICK_PERSONALITIES = {
  mentor_female: { name: 'Sofia', icon: '🧙‍♀️', color: 'bg-blue-400' },
  analyst_female: { name: 'Victoria', icon: '🔬', color: 'bg-purple-400' },
  coach_female: { name: 'Emma', icon: '💃', color: 'bg-green-400' },
  mentor_male: { name: 'Marcus', icon: '🧙‍♂️', color: 'bg-blue-500' },
  analyst_male: { name: 'David', icon: '🔍', color: 'bg-purple-500' },
  coach_male: { name: 'Jake', icon: '💪', color: 'bg-green-500' },
} as const;

interface QuickAnalystButtonProps {
  onAnalystOpen?: () => void;
}

export function QuickAnalystButton({ onAnalystOpen }: QuickAnalystButtonProps) {
  const [showAnalyst, setShowAnalyst] = useState(false);
  const [selectedPersonality, setSelectedPersonality] = useState<keyof typeof QUICK_PERSONALITIES>('mentor_female');
  const [isActive, setIsActive] = useState(false);

  const handleQuickAccess = (personalityKey: keyof typeof QUICK_PERSONALITIES) => {
    setSelectedPersonality(personalityKey);
    setShowAnalyst(true);
    setIsActive(true);
    onAnalystOpen?.();
  };

  const handleCloseAnalyst = () => {
    setShowAnalyst(false);
    setIsActive(false);
  };

  const currentPersonality = QUICK_PERSONALITIES[selectedPersonality];

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button 
            variant="ghost" 
            size="sm" 
            className={`relative h-8 px-2 ${isActive ? 'bg-primary/10 text-primary' : 'hover:bg-muted'}`}
          >
            <Brain className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline font-medium">Analyst</span>
            {isActive && (
              <Badge className="absolute -top-1 -right-1 h-2 w-2 p-0 bg-green-500 animate-pulse" />
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Quick Voice Access
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          
          <div className="p-2 text-xs text-muted-foreground">
            Click to start instant voice conversation:
          </div>
          
          {/* Female Analysts */}
          <div className="px-2 py-1">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Female Voices</div>
            {Object.entries(QUICK_PERSONALITIES)
              .filter(([key]) => key.includes('female'))
              .map(([key, personality]) => (
                <DropdownMenuItem 
                  key={key}
                  onClick={() => handleQuickAccess(key as keyof typeof QUICK_PERSONALITIES)}
                  className="cursor-pointer py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{personality.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{personality.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {key.includes('mentor') && 'Wise guidance'}
                        {key.includes('analyst') && 'Deep analysis'}
                        {key.includes('coach') && 'Motivation & goals'}
                      </div>
                    </div>
                    <Mic className="h-3 w-3 opacity-60" />
                  </div>
                </DropdownMenuItem>
              ))}
          </div>
          
          <DropdownMenuSeparator />
          
          {/* Male Analysts */}
          <div className="px-2 py-1">
            <div className="text-xs font-semibold text-muted-foreground mb-1">Male Voices</div>
            {Object.entries(QUICK_PERSONALITIES)
              .filter(([key]) => key.includes('male'))
              .map(([key, personality]) => (
                <DropdownMenuItem 
                  key={key}
                  onClick={() => handleQuickAccess(key as keyof typeof QUICK_PERSONALITIES)}
                  className="cursor-pointer py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{personality.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-sm">{personality.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {key.includes('mentor') && 'Strategic wisdom'}
                        {key.includes('analyst') && 'Sharp insights'}
                        {key.includes('coach') && 'Performance focus'}
                      </div>
                    </div>
                    <Mic className="h-3 w-3 opacity-60" />
                  </div>
                </DropdownMenuItem>
              ))}
          </div>
          
          <DropdownMenuSeparator />
          
          <DropdownMenuItem 
            onClick={() => setShowAnalyst(true)}
            className="cursor-pointer"
          >
            <MessageCircle className="h-4 w-4 mr-2" />
            <span>Full Voice Interface</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      {/* Show analyst if activated */}
      {showAnalyst && (
        <div className="fixed inset-0 z-50 pointer-events-none">
          <VoiceAnalyst 
            isMinimized={false}
            onToggleMinimize={handleCloseAnalyst}
            defaultPersonality={selectedPersonality}
          />
        </div>
      )}
    </>
  );
}