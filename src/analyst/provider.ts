/**
 * Analyst Provider Adapter
 * v1: Deterministic engine (no LLM by default)
 * Future: Optional LLM adapter can be enabled
 */

export type AnalystProvider = "none" | "llm";

/**
 * Get the current Analyst provider
 * Default: "none" - uses deterministic rule engine
 */
export const getAnalystProvider = (): AnalystProvider => {
  // v1: Always use deterministic engine
  return "none";
};

/**
 * Generate response using external LLM (disabled in v1)
 * @throws Error - LLM provider is disabled by default
 */
export async function analystGenerate(_params: any): Promise<never> {
  throw new Error("LLM provider disabled (v1 Analyst is deterministic).");
}

/**
 * Check if LLM provider is available
 */
export const isLLMEnabled = (): boolean => {
  return getAnalystProvider() === "llm";
};
