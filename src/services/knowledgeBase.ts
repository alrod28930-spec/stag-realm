// Knowledge Base Service - RAG system for Analyst
import { supabase } from "@/integrations/supabase/client";

export interface KBSource {
  id: string;
  name: string;
  url?: string;
  license: string;
  priority: number;
}

export interface KBDocument {
  id: string;
  source_id: string;
  title: string;
  doc_type: string;
  language: string;
  source?: KBSource;
}

export interface KBChunk {
  id: string;
  document_id: string;
  content: string;
  metadata: any; // Changed from Record<string, any> to handle Supabase Json type
  created_at?: string;
  document?: KBDocument;
}

export interface GlossaryTerm {
  term: string;
  definition: string;
  examples?: string;
  see_also?: string[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  tags: string[];
}

export interface RetrievalResult {
  chunks: KBChunk[];
  glossaryTerms: GlossaryTerm[];
  faqs: FAQ[];
  sources: string[];
}

export class KnowledgeBaseService {
  
  // Quick glossary lookup
  async getGlossaryTerm(term: string): Promise<GlossaryTerm | null> {
    const { data, error } = await supabase
      .from('glossary')
      .select('*')
      .ilike('term', term)
      .single();

    if (error || !data) return null;
    return data;
  }

  // Search glossary terms
  async searchGlossary(query: string, limit = 5): Promise<GlossaryTerm[]> {
    const { data, error } = await supabase
      .from('glossary')
      .select('*')
      .or(`term.ilike.%${query}%,definition.ilike.%${query}%`)
      .limit(limit);

    if (error) return [];
    return data || [];
  }

  // Search FAQs
  async searchFAQs(query: string, tags?: string[], limit = 3): Promise<FAQ[]> {
    let queryBuilder = supabase
      .from('faqs')
      .select('*')
      .or(`question.ilike.%${query}%,answer.ilike.%${query}%`);

    if (tags && tags.length > 0) {
      queryBuilder = queryBuilder.overlaps('tags', tags);
    }

    const { data, error } = await queryBuilder.limit(limit);

    if (error) return [];
    return data || [];
  }

  // Get documents by type
  async getDocumentsByType(docType: string): Promise<KBDocument[]> {
    const { data, error } = await supabase
      .from('kb_documents')
      .select(`
        *,
        source:kb_sources(*)
      `)
      .eq('doc_type', docType);

    if (error) return [];
    return data || [];
  }

  // Get chunks for a document
  async getDocumentChunks(documentId: string): Promise<KBChunk[]> {
    const { data, error } = await supabase
      .from('kb_chunks')
      .select(`
        *,
        document:kb_documents(
          *,
          source:kb_sources(*)
        )
      `)
      .eq('document_id', documentId);

    if (error) return [];
    return data || [];
  }

  // RAG retrieval - combines semantic search with keyword matching
  async retrieveKnowledge(
    query: string, 
    options: {
      includeGlossary?: boolean;
      includeFAQs?: boolean;
      includeChunks?: boolean;
      limit?: number;
      tags?: string[];
    } = {}
  ): Promise<RetrievalResult> {
    const {
      includeGlossary = true,
      includeFAQs = true,
      includeChunks = true,
      limit = 5,
      tags = []
    } = options;

    const results: RetrievalResult = {
      chunks: [],
      glossaryTerms: [],
      faqs: [],
      sources: []
    };

    // Extract key terms for better matching
    const queryLower = query.toLowerCase();
    const keyTerms = this.extractKeyTerms(queryLower);

    // Parallel retrieval
    const promises: Promise<any>[] = [];

    if (includeGlossary) {
      promises.push(this.searchGlossary(query, limit));
    }

    if (includeFAQs) {
      promises.push(this.searchFAQs(query, tags, limit));
    }

    if (includeChunks) {
      // For now, use simple text search until embeddings are generated
      promises.push(this.searchChunksText(query, limit));
    }

    try {
      const [glossaryResults, faqResults, chunkResults] = await Promise.all(promises);

      if (includeGlossary && glossaryResults) {
        results.glossaryTerms = glossaryResults;
        results.sources.push('Glossary');
      }

      if (includeFAQs && faqResults) {
        results.faqs = faqResults;
        results.sources.push('FAQs');
      }

      if (includeChunks && chunkResults) {
        results.chunks = chunkResults;
        const chunkSources = chunkResults
          .map((chunk: KBChunk) => chunk.document?.source?.name)
          .filter((name: string | undefined): name is string => !!name);
        results.sources.push(...chunkSources);
      }

      // Deduplicate sources
      results.sources = [...new Set(results.sources)];

    } catch (error) {
      console.error('Knowledge retrieval error:', error);
    }

    return results;
  }

  // Simple text search for chunks until we have embeddings
  private async searchChunksText(query: string, limit: number): Promise<KBChunk[]> {
    const { data, error } = await supabase
      .from('kb_chunks')
      .select(`
        *,
        document:kb_documents(
          *,
          source:kb_sources(*)
        )
      `)
      .textSearch('content', query.replace(/\s+/g, ' & '))
      .limit(limit);

    if (error) {
      // Fallback to ilike search
      const { data: fallbackData } = await supabase
        .from('kb_chunks')
        .select(`
          *,
          document:kb_documents(
            *,
            source:kb_sources(*)
          )
        `)
        .ilike('content', `%${query}%`)
        .limit(limit);

      return fallbackData || [];
    }

    return data || [];
  }

  // Extract key trading/finance terms from query
  private extractKeyTerms(query: string): string[] {
    const tradingTerms = [
      'atr', 'vwap', 'rsi', 'macd', 'bollinger', 'moving average',
      'stop loss', 'take profit', 'position sizing', 'risk management',
      'drawdown', 'sharpe', 'volatility', 'momentum', 'breakout',
      'support', 'resistance', 'volume', 'liquidity', 'slippage',
      'pdt', 'pattern day trader', 'margin', 'leverage', 'short',
      'long', 'scalping', 'swing trading', 'day trading'
    ];

    return tradingTerms.filter(term => 
      query.includes(term) || query.includes(term.replace(/\s+/g, ''))
    );
  }

  // Add new document and chunks
  async addDocument(
    sourceId: string,
    title: string,
    docType: string,
    chunks: { content: string; metadata?: Record<string, any> }[]
  ): Promise<string | null> {
    // Create document
    const { data: doc, error: docError } = await supabase
      .from('kb_documents')
      .insert({
        source_id: sourceId,
        title,
        doc_type: docType
      })
      .select()
      .single();

    if (docError || !doc) {
      console.error('Error creating document:', docError);
      return null;
    }

    // Add chunks
    const chunkData = chunks.map(chunk => ({
      document_id: doc.id,
      content: chunk.content,
      metadata: chunk.metadata || {}
    }));

    const { error: chunksError } = await supabase
      .from('kb_chunks')
      .insert(chunkData);

    if (chunksError) {
      console.error('Error creating chunks:', chunksError);
      return null;
    }

    return doc.id;
  }

  // Generate embeddings for a chunk (calls edge function)
  async generateEmbedding(text: string): Promise<number[] | null> {
    try {
      const { data, error } = await supabase.functions.invoke('kb-embeddings', {
        body: { text, action: 'embed' }
      });

      if (error) throw error;
      return data.embedding;
    } catch (error) {
      console.error('Error generating embedding:', error);
      return null;
    }
  }

  // Semantic search using embeddings
  async semanticSearch(query: string, limit = 5): Promise<KBChunk[]> {
    try {
      const { data, error } = await supabase.functions.invoke('kb-embeddings', {
        body: { query, action: 'search', limit }
      });

      if (error) throw error;
      return data.results || [];
    } catch (error) {
      console.error('Error in semantic search:', error);
      return this.searchChunksText(query, limit); // Fallback
    }
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();