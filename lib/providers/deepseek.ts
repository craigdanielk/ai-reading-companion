import {
  ComprehensionProvider,
  ComprehensionRequest,
  ComprehensionResult,
} from "./types";

// Platform default provider (DeepSeek). Realization lands in T11.
export const deepseekProvider: ComprehensionProvider = {
  id: "deepseek",
  async comprehend(_req: ComprehensionRequest): Promise<ComprehensionResult> {
    throw new Error("ComprehensionEngine not implemented — built in T11");
  },
};
