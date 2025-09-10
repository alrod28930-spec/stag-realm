import { useState, useEffect, useCallback } from 'react';
import { toggleService } from '@/services/toggleService';
import type { ToggleState } from '@/services/toggleService';

/**
 * Custom hook for managing toggle service integration
 * Provides synchronized state and error handling
 */
export function useToggleService() {
  const [toggleState, setToggleState] = useState<ToggleState>(toggleService.getToggleState());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to toggle service changes
    const unsubscribe = toggleService.subscribe((newState) => {
      setToggleState(newState);
      setError(null); // Clear errors on successful updates
    });

    return unsubscribe;
  }, []);

  const updateToggle = useCallback(async (
    toggleKey: keyof ToggleState, 
    value: boolean, 
    reason?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // Validate toggle change
      const currentValue = toggleState[toggleKey];
      if (currentValue === value) {
        setIsLoading(false);
        return; // No change needed
      }

      // Update through service
      toggleService.setRiskToggle(toggleKey, value, reason);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Toggle update failed';
      setError(errorMessage);
      console.error('Toggle update error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [toggleState]);

  const updateBotStatus = useCallback(async (
    botId: string, 
    status: 'off' | 'simulation' | 'live', 
    reason?: string
  ) => {
    try {
      setIsLoading(true);
      setError(null);
      
      toggleService.setBotStatus(botId, status, reason);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Bot status update failed';
      setError(errorMessage);
      console.error('Bot status update error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetToSafeDefaults = useCallback(async (reason?: string) => {
    try {
      setIsLoading(true);
      setError(null);
      
      toggleService.resetToSafeDefaults(reason);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Reset to defaults failed';
      setError(errorMessage);
      console.error('Reset to defaults error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    toggleState,
    isLoading,
    error,
    updateToggle,
    updateBotStatus,
    resetToSafeDefaults,
    clearError: () => setError(null),
    getRiskStatus: () => toggleService.getRiskStatus(),
    isInSafeMode: () => toggleService.isInSafeMode()
  };
}