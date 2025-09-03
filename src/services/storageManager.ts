import { logService } from './logging';
import { eventBus } from './eventBus';
import { dataCompression } from './dataCompression';
import { serviceManager } from './serviceManager';
import type { 
  ArchiveMetadata, 
  DataCompressionRule, 
  CompressionJob 
} from '@/types/compression';
import type { RecorderEntry } from './recorder';

interface StoragePolicy {
  dataType: string;
  hotTier: number; // days to keep in hot storage (fast access)
  warmTier: number; // days to keep in warm storage (slower access)
  coldTier: number; // days to keep in cold storage (archive)
  deletionPolicy?: number; // days before permanent deletion (optional)
  compressionThreshold: number; // size in MB to trigger compression
}

interface StorageStats {
  totalSize: number; // bytes
  hotTierSize: number;
  warmTierSize: number;
  coldTierSize: number;
  compressionRatio: number;
  lastCleanup: Date;
  itemCount: number;
  archivedItems: number;
}

class StorageManagerService {
  private storagePolicies: Map<string, StoragePolicy> = new Map();
  private archives: Map<string, ArchiveMetadata> = new Map();
  private storageStats: StorageStats;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeStoragePolicies();
    this.storageStats = this.initializeStorageStats();
    this.startStorageManager();
    this.subscribeToEvents();
  }

  private initializeStoragePolicies() {
    const defaultPolicies: StoragePolicy[] = [
      {
        dataType: 'trade_records',
        hotTier: 30, // Keep recent trades hot for 30 days
        warmTier: 90, // Move to warm storage after 90 days
        coldTier: 365, // Archive after 1 year
        deletionPolicy: 2555, // Delete after 7 years (regulatory requirement)
        compressionThreshold: 100 // 100MB
      },
      {
        dataType: 'price_data',
        hotTier: 7, // Recent price data hot for 7 days
        warmTier: 30, // Warm for 30 days
        coldTier: 90, // Archive after 90 days
        compressionThreshold: 500 // 500MB
      },
      {
        dataType: 'oracle_signals',
        hotTier: 14,
        warmTier: 60,
        coldTier: 180,
        compressionThreshold: 50
      },
      {
        dataType: 'analyst_conversations',
        hotTier: 30,
        warmTier: 90,
        coldTier: 365,
        deletionPolicy: 1095, // 3 years
        compressionThreshold: 25
      },
      {
        dataType: 'bot_logs',
        hotTier: 7,
        warmTier: 30,
        coldTier: 90,
        deletionPolicy: 180, // 6 months
        compressionThreshold: 200
      },
      {
        dataType: 'risk_events',
        hotTier: 60,
        warmTier: 180,
        coldTier: 730,
        deletionPolicy: 2555, // 7 years (regulatory)
        compressionThreshold: 10
      }
    ];

    defaultPolicies.forEach(policy => {
      this.storagePolicies.set(policy.dataType, policy);
    });

    logService.log('info', 'Storage policies initialized', {
      policyCount: defaultPolicies.length
    });
  }

  private initializeStorageStats(): StorageStats {
    return {
      totalSize: 0,
      hotTierSize: 0,
      warmTierSize: 0,
      coldTierSize: 0,
      compressionRatio: 1.0,
      lastCleanup: new Date(),
      itemCount: 0,
      archivedItems: 0
    };
  }

  private startStorageManager() {
    // Register this service
    serviceManager.registerService('storageManager', this, () => this.cleanup());
    
    // Run storage cleanup every 6 hours
    serviceManager.createInterval('storageManager', () => {
      this.performStorageCleanup();
    }, 6 * 60 * 60 * 1000);

    // Run archive process daily
    serviceManager.createInterval('storageManager', () => {
      this.performArchivalProcess();
    }, 24 * 60 * 60 * 1000);

    // Update storage stats every hour
    serviceManager.createInterval('storageManager', () => {
      this.updateStorageStats();
    }, 60 * 60 * 1000);

    // Initial run after 30 seconds
    setTimeout(() => {
      this.performStorageCleanup();
      this.updateStorageStats();
    }, 30000);

    serviceManager.startService('storageManager');
    logService.log('info', 'Storage manager started');
  }

  private cleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logService.log('info', 'Storage manager cleanup completed');
  }

  private subscribeToEvents() {
    // Listen for data size thresholds
    eventBus.on('data.size_threshold_exceeded', (data) => {
      this.handleSizeThreshold(data);
    });

    // Listen for compression completion
    eventBus.on('data.compression_completed', (job: CompressionJob) => {
      this.handleCompressionCompleted(job);
    });

    // Listen for archive requests
    eventBus.on('storage.archive_requested', (data) => {
      this.performArchival(data.dataType, data.dateRange);
    });
  }

  // Main storage cleanup process
  private async performStorageCleanup(): Promise<void> {
    logService.log('info', 'Starting storage cleanup process');

    const cleanupResults = {
      archivedItems: 0,
      deletedItems: 0,
      compressedItems: 0,
      freedSpace: 0
    };

    try {
      for (const [dataType, policy] of this.storagePolicies) {
        const result = await this.cleanupDataType(dataType, policy);
        
        cleanupResults.archivedItems += result.archived;
        cleanupResults.deletedItems += result.deleted;
        cleanupResults.compressedItems += result.compressed;
        cleanupResults.freedSpace += result.freedSpace;
      }

      this.storageStats.lastCleanup = new Date();

      logService.log('info', 'Storage cleanup completed', cleanupResults);

      // Emit cleanup completion event
      eventBus.emit('storage.cleanup_completed', cleanupResults);

    } catch (error) {
      logService.log('error', 'Storage cleanup failed', {
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  private async cleanupDataType(dataType: string, policy: StoragePolicy): Promise<{
    archived: number;
    deleted: number;
    compressed: number;
    freedSpace: number;
  }> {
    const now = Date.now();
    const result = { archived: 0, deleted: 0, compressed: 0, freedSpace: 0 };

    // Simulate data cleanup (in production, would interact with actual storage)
    
    // Move data from hot to warm tier
    const hotTierCutoff = now - (policy.hotTier * 24 * 60 * 60 * 1000);
    const itemsToWarm = this.simulateDataQuery(dataType, 'hot', hotTierCutoff);
    
    if (itemsToWarm.length > 0) {
      await this.moveToWarmTier(dataType, itemsToWarm);
      logService.log('info', 'Data moved to warm tier', {
        dataType,
        itemCount: itemsToWarm.length
      });
    }

    // Move data from warm to cold tier (archive)
    const warmTierCutoff = now - (policy.warmTier * 24 * 60 * 60 * 1000);
    const itemsToArchive = this.simulateDataQuery(dataType, 'warm', warmTierCutoff);
    
    if (itemsToArchive.length > 0) {
      await this.moveToArchive(dataType, itemsToArchive);
      result.archived = itemsToArchive.length;
      logService.log('info', 'Data archived', {
        dataType,
        itemCount: itemsToArchive.length
      });
    }

    // Delete data if deletion policy exists
    if (policy.deletionPolicy) {
      const deletionCutoff = now - (policy.deletionPolicy * 24 * 60 * 60 * 1000);
      const itemsToDelete = this.simulateDataQuery(dataType, 'archive', deletionCutoff);
      
      if (itemsToDelete.length > 0) {
        await this.permanentlyDelete(dataType, itemsToDelete);
        result.deleted = itemsToDelete.length;
        result.freedSpace = itemsToDelete.length * 1024; // Simulate space freed
        
        logService.log('info', 'Data permanently deleted', {
          dataType,
          itemCount: itemsToDelete.length,
          freedSpaceKB: result.freedSpace
        });
      }
    }

    // Trigger compression if threshold exceeded
    const currentSize = this.simulateDataSize(dataType);
    if (currentSize > policy.compressionThreshold * 1024 * 1024) { // Convert MB to bytes
      dataCompression.queueCompression(dataType, 'medium');
      result.compressed = 1; // Indicate compression was triggered
    }

    return result;
  }

  // Archive management
  private async performArchivalProcess(): Promise<void> {
    logService.log('info', 'Starting archival process');

    for (const [dataType, policy] of this.storagePolicies) {
      const coldTierCutoff = Date.now() - (policy.coldTier * 24 * 60 * 60 * 1000);
      const itemsToArchive = this.simulateDataQuery(dataType, 'warm', coldTierCutoff);

      if (itemsToArchive.length >= 100) { // Only archive if sufficient items
        await this.createArchive(dataType, itemsToArchive);
      }
    }
  }

  private async createArchive(dataType: string, items: any[]): Promise<ArchiveMetadata> {
    const archiveId = `archive_${dataType}_${Date.now()}`;
    
    const originalSize = items.length * 1024; // Simulate size calculation
    const compressedSize = Math.floor(originalSize * 0.3); // 30% compression ratio
    
    const archive: ArchiveMetadata = {
      archiveId,
      dataType,
      dateRange: {
        start: new Date(Math.min(...items.map(item => item.timestamp?.getTime() || Date.now()))),
        end: new Date(Math.max(...items.map(item => item.timestamp?.getTime() || Date.now())))
      },
      originalSize,
      compressedSize,
      itemCount: items.length,
      compressionMethod: 'gzip',
      indexKeys: this.generateIndexKeys(dataType),
      createdAt: new Date(),
      accessCount: 0
    };

    this.archives.set(archiveId, archive);

    logService.log('info', 'Archive created', {
      archiveId,
      dataType,
      itemCount: items.length,
      compressionRatio: (compressedSize / originalSize).toFixed(2)
    });

    // Emit archive creation event
    eventBus.emit('storage.archive_created', archive);

    return archive;
  }

  // Storage tier management
  private async moveToWarmTier(dataType: string, items: any[]): Promise<void> {
    // Simulate moving data to warm tier (slower access, but cheaper storage)
    await this.simulateDataMove('warm', items);
    
    eventBus.emit('storage.data_moved', {
      dataType,
      fromTier: 'hot',
      toTier: 'warm',
      itemCount: items.length
    });
  }

  private async moveToArchive(dataType: string, items: any[]): Promise<void> {
    // Create compressed archive
    await this.createArchive(dataType, items);
    
    // Remove from warm tier
    await this.simulateDataMove('archive', items);
    
    eventBus.emit('storage.data_archived', {
      dataType,
      itemCount: items.length
    });
  }

  private async permanentlyDelete(dataType: string, items: any[]): Promise<void> {
    // Simulate permanent deletion with proper logging
    
    // Log deletion for audit trail
    logService.log('warn', 'Data permanently deleted', {
      dataType,
      itemCount: items.length,
      deletionReason: 'Retention policy',
      itemIds: items.slice(0, 10).map(item => item.id || 'unknown') // Log first 10 IDs
    });

    // Simulate deletion process
    await new Promise(resolve => setTimeout(resolve, 100));

    eventBus.emit('storage.data_deleted', {
      dataType,
      itemCount: items.length,
      deletionDate: new Date()
    });
  }

  // Storage statistics and monitoring
  private updateStorageStats(): void {
    // Simulate storage statistics calculation
    const totalItems = this.simulateTotalItemCount();
    const archivedItems = Array.from(this.archives.values())
      .reduce((sum, archive) => sum + archive.itemCount, 0);

    const totalSize = totalItems * 1024; // Simulate total size
    const compressedSize = Array.from(this.archives.values())
      .reduce((sum, archive) => sum + archive.compressedSize, 0);

    this.storageStats = {
      totalSize,
      hotTierSize: Math.floor(totalSize * 0.1), // 10% in hot tier
      warmTierSize: Math.floor(totalSize * 0.3), // 30% in warm tier
      coldTierSize: compressedSize,
      compressionRatio: totalSize > 0 ? compressedSize / totalSize : 1.0,
      lastCleanup: this.storageStats.lastCleanup,
      itemCount: totalItems,
      archivedItems
    };

    // Emit stats update
    eventBus.emit('storage.stats_updated', this.storageStats);
  }

  // Event handlers
  private handleSizeThreshold(data: any): void {
    const { dataType, currentSize, threshold } = data;
    
    logService.log('warn', 'Storage size threshold exceeded', {
      dataType,
      currentSize,
      threshold
    });

    // Trigger immediate cleanup for this data type
    const policy = this.storagePolicies.get(dataType);
    if (policy) {
      this.cleanupDataType(dataType, policy);
    }

    // Queue compression
    dataCompression.queueCompression(dataType, 'high');
  }

  private handleCompressionCompleted(job: CompressionJob): void {
    logService.log('info', 'Compression job completed', {
      jobId: job.jobId,
      dataType: job.dataType,
      compressionRatio: job.compressionRatio,
      spaceSaved: job.originalSize - job.compressedSize
    });

    // Update storage stats
    this.updateStorageStats();
  }

  // Archive retrieval
  async retrieveFromArchive(archiveId: string, query?: any): Promise<any[]> {
    const archive = this.archives.get(archiveId);
    
    if (!archive) {
      throw new Error(`Archive not found: ${archiveId}`);
    }

    // Update access count
    archive.accessCount++;
    archive.lastAccessed = new Date();

    logService.log('info', 'Archive accessed', {
      archiveId,
      dataType: archive.dataType,
      accessCount: archive.accessCount
    });

    // Simulate archive retrieval (in production would decompress and return data)
    const mockData = this.simulateArchiveRetrieval(archive, query);

    eventBus.emit('storage.archive_accessed', {
      archiveId,
      dataType: archive.dataType,
      itemsRetrieved: mockData.length
    });

    return mockData;
  }

  // Search across archives
  searchArchives(dataType: string, criteria: any): ArchiveMetadata[] {
    return Array.from(this.archives.values())
      .filter(archive => {
        if (archive.dataType !== dataType) return false;
        
        // Apply search criteria
        if (criteria.dateRange) {
          const { start, end } = criteria.dateRange;
          if (archive.dateRange.end < start || archive.dateRange.start > end) {
            return false;
          }
        }
        
        return true;
      });
  }

  // Utility methods
  private simulateDataQuery(dataType: string, tier: string, cutoffTime: number): any[] {
    // Simulate querying data older than cutoff time
    const itemCount = Math.floor(Math.random() * 100) + 10;
    
    return Array.from({ length: itemCount }, (_, i) => ({
      id: `${dataType}_${tier}_${i}`,
      timestamp: new Date(cutoffTime - Math.random() * 86400000), // Random time before cutoff
      size: Math.floor(Math.random() * 1024) + 100
    }));
  }

  private simulateDataSize(dataType: string): number {
    // Simulate current data size in bytes
    const baseSizes = {
      'trade_records': 50 * 1024 * 1024, // 50MB
      'price_data': 200 * 1024 * 1024, // 200MB
      'oracle_signals': 10 * 1024 * 1024, // 10MB
      'analyst_conversations': 5 * 1024 * 1024, // 5MB
      'bot_logs': 100 * 1024 * 1024, // 100MB
      'risk_events': 2 * 1024 * 1024 // 2MB
    };

    return baseSizes[dataType as keyof typeof baseSizes] || 10 * 1024 * 1024;
  }

  private simulateTotalItemCount(): number {
    return Math.floor(Math.random() * 100000) + 50000;
  }

  private async simulateDataMove(toTier: string, items: any[]): Promise<void> {
    // Simulate data movement delay
    await new Promise(resolve => setTimeout(resolve, 100));
  }

  private generateIndexKeys(dataType: string): string[] {
    const commonKeys = ['timestamp', 'id'];
    
    const typeSpecificKeys = {
      'trade_records': ['symbol', 'side', 'quantity', 'price'],
      'price_data': ['symbol', 'price', 'volume'],
      'oracle_signals': ['type', 'severity', 'symbol'],
      'analyst_conversations': ['persona', 'topic', 'user'],
      'bot_logs': ['bot_id', 'action', 'result'],
      'risk_events': ['risk_type', 'severity', 'symbol']
    };

    return [
      ...commonKeys,
      ...(typeSpecificKeys[dataType as keyof typeof typeSpecificKeys] || [])
    ];
  }

  private simulateArchiveRetrieval(archive: ArchiveMetadata, query?: any): any[] {
    // Simulate decompressing and filtering archive data
    const baseItemCount = Math.min(archive.itemCount, query?.limit || 1000);
    
    return Array.from({ length: baseItemCount }, (_, i) => ({
      id: `${archive.dataType}_archived_${i}`,
      timestamp: new Date(
        archive.dateRange.start.getTime() + 
        (archive.dateRange.end.getTime() - archive.dateRange.start.getTime()) * Math.random()
      ),
      dataType: archive.dataType,
      archived: true
    }));
  }

  // Public API methods
  getStoragePolicies(): StoragePolicy[] {
    return Array.from(this.storagePolicies.values());
  }

  updateStoragePolicy(dataType: string, policy: Partial<StoragePolicy>): void {
    const existingPolicy = this.storagePolicies.get(dataType);
    if (existingPolicy) {
      this.storagePolicies.set(dataType, { ...existingPolicy, ...policy });
      logService.log('info', 'Storage policy updated', { dataType, policy });
    }
  }

  getStorageStats(): StorageStats {
    return { ...this.storageStats };
  }

  getArchives(dataType?: string): ArchiveMetadata[] {
    const allArchives = Array.from(this.archives.values());
    return dataType ? allArchives.filter(a => a.dataType === dataType) : allArchives;
  }

  // Manual operations
  manualCleanup(dataType?: string): Promise<void> {
    if (dataType) {
      const policy = this.storagePolicies.get(dataType);
      if (policy) {
        return this.cleanupDataType(dataType, policy).then(() => {});
      }
      return Promise.reject(new Error(`No policy found for data type: ${dataType}`));
    } else {
      return this.performStorageCleanup();
    }
  }

  manualArchive(dataType: string, dateRange: { start: Date; end: Date }): Promise<ArchiveMetadata> {
    return this.performArchival(dataType, dateRange);
  }

  private async performArchival(dataType: string, dateRange: { start: Date; end: Date }): Promise<ArchiveMetadata> {
    // Simulate querying data in date range
    const items = Array.from({ length: 500 }, (_, i) => ({
      id: `${dataType}_${i}`,
      timestamp: new Date(
        dateRange.start.getTime() + 
        (dateRange.end.getTime() - dateRange.start.getTime()) * Math.random()
      )
    }));

    return this.createArchive(dataType, items);
  }

  // Cleanup on shutdown
  shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    logService.log('info', 'Storage manager shut down');
  }
}

export const storageManager = new StorageManagerService();