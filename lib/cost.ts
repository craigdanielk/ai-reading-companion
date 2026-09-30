// Approximate per-1k-token prices (USD). This is an estimate for the usage
// readout, not billing: prices drift and providers publish their own tables.
const PRICE_PER_1K: Record<string, { input: number; output: number }> = {
  "gpt-4o": { input: 0.0025, output: 0.01 },
  "gpt-5": { input: 0.00125, output: 0.01 },
  "deepseek-chat": { input: 0.00027, output: 0.0011 },
  "mistral-medium-latest": { input: 0.002, output: 0.006 },
};

export function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const p = PRICE_PER_1K[model] ?? { input: 0.0025, output: 0.01 };
  return (inputTokens / 1000) * p.input + (outputTokens / 1000) * p.output;
}
