export interface UsageInfo {
  inputTokens: number;
  outputTokens: number;
}

// $ per 1M tokens. Update if the model used in lib/freeLlmAnalysis.ts changes.
const PRICING_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 2, output: 10 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export function estimateCostUsd(model: string, usage: UsageInfo): number {
  const pricing = PRICING_PER_MTOK[model];
  if (!pricing) return 0;
  const cost = (usage.inputTokens / 1_000_000) * pricing.input + (usage.outputTokens / 1_000_000) * pricing.output;
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/**
 * Logs one structured line per analysis (visible in Vercel Runtime Logs,
 * searchable by the "COST_LOG" prefix) and returns the estimated cost so
 * callers can attach it to the lead record.
 */
export function logCost(context: {
  url: string;
  model: string;
  usage: UsageInfo | null;
  cached: boolean;
}): number {
  const cost = context.cached || !context.usage ? 0 : estimateCostUsd(context.model, context.usage);
  console.log(
    "COST_LOG",
    JSON.stringify({
      url: context.url,
      model: context.model,
      cached: context.cached,
      inputTokens: context.usage?.inputTokens ?? 0,
      outputTokens: context.usage?.outputTokens ?? 0,
      estimatedCostUsd: cost,
      timestamp: new Date().toISOString(),
    }),
  );
  return cost;
}
