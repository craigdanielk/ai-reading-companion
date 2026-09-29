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
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-5" },
  deepseek: { baseUrl: "https://api.deepseek.com/v1", model: "deepseek-chat" },
  mistral: { baseUrl: "https://api.mistral.ai/v1", model: "mistral-medium-latest" },
};

function platformKey(provider: string): string | undefined {
  switch (provider) {
    case "openai":
      // accept both spellings (OPENAI_API_KEY canonical; OPEN_AI_API_KEY tolerated)
      return process.env.OPENAI_API_KEY || process.env.OPEN_AI_API_KEY;
    case "deepseek":
      return process.env.DEEPSEEK_API_KEY;
    case "mistral":
      return process.env.MISTRAL_API_KEY;
    default:
      return undefined;
  }
}

function makeProvider(id: string, apiKey: string, model: string): ComprehensionProvider {
  const cfg = PROVIDERS[id];
  return {
    id: id + ":" + model,
    comprehend(req: ComprehensionRequest): Promise<ComprehensionResult> {
      return callChatCompletion(cfg.baseUrl, apiKey, model, req);
    },
  };
}

// Resolution order: user BYOK connection -> platform default -> DeepSeek fallback.
export async function resolveProvider(): Promise<ComprehensionProvider> {
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
      return makeProvider(
        conn.provider,
        conn.credential_ref,
        (conn.model as string) || PROVIDERS[conn.provider].model
      );
    }
  }

  const platformProvider = process.env.PLATFORM_PROVIDER || "openai";
  if (PROVIDERS[platformProvider]) {
    const key = platformKey(platformProvider);
    if (key) {
      return makeProvider(
        platformProvider,
        key,
        process.env.PLATFORM_MODEL || PROVIDERS[platformProvider].model
      );
    }
  }

  return deepseekProvider;
}
