import { extractText } from "unpdf";
import { unzipSync, strFromU8 } from "fflate";

/**
 * Getting a real document into the library: PDF, EPUB, DOCX, or plain text.
 * Images go through OCR instead (see providers/ocr); this module is for files
 * that already contain text.
 */
export type DocKind = "pdf" | "epub" | "docx" | "text" | "image" | "unknown";

export interface ExtractedDocument {
  text: string;
  kind: DocKind;
  pages?: number;
  warning?: string;
}

export function detectDocKind(name: string, mime: string): DocKind {
  const n = (name || "").toLowerCase();
  const m = (mime || "").toLowerCase();
  if (m.startsWith("image/")) return "image";
  if (n.endsWith(".pdf") || m === "application/pdf") return "pdf";
  if (n.endsWith(".epub") || m === "application/epub+zip") return "epub";
  if (n.endsWith(".docx")) return "docx";
  if (n.endsWith(".txt") || n.endsWith(".md") || n.endsWith(".markdown") || m.startsWith("text/")) {
    return "text";
  }
  return "unknown";
}

/** A title from the filename, when the file carries no better one. */
export function titleFromFilename(name: string): string {
  return (name || "")
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

const ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  mdash: "—",
  ndash: "–",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (m, code: string) => {
    if (code.startsWith("#")) {
      const n = code[1] === "x" || code[1] === "X" ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : m;
    }
    return ENTITIES[code.toLowerCase()] ?? m;
  });
}

/**
 * HTML/XHTML to readable paragraphs. Block boundaries become blank lines,
 * because the reader splits a text into blocks on blank lines — lose them and
 * the whole chapter arrives as one unreadable paragraph.
 */
export function stripHtml(html: string): string {
  let s = html;
  s = s.replace(/<!--[\s\S]*?-->/g, " ");
  s = s.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, " ");
  s = s.replace(/<br\s*\/?>/gi, "\n");
  s = s.replace(/<\/(p|div|section|article|li|h[1-6]|tr|blockquote|figcaption)>/gi, "\n\n");
  s = s.replace(/<\/td>/gi, "\t");
  s = s.replace(/<[^>]+>/g, " ");
  s = decodeEntities(s);
  return s
    .split("\n")
    .map((line) => line.replace(/[ \t\u00a0]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** WordprocessingML: text lives in <w:t> runs, paragraphs close at </w:p>. */
export function docxText(xml: string): string {
  const paras = xml.split(/<\/w:p>/);
  const out: string[] = [];
  for (const para of paras) {
    const runs = [...para.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)].map((m) => m[1]);
    const line = decodeEntities(runs.join("")).replace(/\s+/g, " ").trim();
    if (line) out.push(line);
  }
  return out.join("\n\n");
}

/** The reading order a book declares in its OPF spine, not the zip's order. */
export function epubSpine(containerXml: string, opfXml: string, opfPath: string): string[] {
  const baseDir = opfPath.includes("/") ? opfPath.slice(0, opfPath.lastIndexOf("/") + 1) : "";
  const manifest = new Map<string, string>();
  for (const m of opfXml.matchAll(/<item\b[^>]*>/gi)) {
    const tag = m[0];
    const id = /\bid="([^"]+)"/i.exec(tag)?.[1];
    const href = /\bhref="([^"]+)"/i.exec(tag)?.[1];
    if (id && href) manifest.set(id, baseDir + decodeEntities(href));
  }
  const order: string[] = [];
  for (const m of opfXml.matchAll(/<itemref\b[^>]*>/gi)) {
    const idref = /\bidref="([^"]+)"/i.exec(m[0])?.[1];
    const href = idref ? manifest.get(idref) : undefined;
    if (href) order.push(href);
  }
  if (order.length) return order;
  // No usable spine: fall back to every document in the archive.
  return [];
}

export function epubRootPath(containerXml: string): string | null {
  const m = /<rootfile\b[^>]*full-path="([^"]+)"/i.exec(containerXml);
  return m ? decodeEntities(m[1]) : null;
}

function zipText(zip: Record<string, Uint8Array>, path: string): string | null {
  const entry = zip[path] ?? zip[path.replace(/^\.\//, "")];
  if (!entry) return null;
  try {
    return strFromU8(entry);
  } catch {
    return null;
  }
}

/** Cap: a whole book is fine, a runaway extraction is not. */
const MAX_CHARS = 600_000;

export async function extractDocument(file: File): Promise<ExtractedDocument> {
  const kind = detectDocKind(file.name, file.type);

  if (kind === "pdf") {
    const buf = new Uint8Array(await file.arrayBuffer());
    const { text, totalPages } = await extractText(buf, { mergePages: true });
    const body = (Array.isArray(text) ? text.join("\n\n") : text || "").trim();
    if (!body) {
      return {
        text: "",
        kind,
        pages: totalPages,
        warning: "That PDF has no extractable text — it is probably a scan. Upload it as an image instead.",
      };
    }
    return { text: body.slice(0, MAX_CHARS), kind, pages: totalPages };
  }

  if (kind === "docx") {
    const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const xml = zipText(zip, "word/document.xml");
    if (!xml) return { text: "", kind, warning: "That .docx has no readable document body." };
    return { text: docxText(xml).slice(0, MAX_CHARS), kind };
  }

  if (kind === "epub") {
    const zip = unzipSync(new Uint8Array(await file.arrayBuffer()));
    const container = zipText(zip, "META-INF/container.xml") || "";
    const opfPath = epubRootPath(container);
    const opf = opfPath ? zipText(zip, opfPath) : null;
    let order = opf && opfPath ? epubSpine(container, opf, opfPath) : [];
    if (order.length === 0) {
      order = Object.keys(zip)
        .filter((p) => /\.(x?html?|htm)$/i.test(p))
        .sort();
    }
    const parts: string[] = [];
    for (const p of order) {
      const raw = zipText(zip, p);
      if (raw) parts.push(stripHtml(raw));
      if (parts.join("\n\n").length > MAX_CHARS) break;
    }
    const text = parts.filter(Boolean).join("\n\n").trim();
    if (!text) return { text: "", kind, warning: "That EPUB had no readable chapters." };
    return { text: text.slice(0, MAX_CHARS), kind };
  }

  if (kind === "text") {
    const raw = await file.text();
    return { text: raw.slice(0, MAX_CHARS), kind };
  }

  return { text: "", kind: "unknown", warning: "That file type is not supported yet." };
}
