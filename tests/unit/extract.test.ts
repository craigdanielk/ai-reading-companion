import { describe, expect, it } from "vitest";
import { zipSync, strToU8 } from "fflate";
import {
  detectDocKind,
  titleFromFilename,
  decodeEntities,
  stripHtml,
  docxText,
  epubSpine,
  epubRootPath,
  extractDocument,
} from "@/lib/extract/document";

function asFile(bytes: Uint8Array, name: string, type = ""): File {
  const copy = new Uint8Array(bytes);
  return new File([copy.buffer as ArrayBuffer], name, { type });
}

describe("detectDocKind", () => {
  it("routes each supported format, and images to OCR", () => {
    expect(detectDocKind("a.pdf", "")).toBe("pdf");
    expect(detectDocKind("a.epub", "")).toBe("epub");
    expect(detectDocKind("a.docx", "")).toBe("docx");
    expect(detectDocKind("a.md", "")).toBe("text");
    expect(detectDocKind("a.txt", "")).toBe("text");
    expect(detectDocKind("page.jpg", "image/jpeg")).toBe("image");
    expect(detectDocKind("a.pages", "")).toBe("unknown");
  });
});

describe("titleFromFilename", () => {
  it("turns a filename into a title", () => {
    expect(titleFromFilename("Der_Prozess-v2.pdf")).toBe("Der Prozess v2");
  });
});

describe("decodeEntities", () => {
  it("decodes named and numeric entities", () => {
    expect(decodeEntities("a &amp; b &#39;c&#x27;")).toBe("a & b 'c'");
  });
});

describe("stripHtml", () => {
  it("turns block boundaries into blank lines so paragraphs survive", () => {
    const html = "<h1>Un</h1><p>Il a vendu la m&ecirc;che.</p><p>Le renard.</p>";
    const out = stripHtml(html);
    expect(out.split("\n\n").length).toBeGreaterThanOrEqual(2);
    expect(out).toContain("Il a vendu la m");
  });

  it("drops scripts and styles", () => {
    expect(stripHtml("<style>p{color:red}</style><p>Text</p><script>x()</script>")).toBe("Text");
  });
});

describe("docxText", () => {
  it("joins runs and separates paragraphs", () => {
    const xml = "<w:body><w:p><w:r><w:t>Bonjour </w:t></w:r><w:r><w:t>le monde</w:t></w:r></w:p><w:p><w:r><w:t>Deuxieme</w:t></w:r></w:p></w:body>";
    expect(docxText(xml)).toBe("Bonjour le monde\n\nDeuxieme");
  });
});

describe("epub", () => {
  const container = '<container><rootfiles><rootfile full-path="OEBPS/content.opf"/></rootfiles></container>';
  const opf = '<package><manifest><item id="b" href="b.xhtml"/><item id="a" href="a.xhtml"/></manifest><spine><itemref idref="a"/><itemref idref="b"/></spine></package>';

  it("reads the root path from the container", () => {
    expect(epubRootPath(container)).toBe("OEBPS/content.opf");
  });

  it("returns chapters in spine order, not manifest order", () => {
    expect(epubSpine(container, opf, "OEBPS/content.opf")).toEqual(["OEBPS/a.xhtml", "OEBPS/b.xhtml"]);
  });

  it("extracts chapters from a real zip in reading order", async () => {
    const epub = zipSync({
      mimetype: strToU8("application/epub+zip"),
      "META-INF/container.xml": strToU8(container),
      "OEBPS/content.opf": strToU8(opf),
      "OEBPS/a.xhtml": strToU8("<html><body><p>Premier chapitre.</p></body></html>"),
      "OEBPS/b.xhtml": strToU8("<html><body><p>Second chapitre &amp; suite.</p></body></html>"),
    });
    const r = await extractDocument(asFile(epub, "book.epub"));
    expect(r.kind).toBe("epub");
    expect(r.text.indexOf("Premier")).toBeLessThan(r.text.indexOf("Second"));
    expect(r.text).toContain("Second chapitre & suite.");
  });
});

describe("extractDocument", () => {
  it("reads a docx end to end", async () => {
    const docx = zipSync({
      "word/document.xml": strToU8(
        "<w:document><w:body><w:p><w:r><w:t>Il a vendu la m&#39;che.</w:t></w:r></w:p></w:body></w:document>"
      ),
    });
    const r = await extractDocument(asFile(docx, "notes.docx"));
    expect(r.kind).toBe("docx");
    expect(r.text).toContain("Il a vendu la m");
  });

  it("reads plain text", async () => {
    const r = await extractDocument(asFile(strToU8("Un.\n\nDeux."), "a.txt"));
    expect(r.text).toBe("Un.\n\nDeux.");
  });

  it("refuses an unsupported type with a clear warning", async () => {
    const r = await extractDocument(asFile(strToU8("x"), "a.pages"));
    expect(r.warning).toBeTruthy();
    expect(r.text).toBe("");
  });
});
