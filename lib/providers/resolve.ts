import { createClient } from "@/lib/supabase/server";
import { deepseekProvider } from "./deepseek";
import { callChatCompletion } from "./chat";
import {
  ComprehensionProvider,
  ComprehensionRequest,
  ComprehensionResult,
} from "./types";

// OpenAI-compatible providers. Nuance-first default is a frontier model.
const PROVIDERS: Record<string, { baseUrl: string; model: string }> = {
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  mistral: { baseUrl: "https://api.mistral.ai/v1", model: "mistral-medium-latest" },
};

export interface ProviderConfig {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  /** byok = the reader's own key; platform = the shared default. */
  origin: "byok" | "platform";
}

function platformKey(provider: string): string | undefined {
  switch (provider) {
    case "openai":
      return process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY;
    case "mistral":
      return process.env.MISTRAL_API_KEY;
    default:
      return undefined;
  }
}

// Resolution order: user BYOK connection -> platform default -> DeepSeek.
export async function resolveProviderConfig(): Promise<ProviderConfig | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (data.user) {
    const { data: conn } = await supabase
      .from("provider_connection")
      .select("*")
      .eq("user_id", data.user.id)
      .eq("is_default", true)
      .maybeSingle();
    if (conn && conn.credential_ref && PROVIDERS[conn.provider]) {
      return {
        provider: conn.provider,
        baseUrl: PROVIDERS[conn.provider].baseUrl,
        apiKey: conn.credential_ref,
        model: (conn.model as string) || PROVIDERS[conn.provider].model,
        origin: "byok",
      };
    }
  }

  const platformProvider = process.env.PLATFORM_PROVIDER || "openai";
  if (PROVIDERS[platformProvider]) {
    const key = platformKey(platformProvider);
    if (key) {
      return {
        provider: platformProvider,
        baseUrl: PROVIDERS[platformProvider].baseUrl,
        apiKey: key,
        model: process.env.PLATFORM_MODEL || PROVIDERS[platformProvider].model,
        origin: "platform",
      };
    }
  }

  const dsKey = process.env.DEEPSEEK_API_KEY;
  if (dsKey) {
    return {
      provider: "deepseek",
      baseUrl: PROVIDERS.deepseek.baseUrl,
      apiKey: dsKey,
      model: PROVIDERS.deepseek.model,
      origin: "platform",
    };
  }
  return null;
}

function makeProvider(cfg: ProviderConfig): ComprehensionProvider {
  return {
    id: cfg.provider + ":" + cfg.model,
    comprehend(req: ComprehensionRequest): Promise<ComprehensionResult> {
      return callChatCompletion(cfg.baseUrl, cfg.apiKey, cfg.model, req);
    },
  };
}

export async function resolveProvider(): Promise<ComprehensionProvider> {
  const cfg = await resolveProviderConfig();
  return cfg ? makeProvider(cfg) : deepseekProvider;
}
