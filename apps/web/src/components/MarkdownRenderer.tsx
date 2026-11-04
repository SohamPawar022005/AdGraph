import React, { useState } from "react";
import { Link } from "react-router-dom";

interface MarkdownRendererProps {
  content: string;
  onLinkClick?: () => void;
}

export default function MarkdownRenderer({ content, onLinkClick }: MarkdownRendererProps) {
  const [copiedCodeIdx, setCopiedCodeIdx] = useState<number | null>(null);

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIdx(idx);
    setTimeout(() => setCopiedCodeIdx(null), 2000);
  };

  const renderInline = (text: string) => {
    const regex = /(\[.*?\]\(.*?\)|\*\*.*?\*\*|`.*?`)/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const match = part.match(/\[(.*?)\]\((.*?)\)/);
        if (match) {
          const [, label, url] = match;
          const isInternal = url.startsWith("/");
          return isInternal ? (
            <Link
              key={i}
              to={url}
              onClick={onLinkClick}
              className="text-brand-600 hover:text-brand-800 underline font-semibold transition"
            >
              {label}
            </Link>
          ) : (
            <a
              key={i}
              href={url}
              target="_blank"
              rel="noreferrer"
              className="text-brand-600 hover:text-brand-800 underline font-semibold transition"
            >
              {label} ↗
            </a>
          );
        }
      }
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={i} className="font-semibold text-slate-900">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code
            key={i}
            className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-[11px] font-mono border border-slate-200/60"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  // Pre-process into blocks: code blocks, tables, lists, and paragraphs
  const lines = content.split("\n");
  const blocks: React.ReactNode[] = [];
  let i = 0;
  let codeBlockCounter = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code Block
    if (line.startsWith("```")) {
      const lang = line.replace("```", "").trim() || "code";
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // skip closing ```
      const fullCode = codeLines.join("\n");
      const currentIdx = codeBlockCounter++;

      blocks.push(
        <div key={`code-${i}`} className="my-3 rounded-lg overflow-hidden border border-slate-700 bg-slate-900 text-slate-100 shadow-sm text-xs">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-800 text-[11px] font-mono text-slate-400 border-b border-slate-700">
            <span>{lang}</span>
            <button
              onClick={() => handleCopyCode(fullCode, currentIdx)}
              className="flex items-center gap-1 hover:text-white transition"
            >
              {copiedCodeIdx === currentIdx ? (
                <>
                  <span className="text-emerald-400">✓</span> Copied!
                </>
              ) : (
                <>
                  <span>📋</span> Copy code
                </>
              )}
            </button>
          </div>
          <pre className="p-3 overflow-x-auto font-mono text-[11px] leading-relaxed">
            <code>{fullCode}</code>
          </pre>
        </div>
      );
      continue;
    }

    // Markdown Table
    if (line.includes("|") && lines[i + 1] && lines[i + 1].includes("---")) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes("|")) {
        tableLines.push(lines[i]);
        i++;
      }
      const headerCells = tableLines[0]
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);
      const rowLines = tableLines.slice(2);

      blocks.push(
        <div key={`table-${i}`} className="my-3 overflow-x-auto rounded-lg border border-slate-200 shadow-xs">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100/80 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                {headerCells.map((h, hIdx) => (
                  <th key={hIdx} className="px-3 py-2">
                    {renderInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {rowLines.map((r, rIdx) => {
                const cells = r
                  .split("|")
                  .map((c) => c.trim())
                  .filter((c) => c.length > 0);
                return (
                  <tr key={rIdx} className="hover:bg-slate-50/80 transition">
                    {cells.map((cell, cIdx) => (
                      <td key={cIdx} className="px-3 py-2 text-slate-700">
                        {renderInline(cell)}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${i}`} className="text-sm font-bold text-slate-900 mt-4 mb-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-brand-600 inline-block"></span>
          {renderInline(line.replace("### ", ""))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${i}`} className="text-base font-bold text-slate-900 mt-5 mb-2 border-b border-slate-200 pb-1">
          {renderInline(line.replace("## ", ""))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`h1-${i}`} className="text-lg font-extrabold text-slate-900 mt-5 mb-2">
          {renderInline(line.replace("# ", ""))}
        </h1>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      blocks.push(
        <blockquote
          key={`quote-${i}`}
          className="border-l-4 border-amber-400 bg-amber-50/70 pl-3.5 py-2 text-xs text-amber-950 italic my-2.5 rounded-r-lg"
        >
          {renderInline(line.replace("> ", ""))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Bullet Lists
    if (line.startsWith("- ") || line.startsWith("* ")) {
      blocks.push(
        <li key={`li-${i}`} className="ml-5 list-disc text-xs sm:text-sm text-slate-700 leading-relaxed mb-1">
          {renderInline(line.replace(/^[-*]\s+/, ""))}
        </li>
      );
      i++;
      continue;
    }

    // Numbered Lists
    if (/^\d+\.\s/.test(line)) {
      blocks.push(
        <div key={`num-${i}`} className="text-xs sm:text-sm text-slate-800 leading-relaxed mb-1.5 font-normal pl-1">
          {renderInline(line)}
        </div>
      );
      i++;
      continue;
    }

    // Empty Lines
    if (line.trim() === "") {
      blocks.push(<div key={`empty-${i}`} className="h-2" />);
      i++;
      continue;
    }

    // Standard Paragraph
    blocks.push(
      <p key={`p-${i}`} className="text-xs sm:text-sm text-slate-800 leading-relaxed mb-2">
        {renderInline(line)}
      </p>
    );
    i++;
  }

  return <div className="space-y-0.5">{blocks}</div>;
}
