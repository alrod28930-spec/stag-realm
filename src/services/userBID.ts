// User-Specific BID (Business Intelligence Database)
// Each user gets their own personalized BID containing all their profile data

import { supabase } from '@/integrations/supabase/client';
import { eventBus } from './eventBus';
import { logService } from './logging';
import { bid } from './bid';
import { bidCore } from './bidCore';
import { useAuthStore } from '@/stores/authStore';

// Comprehensive user profile data structure
export interface UserBIDProfile {
  userId: string;
  workspaceId: string | null;
  demoMode: boolean;
  
  // Personal Info
  personalInfo: {
    displayName?: string;
    timezone?: string;
    riskProfile: 'conservative' | 'moderate' | 'aggressive';
    investmentHorizon: 'short' | 'medium' | 'long';
    experienceLevel: 'beginner' | 'intermediate' | 'advanced';
  };
  
  // Portfolio Data
  portfolio: {
    totalEquity: number;
    availableCash: number;
    positions: Array<{
      symbol: string;
      quantity: number;
      averagePrice: number;
      currentPrice: number;
      marketValue: number;
      unrealizedPnL: number;
      allocation: number;
    }>;
    performance: {
      totalReturn: number;
      totalReturnPercent: number;
      dayChange: number;
      dayChangePercent: number;
    };
  };
  
  // Risk Metrics
  riskMetrics: {
    portfolioVolatility: number;
    maxDrawdown: number;
    sharpeRatio: number;
    betaToMarket: number;
    concentrationRisk: number;
    liquidity: number;
  };
  
  // Trading Patterns & Preferences
  tradingProfile: {
    preferredAssets: string[];
    tradingStyle: 'passive' | 'active' | 'algorithmic';
    riskTolerance: number; // 0-10 scale
    preferredTimeframes: string[];
    averageTradeSize: number;
    tradingFrequency: 'daily' | 'weekly' | 'monthly';
  };
  
  // Bot & Strategy Settings
  botProfiles: Array<{
    name: string;
    active: boolean;
    riskPerTrade: number;
    maxConcurrentPositions: number;
    strategy: string;
    performance: {
      winRate: number;
      avgReturn: number;
      totalTrades: number;
    };
  }>;
  
  // Market Intelligence
  marketIntelligence: {
    followedSymbols: string[];
    sectors: string[];
    alerts: Array<{
      type: string;
      symbol?: string;
      condition: string;
      active: boolean;
    }>;
    oracleSignals: Array<{
      id: string;
      type: string;
      symbol: string;
      strength: number;
      timestamp: Date;
    }>;
  };
  
  // Learning & Education Progress
  learningProfile: {
    completedLessons: string[];
    skillLevel: Record<string, number>; // skill -> proficiency (0-100)
    preferredLearningStyle: 'visual' | 'reading' | 'hands-on';
    goals: string[];
    achievements: Array<{
      name: string;
      dateEarned: Date;
      description: string;
    }>;
  };
  
  // Usage Analytics
  usageMetrics: {
    loginFrequency: number;
    mostUsedFeatures: string[];
    timeSpentDaily: number;
    lastActiveDate: Date;
    featureUsage: Record<string, number>;
  };
  
  // Compliance & Regulatory
  compliance: {
    acknowledgments: Array<{
      documentType: string;
      version: string;
      acknowledgedAt: Date;
    }>;
    riskTolerance: string;
    investmentObjectives: string[];
    accreditedInvestor: boolean;
  };
  
  // Demo Data (when in demo mode)
  demoData?: {
    scenario: 'conservative_investor' | 'day_trader' | 'long_term_growth' | 'crypto_enthusiast';
    mockPortfolioValue: number;
    simulatedTrades: Array<{
      symbol: string;
      type: 'buy' | 'sell';
      quantity: number;
      price: number;
      timestamp: Date;
    }>;
  };
  
  lastUpdated: Date;
}

class UserBIDService {
  private currentProfile: UserBIDProfile | null = null;
  private isInitialized = false;

  constructor() {
    this.initializeEventListeners();
  }

  private initializeEventListeners() {
    // Listen for auth changes
    eventBus.on('auth.user_changed', async (user) => {
      if (user) {
        await this.loadUserProfile(user.id);
      } else {
        this.currentProfile = null;
        this.isInitialized = false;
      }
    });

    // Listen for portfolio updates
    eventBus.on('bid.portfolio_updated', (portfolioData) => {
      this.updatePortfolioData(portfolioData);
    });

    // Listen for risk metrics updates
    eventBus.on('bid.risk_metrics_updated', (riskData) => {
      this.updateRiskMetrics(riskData);
    });

    // Listen for bot profile changes
    eventBus.on('bot.profile_updated', (botData) => {
      this.updateBotProfile(botData);
    });
  }

  // Initialize user profile (called when user logs in or app starts)
  async initializeUserProfile(userId: string, workspaceId?: string): Promise<UserBIDProfile> {
    try {
      logService.log('info', 'Initializing user BID profile', { userId, workspaceId });

      // Check if user has existing profile
      const { data: existingProfile } = await supabase
        .from('user_bid_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId || null)
        .maybeSingle();

      if (existingProfile?.profile_data) {
        // Load existing profile
        this.currentProfile = existingProfile.profile_data as UserBIDProfile;
      } else {
        // Create new profile
        this.currentProfile = await this.createNewUserProfile(userId, workspaceId);
        await this.saveUserProfile();
      }

      // Load additional data from various sources
      await this.enrichProfileWithSystemData();
      
      this.isInitialized = true;
      eventBus.emit('userBID.profile_loaded', this.currentProfile);
      
      return this.currentProfile;
    } catch (error) {
      logService.log('error', 'Failed to initialize user BID profile', { error, userId });
      throw error;
    }
  }

  // Create a new user profile with default values
  private async createNewUserProfile(userId: string, workspaceId?: string): Promise<UserBIDProfile> {
    // Check if this is a demo user
    const { data: userProfile } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .maybeSingle();

    const isDemoMode = userProfile?.display_name === 'Demo User';

    const profile: UserBIDProfile = {
      userId,
      workspaceId: workspaceId || null,
      demoMode: isDemoMode,
      
      personalInfo: {
        displayName: userProfile?.display_name || 'User',
        timezone: 'America/New_York',
        riskProfile: 'moderate',
        investmentHorizon: 'medium',
        experienceLevel: 'intermediate'
      },
      
      portfolio: {
        totalEquity: isDemoMode ? 100000 : 0,
        availableCash: isDemoMode ? 20000 : 0,
        positions: isDemoMode ? this.generateDemoPositions() : [],
        performance: {
          totalReturn: 0,
          totalReturnPercent: 0,
          dayChange: 0,
          dayChangePercent: 0
        }
      },
      
      riskMetrics: {
        portfolioVolatility: 0.15,
        maxDrawdown: 0.05,
        sharpeRatio: 1.2,
        betaToMarket: 1.0,
        concentrationRisk: 0.3,
        liquidity: 0.8
      },
      
      tradingProfile: {
        preferredAssets: isDemoMode ? ['AAPL', 'GOOGL', 'MSFT', 'TSLA'] : [],
        tradingStyle: 'active',
        riskTolerance: 5,
        preferredTimeframes: ['1D', '1W'],
        averageTradeSize: isDemoMode ? 5000 : 1000,
        tradingFrequency: 'weekly'
      },
      
      botProfiles: [],
      
      marketIntelligence: {
        followedSymbols: isDemoMode ? ['AAPL', 'GOOGL', 'MSFT', 'TSLA', 'NVDA'] : [],
        sectors: ['Technology', 'Healthcare'],
        alerts: [],
        oracleSignals: []
      },
      
      learningProfile: {
        completedLessons: [],
        skillLevel: {
          'portfolio_management': 60,
          'risk_analysis': 45,
          'technical_analysis': 30,
          'fundamental_analysis': 50
        },
        preferredLearningStyle: 'visual',
        goals: ['Improve risk management', 'Learn technical analysis'],
        achievements: []
      },
      
      usageMetrics: {
        loginFrequency: 0,
        mostUsedFeatures: [],
        timeSpentDaily: 0,
        lastActiveDate: new Date(),
        featureUsage: {}
      },
      
      compliance: {
        acknowledgments: [],
        riskTolerance: 'moderate',
        investmentObjectives: ['capital_growth'],
        accreditedInvestor: false
      },
      
      lastUpdated: new Date()
    };

    // Add demo data if in demo mode
    if (isDemoMode) {
      profile.demoData = this.generateDemoData();
    }

    return profile;
  }

  // Generate demo positions for demo users
  private generateDemoPositions() {
    return [
      {
        symbol: 'AAPL',
        quantity: 50,
        averagePrice: 180.00,
        currentPrice: 185.50,
        marketValue: 9275,
        unrealizedPnL: 275,
        allocation: 12.5
      },
      {
        symbol: 'GOOGL',
        quantity: 15,
        averagePrice: 140.00,
        currentPrice: 145.20,
        marketValue: 2178,
        unrealizedPnL: 78,
        allocation: 8.3
      },
      {
        symbol: 'MSFT',
        quantity: 30,
        averagePrice: 410.00,
        currentPrice: 425.75,
        marketValue: 12772.50,
        unrealizedPnL: 472.50,
        allocation: 15.2
      },
      {
        symbol: 'TSLA',
        quantity: 25,
        averagePrice: 250.00,
        currentPrice: 245.80,
        marketValue: 6145,
        unrealizedPnL: -105,
        allocation: 8.1
      }
    ];
  }

  // Generate demo data for demo users
  private generateDemoData() {
    return {
      scenario: 'long_term_growth' as const,
      mockPortfolioValue: 100000,
      simulatedTrades: [
        {
          symbol: 'AAPL',
          type: 'buy' as const,
          quantity: 50,
          price: 180.00,
          timestamp: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // 30 days ago
        },
        {
          symbol: 'GOOGL',
          type: 'buy' as const,
          quantity: 15,
          price: 140.00,
          timestamp: new Date(Date.now() - 25 * 24 * 60 * 60 * 1000) // 25 days ago
        }
      ]
    };
  }

  // Enrich profile with data from other system components
  private async enrichProfileWithSystemData() {
    if (!this.currentProfile) return;

    try {
      // Get portfolio data from BID service
      const portfolioData = bid.getPortfolio();
      if (portfolioData) {
        this.updatePortfolioData(portfolioData);
      }

      // Get risk metrics from BID service
      const riskMetrics = bid.getRiskMetrics();
      if (riskMetrics) {
        this.updateRiskMetrics(riskMetrics);
      }

      // Get oracle signals
      const oracleSignals = bid.getOracleSignals(10);
      this.currentProfile.marketIntelligence.oracleSignals = oracleSignals.map(signal => ({
        id: signal.id,
        type: signal.type,
        symbol: signal.symbol || 'MARKET',
        strength: signal.confidence,
        timestamp: new Date(signal.timestamp)
      }));

      // Load bot profiles from database
      await this.loadBotProfiles();

      // Load compliance data
      await this.loadComplianceData();

      // Update usage metrics
      this.updateUsageMetrics();

    } catch (error) {
      logService.log('error', 'Failed to enrich user profile with system data', { error });
    }
  }

  // Load bot profiles from database
  private async loadBotProfiles() {
    if (!this.currentProfile) return;

    try {
      const { data: botProfiles } = await supabase
        .from('bot_profiles')
        .select('*')
        .eq('workspace_id', this.currentProfile.workspaceId);

      if (botProfiles) {
        this.currentProfile.botProfiles = botProfiles.map(bot => ({
          name: bot.name || 'Trading Bot',
          active: bot.active,
          riskPerTrade: bot.risk_per_trade_pct,
          maxConcurrentPositions: bot.max_concurrent_positions,
          strategy: bot.mode,
          performance: {
            winRate: 0.65, // Mock data - would be calculated from trade history
            avgReturn: 0.08,
            totalTrades: 150
          }
        }));
      }
    } catch (error) {
      logService.log('error', 'Failed to load bot profiles', { error });
    }
  }

  // Load compliance data
  private async loadComplianceData() {
    if (!this.currentProfile) return;

    try {
      const { data: acknowledgments } = await supabase
        .from('compliance_acknowledgments')
        .select('*')
        .eq('user_id', this.currentProfile.userId);

      if (acknowledgments) {
        this.currentProfile.compliance.acknowledgments = acknowledgments.map(ack => ({
          documentType: ack.document_type,
          version: ack.version,
          acknowledgedAt: new Date(ack.acknowledged_at)
        }));
      }
    } catch (error) {
      logService.log('error', 'Failed to load compliance data', { error });
    }
  }

  // Update portfolio data from BID service
  private updatePortfolioData(portfolioData: any) {
    if (!this.currentProfile) return;

    this.currentProfile.portfolio = {
      totalEquity: portfolioData.totalEquity || 0,
      availableCash: portfolioData.availableCash || 0,
      positions: portfolioData.positions?.map((pos: any) => ({
        symbol: pos.symbol,
        quantity: pos.quantity,
        averagePrice: pos.averagePrice,
        currentPrice: pos.currentPrice,
        marketValue: pos.marketValue,
        unrealizedPnL: pos.unrealizedPnL,
        allocation: pos.allocation
      })) || [],
      performance: {
        totalReturn: portfolioData.totalUnrealizedPnL || 0,
        totalReturnPercent: portfolioData.totalUnrealizedPnLPercent || 0,
        dayChange: portfolioData.dayChange || 0,
        dayChangePercent: portfolioData.dayChangePercent || 0
      }
    };

    this.currentProfile.lastUpdated = new Date();
  }

  // Update risk metrics from BID service
  private updateRiskMetrics(riskData: any) {
    if (!this.currentProfile) return;

    this.currentProfile.riskMetrics = {
      portfolioVolatility: riskData.volatility || 0,
      maxDrawdown: Math.abs(riskData.maxDrawdown || 0),
      sharpeRatio: riskData.sharpeRatio || 0,
      betaToMarket: riskData.betaToMarket || 1.0,
      concentrationRisk: riskData.concentrationRisk || 0,
      liquidity: 1.0 - (riskData.concentrationRisk || 0) // Inverse relationship
    };

    this.currentProfile.lastUpdated = new Date();
  }

  // Update bot profile data
  private updateBotProfile(botData: any) {
    if (!this.currentProfile) return;

    const existingBotIndex = this.currentProfile.botProfiles.findIndex(bot => bot.name === botData.name);
    if (existingBotIndex >= 0) {
      this.currentProfile.botProfiles[existingBotIndex] = {
        ...this.currentProfile.botProfiles[existingBotIndex],
        ...botData
      };
    } else {
      this.currentProfile.botProfiles.push(botData);
    }

    this.currentProfile.lastUpdated = new Date();
  }

  // Update usage metrics
  private updateUsageMetrics() {
    if (!this.currentProfile) return;

    // Track login
    this.currentProfile.usageMetrics.loginFrequency += 1;
    this.currentProfile.usageMetrics.lastActiveDate = new Date();

    // Update feature usage (would be tracked throughout the app)
    const currentFeature = window.location.pathname.replace('/', '') || 'dashboard';
    this.currentProfile.usageMetrics.featureUsage[currentFeature] = 
      (this.currentProfile.usageMetrics.featureUsage[currentFeature] || 0) + 1;

    // Update most used features
    const sortedFeatures = Object.entries(this.currentProfile.usageMetrics.featureUsage)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .map(([feature]) => feature);
    
    this.currentProfile.usageMetrics.mostUsedFeatures = sortedFeatures;
  }

  // Save profile to database
  async saveUserProfile(): Promise<void> {
    if (!this.currentProfile) return;

    try {
      const { error } = await supabase
        .from('user_bid_profiles')
        .upsert({
          user_id: this.currentProfile.userId,
          workspace_id: this.currentProfile.workspaceId,
          profile_data: this.currentProfile as any, // Cast to any for JSON storage
          demo_mode: this.currentProfile.demoMode,
          last_updated: new Date().toISOString()
        });

      if (error) throw error;

      logService.log('info', 'User BID profile saved successfully');
      eventBus.emit('userBID.profile_saved', this.currentProfile);
    } catch (error) {
      logService.log('error', 'Failed to save user BID profile', { error });
      throw error;
    }
  }

  // Load user profile from database
  async loadUserProfile(userId: string, workspaceId?: string): Promise<UserBIDProfile | null> {
    try {
      const { data } = await supabase
        .from('user_bid_profiles')
        .select('*')
        .eq('user_id', userId)
        .eq('workspace_id', workspaceId || null)
        .maybeSingle();

      if (data?.profile_data) {
        this.currentProfile = {
          ...(data.profile_data as any), // Cast from JSON
          userId,
          workspaceId: workspaceId || null,
          demoMode: data.demo_mode
        };
        
        await this.enrichProfileWithSystemData();
        this.isInitialized = true;
        
        eventBus.emit('userBID.profile_loaded', this.currentProfile);
        return this.currentProfile;
      }

      return null;
    } catch (error) {
      logService.log('error', 'Failed to load user BID profile', { error });
      return null;
    }
  }

  // Public getters
  getCurrentProfile(): UserBIDProfile | null {
    return this.currentProfile;
  }

  isProfileInitialized(): boolean {
    return this.isInitialized;
  }

  // Get comprehensive user data for analyst
  getAnalystContext(): any {
    if (!this.currentProfile) return null;

    return {
      userProfile: this.currentProfile,
      portfolioSummary: {
        totalValue: this.currentProfile.portfolio.totalEquity,
        positionCount: this.currentProfile.portfolio.positions.length,
        topHoldings: this.currentProfile.portfolio.positions
          .sort((a, b) => b.allocation - a.allocation)
          .slice(0, 5),
        performance: this.currentProfile.portfolio.performance
      },
      riskProfile: {
        riskTolerance: this.currentProfile.tradingProfile.riskTolerance,
        riskMetrics: this.currentProfile.riskMetrics,
        experienceLevel: this.currentProfile.personalInfo.experienceLevel
      },
      tradingStyle: {
        preferredAssets: this.currentProfile.tradingProfile.preferredAssets,
        tradingFrequency: this.currentProfile.tradingProfile.tradingFrequency,
        averageTradeSize: this.currentProfile.tradingProfile.averageTradeSize
      },
      marketIntelligence: this.currentProfile.marketIntelligence,
      botConfiguration: this.currentProfile.botProfiles,
      learningProgress: this.currentProfile.learningProfile,
      usagePatterns: this.currentProfile.usageMetrics,
      isDemoMode: this.currentProfile.demoMode,
      demoScenario: this.currentProfile.demoData?.scenario
    };
  }

  // Track feature usage
  trackFeatureUsage(feature: string) {
    if (!this.currentProfile) return;

    this.currentProfile.usageMetrics.featureUsage[feature] = 
      (this.currentProfile.usageMetrics.featureUsage[feature] || 0) + 1;
    
    this.updateUsageMetrics();
  }

  // Update learning progress
  updateLearningProgress(skill: string, progress: number) {
    if (!this.currentProfile) return;

    this.currentProfile.learningProfile.skillLevel[skill] = Math.max(
      0,
      Math.min(100, progress)
    );
    this.currentProfile.lastUpdated = new Date();
  }

  // Add achievement
  addAchievement(name: string, description: string) {
    if (!this.currentProfile) return;

    this.currentProfile.learningProfile.achievements.push({
      name,
      description,
      dateEarned: new Date()
    });
    this.currentProfile.lastUpdated = new Date();
  }
}

// Export singleton instance
export const userBID = new UserBIDService();