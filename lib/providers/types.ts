import type { DomainCode } from "@/lib/nuance/registry";

export type ComprehensionDepth = "beginner" | "intermediate" | "advanced";

export interface ComprehensionRequest {
  text: string;
  targetLanguage: string;
  comprehensionDepth: ComprehensionDepth;
  /** general | literary | scientific | legal */
  domain?: DomainCode | null;
  /** lightweight same-content context */
  context?: string;
}

export interface ComprehensionResult {
  original: string;
  understanding: string;
  importantTerms: string[];
  keyIdea: string;
  explanation: string;
}

export interface ComprehensionProvider {
  id: string;
  comprehend(req: ComprehensionRequest): Promise<ComprehensionResult>;
}
