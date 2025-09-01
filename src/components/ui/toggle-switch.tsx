import React from 'react';
import { cn } from '@/lib/utils';

export interface ToggleSwitchProps {
  value: 'off' | 'simulation' | 'live';
  onChange: (value: 'off' | 'simulation' | 'live') => void;
  disabled?: boolean;
  size?: 'sm' | 'md' | 'lg';
  showLabels?: boolean;
  className?: string;
}

export function ToggleSwitch({ 
  value, 
  onChange, 
  disabled = false, 
  size = 'md',
  showLabels = false,
  className 
}: ToggleSwitchProps) {
  const sizeClasses = {
    sm: 'h-6 w-16',
    md: 'h-8 w-20', 
    lg: 'h-10 w-24'
  };

  const getPositionClass = () => {
    switch (value) {
      case 'off': return 'translate-x-0';
      case 'simulation': return 'translate-x-1/2';
      case 'live': return 'translate-x-full';
      default: return 'translate-x-0';
    }
  };

  const getBackgroundColor = () => {
    switch (value) {
      case 'off': return 'bg-muted';
      case 'simulation': return 'bg-yellow-500/20 border-yellow-500/30';
      case 'live': return 'bg-gradient-primary';
      default: return 'bg-muted';
    }
  };

  const handleClick = () => {
    if (disabled) return;
    
    const nextValue = value === 'off' ? 'simulation' : 
                     value === 'simulation' ? 'live' : 'off';
    onChange(nextValue);
  };

  return (
    <div className={cn("flex flex-col items-center space-y-1", className)}>
      <button
        onClick={handleClick}
        disabled={disabled}
        className={cn(
          "relative inline-flex rounded-full border transition-all duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
          sizeClasses[size],
          getBackgroundColor(),
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <span
          className={cn(
            "inline-block h-full w-1/3 transform rounded-full bg-background shadow-sm ring-1 ring-border transition duration-200 ease-in-out",
            getPositionClass()
          )}
        />
      </button>
      
      {showLabels && (
        <div className="flex justify-between w-full text-xs text-muted-foreground">
          <span className={value === 'off' ? 'text-foreground font-medium' : ''}>Off</span>
          <span className={value === 'simulation' ? 'text-foreground font-medium' : ''}>Sim</span>
          <span className={value === 'live' ? 'text-foreground font-medium' : ''}>Live</span>
        </div>
      )}
    </div>
  );
}