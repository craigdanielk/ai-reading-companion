import {
  ComprehensionProvider,
  ComprehensionRequest,
  ComprehensionResult,
} from "./types";
import { callChatCompletion } from "./chat";

const DEEPSEEK_BASE = "https://api.deepseek.com/v1";

// Cheap multilingual fallback (platform default only when no frontier key is set).
export const deepseekProvider: ComprehensionProvider = {
  id: "deepseek",
  async comprehend(req: ComprehensionRequest): Promise<ComprehensionResult> {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) throw new Error("DEEPSEEK_API_KEY not configured");
    return callChatCompletion(DEEPSEEK_BASE, apiKey, "deepseek-chat", req);
  },
};
