/**
 * Hook that ensures demo portfolio data is loaded for demo users
 * This provides a consistent way to access portfolio data regardless of user type
 */
import { useEffect } from 'react';
import { useRealPortfolioStore } from '@/stores/realPortfolioStore';
import { useDemoAware } from './useDemoAware';

export function useDemoPortfolio() {
  const { isDemoUser } = useDemoAware();
  const { portfolio, positions, isLoading, error, loadPortfolio } = useRealPortfolioStore();

  // Auto-load portfolio on mount (works for both demo and real users)
  useEffect(() => {
    if (isDemoUser) {
      console.log('🎭 Demo user detected - loading demo portfolio');
    }
    loadPortfolio();
  }, [isDemoUser, loadPortfolio]);

  return {
    portfolio,
    positions,
    isLoading,
    error,
    isDemoUser,
    refreshPortfolio: loadPortfolio
  };
}
