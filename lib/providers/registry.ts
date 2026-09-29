import { ComprehensionProvider } from "./types";

const providers = new Map<string, ComprehensionProvider>();

export function registerProvider(provider: ComprehensionProvider): void {
  providers.set(provider.id, provider);
}

export function getProvider(id: string): ComprehensionProvider | undefined {
  return providers.get(id);
}

export function listProviders(): string[] {
  return Array.from(providers.keys());
}
