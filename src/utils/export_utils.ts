/**
 * SalitAI.orbit Frontend
 * File: export_utils.ts
 * Version: 1.0.0
 * Purpose: Export minutes to MD/DOCX/PDF.
 */

import { saveAs } from "file-saver";
import { Document, Packer, Paragraph, HeadingLevel, TextRun } from "docx";
import { jsPDF } from "jspdf";

function sanitize_filename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, "_").trim() || "salitAI_minutes";
}

export function download_markdown(filename: string, markdown: string): void {
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  saveAs(blob, `${sanitize_filename(filename)}.md`);
}

function md_to_docx_paragraphs(markdown: string): Paragraph[] {
  const lines = markdown.split(/\r?\n/);
  const out: Paragraph[] = [];

  for (const raw of lines) {
    const line = raw.trimEnd();

    if (!line.trim()) {
      out.push(new Paragraph({ text: "" }));
      continue;
    }

    if (line.startsWith("# ")) {
      out.push(new Paragraph({ text: line.slice(2).trim(), heading: HeadingLevel.HEADING_1 }));
      continue;
    }
    if (line.startsWith("## ")) {
      out.push(new Paragraph({ text: line.slice(3).trim(), heading: HeadingLevel.HEADING_2 }));
      continue;
    }
    if (line.startsWith("### ")) {
      out.push(new Paragraph({ text: line.slice(4).trim(), heading: HeadingLevel.HEADING_3 }));
      continue;
    }

    if (line.startsWith("- ") || line.startsWith("* ")) {
      out.push(new Paragraph({ text: line.slice(2).trim(), bullet: { level: 0 } }));
      continue;
    }

    out.push(new Paragraph({ children: [new TextRun(line)] }));
  }

  return out;
}

export async function download_docx(filename: string, markdown: string): Promise<void> {
  const doc = new Document({
    sections: [{ properties: {}, children: md_to_docx_paragraphs(markdown) }],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${sanitize_filename(filename)}.docx`);
}

export function download_pdf(filename: string, markdown: string): void {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const page_width = doc.internal.pageSize.getWidth();
  const margin = 40;
  const max_width = page_width - margin * 2;

  const text = markdown.replace(/\t/g, "  ");
  const lines = doc.splitTextToSize(text, max_width);

  let y = 60;
  for (const line of lines) {
    if (y > 780) {
      doc.addPage();
      y = 60;
    }
    doc.text(line, margin, y);
    y += 14;
  }

  doc.save(`${sanitize_filename(filename)}.pdf`);
}
