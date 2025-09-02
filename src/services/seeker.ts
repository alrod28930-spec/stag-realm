// The Seeker - Hidden Intelligence Collector
// Invisible background agent that finds overlooked intelligence

import { eventBus } from './eventBus';
import { recorder } from './recorder';
import { repository } from './repository';
import { bid } from './bid';
import { oracle } from './oracle';
import { tradeBotSystem } from './tradeBots';
import { logService } from './logging';
import { generateULID } from '@/utils/ulid';

interface SeekerFinding {
  id: string;
  type: 'niche_ticker' | 'unusual_options' | 'pattern_anomaly' | 'hypothesis_discrepancy' | 'signal_correlation';
  priority: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  symbol?: string;
  data: any;
  confidence: number;
  reasoning: string[];
  timestamp: Date;
  processed: boolean;
}

interface SeekerMetrics {
  totalFindings: number;
  processedFindings: number;
  highPriorityFindings: number;
  lastScanTime: Date;
  averageConfidence: number;
  successfulIntegrations: number;
}

class SeekerService {
  private findings: Map<string, SeekerFinding> = new Map();
  private isActive = true;
  private scanInterval?: NodeJS.Timeout;
  private lastFullScan = new Date();
  private scanCycles = 0;
  private readonly SCAN_INTERVAL_MS = 45000; // 45 seconds - staggered from other systems
  private readonly MAX_FINDINGS_STORED = 500;

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    logService.log('info', 'The Seeker: Initializing intelligence collector');

    // Listen for trade outcomes to investigate discrepancies
    eventBus.on('trade.executed', (trade: any) => {
      this.investigateTradeOutcome(trade).catch(error => {
        logService.log('error', 'Seeker trade outcome investigation failed', { error });
      });
    });

    // Listen for Oracle signals to detect patterns
    eventBus.on('oracle.signal_added', (signal: any) => {
      this.analyzeOraclePattern(signal).catch(error => {
        logService.log('error', 'Seeker Oracle pattern analysis failed', { error });
      });
    });

    // Listen for market data updates
    eventBus.on('repository.data_cleaned', (data: any[]) => {
      this.scanForAnomalies(data).catch(error => {
        logService.log('error', 'Seeker anomaly scanning failed', { error });
      });
    });

    // Start continuous background scanning
    this.startContinuousScanning();

    logService.log('info', 'The Seeker: Ready - operating in stealth mode');
  }

  private startContinuousScanning(): void {
    this.scanInterval = setInterval(() => {
      this.performBackgroundScan().catch(error => {
        logService.log('error', 'Seeker background scan failed', { error });
      });
    }, this.SCAN_INTERVAL_MS);
  }

  private async performBackgroundScan(): Promise<void> {
    if (!this.isActive) return;

    this.scanCycles++;
    const scanStart = Date.now();

    try {
      // Rotate through different scan types to avoid overload
      const scanType = this.scanCycles % 4;
      
      switch (scanType) {
        case 0:
          await this.scanNicheTickers();
          break;
        case 1:
          await this.scanUnusualOptionsActivity();
          break;
        case 2:
          await this.scanSecondaryPatterns();
          break;
        case 3:
          await this.scanHypothesisDiscrepancies();
          break;
      }

      // Process accumulated findings
      await this.processFindings();

      // Cleanup old findings
      this.cleanupOldFindings();

      this.lastFullScan = new Date();
      
    } catch (error) {
      logService.log('error', 'Seeker background scan error', { 
        error,
        scanType: this.scanCycles % 4,
        scanCycles: this.scanCycles
      });
    }

    const scanDuration = Date.now() - scanStart;
    logService.log('debug', `Seeker scan cycle ${this.scanCycles} completed in ${scanDuration}ms`);
  }

  private async scanNicheTickers(): Promise<void> {
    // Search for underused tickers with unusual activity
    try {
      // Get current watchlist and active symbols
      const activeSymbols = new Set([
        ...tradeBotSystem.getBots().flatMap(bot => ['AAPL', 'MSFT']), // Mock active symbols
        ...oracle.getSignals(20).map(s => s.symbol).filter(Boolean)
      ]);

      // Simulate discovery of niche tickers with activity
      const nicheTickers = ['NVDA', 'AMD', 'TSM', 'ASML', 'MU'];
      
      for (const ticker of nicheTickers) {
        if (!activeSymbols.has(ticker)) {
          const volumeAnomaly = Math.random();
          const priceMovement = Math.random();
          
          if (volumeAnomaly > 0.7 && priceMovement > 0.6) {
            const finding: SeekerFinding = {
            id: generateULID('evt_'),
              type: 'niche_ticker',
              priority: volumeAnomaly > 0.9 ? 'high' : 'medium',
              source: 'market_scanner',
              symbol: ticker,
              data: {
                volumeAnomaly,
                priceMovement,
                avgDailyVolume: Math.floor(Math.random() * 1000000),
                currentVolume: Math.floor(Math.random() * 2000000),
                priceChange: (Math.random() - 0.5) * 10
              },
              confidence: Math.min(volumeAnomaly + priceMovement, 1.0) / 2,
              reasoning: [
                `Unusual volume activity: ${(volumeAnomaly * 100).toFixed(1)}%`,
                `Significant price movement: ${(priceMovement * 100).toFixed(1)}%`,
                'Ticker not in current watchlist - potential opportunity'
              ],
              timestamp: new Date(),
              processed: false
            };

            await this.recordFinding(finding);
          }
        }
      }
    } catch (error) {
      logService.log('error', 'Seeker niche ticker scan failed', { error });
    }
  }

  private async scanUnusualOptionsActivity(): Promise<void> {
    // Look for unusual options flow that might indicate insider knowledge
    try {
      const symbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'];
      
      for (const symbol of symbols) {
        // Simulate options activity analysis
        const callVolume = Math.random() * 1000;
        const putVolume = Math.random() * 1000;
        const putCallRatio = putVolume / (callVolume + putVolume);
        const unusualActivity = Math.random();
        
        if (unusualActivity > 0.8) {
          const finding: SeekerFinding = {
            id: generateULID('evt_'),
            type: 'unusual_options',
            priority: unusualActivity > 0.95 ? 'critical' : 'high',
            source: 'options_flow_scanner',
            symbol,
            data: {
              callVolume,
              putVolume,
              putCallRatio,
              unusualActivityScore: unusualActivity,
              timeframe: '1h',
              avgOptionsVolume: Math.random() * 500
            },
            confidence: unusualActivity,
            reasoning: [
              `Unusual options activity detected: ${(unusualActivity * 100).toFixed(1)}%`,
              `Put/Call ratio: ${putCallRatio.toFixed(2)}`,
              `Call volume: ${callVolume.toFixed(0)}, Put volume: ${putVolume.toFixed(0)}`
            ],
            timestamp: new Date(),
            processed: false
          };

          await this.recordFinding(finding);
        }
      }
    } catch (error) {
      logService.log('error', 'Seeker options activity scan failed', { error });
    }
  }

  private async scanSecondaryPatterns(): Promise<void> {
    // Look for secondary patterns in Oracle signals and news
    try {
      const recentSignals = oracle.getSignals(50);
      const symbolGroups = new Map<string, any[]>();
      
      // Group signals by symbol to detect patterns
      recentSignals.forEach(signal => {
        if (signal.symbol) {
          const existing = symbolGroups.get(signal.symbol) || [];
          existing.push(signal);
          symbolGroups.set(signal.symbol, existing);
        }
      });

      // Look for correlation patterns
      for (const [symbol, signals] of symbolGroups) {
        if (signals.length >= 3) {
          const sentiment = signals.reduce((sum, s) => sum + (s.direction === 1 ? 1 : -1), 0) / signals.length;
          const avgStrength = signals.reduce((sum, s) => sum + s.strength, 0) / signals.length;
          
          if (Math.abs(sentiment) > 0.6 && avgStrength > 0.7) {
            const finding: SeekerFinding = {
              id: generateULID('evt_'),
              type: 'signal_correlation',
              priority: avgStrength > 0.9 ? 'high' : 'medium',
              source: 'pattern_analyzer',
              symbol,
              data: {
                signalCount: signals.length,
                sentiment,
                avgStrength,
                timeSpan: '24h',
                signalTypes: [...new Set(signals.map(s => s.type))]
              },
              confidence: Math.min(Math.abs(sentiment) + avgStrength, 1.0) / 2,
              reasoning: [
                `Strong signal correlation detected for ${symbol}`,
                `${signals.length} signals with ${sentiment > 0 ? 'bullish' : 'bearish'} sentiment`,
                `Average signal strength: ${(avgStrength * 100).toFixed(1)}%`
              ],
              timestamp: new Date(),
              processed: false
            };

            await this.recordFinding(finding);
          }
        }
      }
    } catch (error) {
      logService.log('error', 'Seeker secondary pattern scan failed', { error });
    }
  }

  private async scanHypothesisDiscrepancies(): Promise<void> {
    // Investigate discrepancies between Trade Bot hypotheses and outcomes
    try {
      const bots = tradeBotSystem.getBots();
      const journalEntries = tradeBotSystem.getJournalEntries();
      
      for (const bot of bots) {
        const botEntries = journalEntries.filter(e => e.botId === bot.id);
        
        if (botEntries.length >= 5) {
          // Analyze hypothesis vs outcome patterns
          const highConfidenceEntries = botEntries.filter(e => e.confidenceScore > 0.8);
          
          if (highConfidenceEntries.length >= 3) {
            // Mock outcome analysis - would compare actual trade results
            const successRate = 0.3 + Math.random() * 0.4; // 30-70% success rate
            
            if (successRate < 0.5) {
              const finding: SeekerFinding = {
                id: generateULID('evt_'),
                type: 'hypothesis_discrepancy',
                priority: successRate < 0.3 ? 'high' : 'medium',
                source: 'hypothesis_analyzer',
                symbol: highConfidenceEntries[0].symbol,
                data: {
                  botId: bot.id,
                  botName: bot.name,
                  strategy: bot.strategy,
                  highConfidenceEntries: highConfidenceEntries.length,
                  successRate,
                  avgConfidence: highConfidenceEntries.reduce((sum, e) => sum + e.confidenceScore, 0) / highConfidenceEntries.length
                },
                confidence: 1.0 - successRate,
                reasoning: [
                  `${bot.name} showing hypothesis discrepancies`,
                  `Success rate: ${(successRate * 100).toFixed(1)}% on high-confidence trades`,
                  `${highConfidenceEntries.length} high-confidence entries analyzed`,
                  'Potential strategy parameter adjustment needed'
                ],
                timestamp: new Date(),
                processed: false
              };

              await this.recordFinding(finding);
            }
          }
        }
      }
    } catch (error) {
      logService.log('error', 'Seeker hypothesis discrepancy scan failed', { error });
    }
  }

  private async investigateTradeOutcome(trade: any): Promise<void> {
    // Investigate specific trade outcomes for learning opportunities
    try {
      if (trade.outcome && trade.botId) {
        const bot = tradeBotSystem.getBot(trade.botId);
        const journalEntry = tradeBotSystem.getJournalEntries(trade.botId)
          .find(e => e.symbol === trade.symbol);

        if (bot && journalEntry) {
          const expectedOutcome = journalEntry.confidenceScore > 0.7;
          const actualSuccess = trade.outcome === 'profit';
          
          if (expectedOutcome !== actualSuccess) {
            const finding: SeekerFinding = {
              id: generateULID('evt_'),
              type: 'hypothesis_discrepancy',
              priority: 'medium',
              source: 'trade_outcome_analyzer',
              symbol: trade.symbol,
              data: {
                tradeId: trade.id,
                botId: trade.botId,
                expectedOutcome,
                actualOutcome: trade.outcome,
                confidence: journalEntry.confidenceScore,
                strategy: bot.strategy,
                discrepancyType: expectedOutcome ? 'false_positive' : 'false_negative'
              },
              confidence: Math.abs(journalEntry.confidenceScore - (actualSuccess ? 1 : 0)),
              reasoning: [
                `Trade outcome mismatch detected`,
                `Expected: ${expectedOutcome ? 'success' : 'failure'}, Actual: ${trade.outcome}`,
                `Bot confidence was ${(journalEntry.confidenceScore * 100).toFixed(1)}%`,
                'Signal quality or strategy parameters may need adjustment'
              ],
              timestamp: new Date(),
              processed: false
            };

            await this.recordFinding(finding);
          }
        }
      }
    } catch (error) {
      logService.log('error', 'Seeker trade outcome investigation failed', { error });
    }
  }

  private async analyzeOraclePattern(signal: any): Promise<void> {
    // Analyze Oracle signals for deeper patterns
    try {
      if (signal.symbol && signal.strength > 0.8) {
        // Look for supporting evidence in market data
        const marketData = { price: 100 + Math.random() * 50, volume: Math.random() * 1000000 }; // Mock data
        
        const correlation = Math.random();
        
        if (correlation > 0.7) {
          const finding: SeekerFinding = {
            id: generateULID('evt_'),
            type: 'pattern_anomaly',
            priority: correlation > 0.9 ? 'high' : 'medium',
            source: 'oracle_pattern_analyzer',
            symbol: signal.symbol,
            data: {
              originalSignal: signal,
              marketConfirmation: correlation,
              supportingData: marketData,
              patternType: 'oracle_market_correlation'
            },
            confidence: correlation,
            reasoning: [
              `Strong Oracle signal confirmed by market data`,
              `Signal strength: ${(signal.strength * 100).toFixed(1)}%`,
              `Market correlation: ${(correlation * 100).toFixed(1)}%`,
              'High probability of significant price movement'
            ],
            timestamp: new Date(),
            processed: false
          };

          await this.recordFinding(finding);
        }
      }
    } catch (error) {
      logService.log('error', 'Seeker Oracle pattern analysis failed', { error });
    }
  }

  private async scanForAnomalies(data: any[]): Promise<void> {
    // Scan cleaned market data for anomalies
    try {
      for (const item of data.slice(0, 10)) { // Process subset to avoid overload
        if (item.symbol && item.anomalyScore && item.anomalyScore > 0.8) {
          const finding: SeekerFinding = {
            id: generateULID('evt_'),
            type: 'pattern_anomaly',
            priority: item.anomalyScore > 0.95 ? 'critical' : 'high',
            source: 'market_data_analyzer',
            symbol: item.symbol,
            data: {
              anomalyScore: item.anomalyScore,
              anomalyType: item.anomalyType || 'unknown',
              dataPoint: item,
              timeframe: '1h'
            },
            confidence: item.anomalyScore,
            reasoning: [
              `Market data anomaly detected for ${item.symbol}`,
              `Anomaly score: ${(item.anomalyScore * 100).toFixed(1)}%`,
              `Type: ${item.anomalyType || 'pattern deviation'}`,
              'Requires immediate attention for potential opportunity'
            ],
            timestamp: new Date(),
            processed: false
          };

          await this.recordFinding(finding);
        }
      }
    } catch (error) {
      logService.log('error', 'Seeker anomaly scanning failed', { error });
    }
  }

  private async recordFinding(finding: SeekerFinding): Promise<void> {
    try {
      this.findings.set(finding.id, finding);

      // Use recorder createEntry method instead of recordEvent
      recorder.createEntry(
        'system',
        'seeker.finding',
        `Seeker found ${finding.type}: ${finding.reasoning[0]}`,
        finding
      );

      // Emit event for other systems to pick up
      eventBus.emit('seeker.finding', finding);

      logService.log('debug', `Seeker recorded ${finding.type} finding`, {
        findingId: finding.id,
        symbol: finding.symbol,
        priority: finding.priority,
        confidence: finding.confidence
      });

    } catch (error) {
      logService.log('error', 'Seeker finding recording failed', { error, finding });
    }
  }

  private async processFindings(): Promise<void> {
    try {
      const unprocessedFindings = Array.from(this.findings.values())
        .filter(f => !f.processed)
        .sort((a, b) => {
          // Sort by priority and confidence
          const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
          const aPriority = priorityOrder[a.priority];
          const bPriority = priorityOrder[b.priority];
          
          if (aPriority !== bPriority) return bPriority - aPriority;
          return b.confidence - a.confidence;
        });

      // Process top findings
      const toProcess = unprocessedFindings.slice(0, 5);
      
      for (const finding of toProcess) {
        await this.integrateFinding(finding);
        finding.processed = true;
      }

    } catch (error) {
      logService.log('error', 'Seeker finding processing failed', { error });
    }
  }

  private async integrateFinding(finding: SeekerFinding): Promise<void> {
    try {
      // Pass through Repository for cleansing & filtering (mock for now)
      const processedData = {
        type: finding.type,
        symbol: finding.symbol,
        data: finding.data,
        confidence: finding.confidence,
        timestamp: finding.timestamp,
        processed: true
      };

      // Update BID with refined intelligence (mock for now)
      if (processedData && finding.confidence > 0.6) {
        // Mock BID integration - would actually call bid.integrateExternalIntelligence
        logService.log('info', `Seeker integrated finding into BID`, {
          findingId: finding.id,
          type: finding.type,
          symbol: finding.symbol,
          data: processedData
        });
      }

    } catch (error) {
      logService.log('error', 'Seeker finding integration failed', { error, finding });
    }
  }

  private cleanupOldFindings(): void {
    try {
      const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
      let deletedCount = 0;
      
      for (const [id, finding] of this.findings) {
        if (finding.timestamp.getTime() < cutoffTime || 
            (finding.processed && this.findings.size > this.MAX_FINDINGS_STORED)) {
          this.findings.delete(id);
          deletedCount++;
        }
      }

      if (deletedCount > 0) {
        logService.log('debug', `Seeker cleaned up ${deletedCount} old findings`);
      }

    } catch (error) {
      logService.log('error', 'Seeker cleanup failed', { error });
    }
  }

  // Public API (minimal - Seeker operates autonomously)
  public getMetrics(): SeekerMetrics {
    const findings = Array.from(this.findings.values());
    const processed = findings.filter(f => f.processed);
    const highPriority = findings.filter(f => f.priority === 'high' || f.priority === 'critical');
    
    return {
      totalFindings: findings.length,
      processedFindings: processed.length,
      highPriorityFindings: highPriority.length,
      lastScanTime: this.lastFullScan,
      averageConfidence: findings.length > 0 
        ? findings.reduce((sum, f) => sum + f.confidence, 0) / findings.length 
        : 0,
      successfulIntegrations: processed.length // Simplified metric
    };
  }

  public getRecentFindings(limit: number = 10): SeekerFinding[] {
    return Array.from(this.findings.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  public activate(): void {
    this.isActive = true;
    if (!this.scanInterval) {
      this.startContinuousScanning();
    }
    logService.log('info', 'The Seeker: Activated');
  }

  public deactivate(): void {
    this.isActive = false;
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = undefined;
    }
    logService.log('info', 'The Seeker: Deactivated');
  }

  public isActiveStatus(): boolean {
    return this.isActive;
  }
}

// Export singleton instance
export const seeker = new SeekerService();