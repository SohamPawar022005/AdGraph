import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { sendChatMessage } from "../lib/api";
import type { ChatMessage, ChatResponse } from "../lib/types";

const INITIAL_SUGGESTIONS = [
  "What permits do I need for a food processing unit in Pune?",
  "What are the prerequisites for Factory License?",
  "Explain deemed approvals under MAITRI Act 2023",
  "How does MPCB Consent to Establish (CTE) work?",
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Hello! I am your **PermitGraph Regulatory Co-Pilot**.\n\n" +
        "I can help you navigate Maharashtra industrial approvals, verify statutory rules (MAITRI Act 2023, MID Act 1961), and identify the exact sequence of permits needed for your enterprise.\n\n" +
        "*Ask a question below or choose a suggested topic to get started:*",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      provider: "system",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen, messages]);

  const handleSend = async (textToSend?: string) => {
    const text = (textToSend || inputValue).trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: "msg-" + Date.now(),
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue("");
    setLoading(true);

    try {
      const historyPayload = messages
        .filter((m) => m.id !== "welcome-1")
        .slice(-6)
        .map((m) => ({ role: m.role, content: m.content }));

      const res: ChatResponse = await sendChatMessage(text, historyPayload);

      setActiveProvider(res.provider);
      setActiveModel(res.model);

      const assistantMsg: ChatMessage = {
        id: "msg-" + (Date.now() + 1),
        role: "assistant",
        content: res.reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        citations: res.citations,
        provider: res.provider,
        model: res.model,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.suggestions && res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: "err-" + Date.now(),
        role: "assistant",
        content:
          "⚠️ **Unable to reach the regulatory assistant service.**\n\n" +
          (err?.message || "Please ensure the PermitGraph backend server is running."),
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        role: "assistant",
        content:
          "Conversation cleared. How can I assist you with Maharashtra industrial compliance?",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        provider: "system",
      },
    ]);
    setSuggestions(INITIAL_SUGGESTIONS);
  };

  // Helper to render basic markdown elements and internal deep links
  const renderFormattedContent = (content: string) => {
    const lines = content.split("\n");
    return lines.map((line, lineIdx) => {
      if (line.startsWith("### ")) {
        return (
          <h4 key={lineIdx} className="font-semibold text-slate-900 mt-2.5 mb-1 text-sm">
            {line.replace("### ", "")}
          </h4>
        );
      }
      if (line.startsWith("> ")) {
        return (
          <blockquote
            key={lineIdx}
            className="border-l-2 border-amber-400 bg-amber-50/60 pl-2.5 py-1 text-xs text-amber-900 italic my-2 rounded-r"
          >
            {renderInline(line.replace("> ", ""))}
          </blockquote>
        );
      }
      if (line.startsWith("- ") || line.startsWith("* ")) {
        return (
          <li key={lineIdx} className="ml-4 list-disc text-xs text-slate-700 leading-relaxed mb-0.5">
            {renderInline(line.replace(/^[-*]\s+/, ""))}
          </li>
        );
      }
      if (/^\d+\.\s/.test(line)) {
        return (
          <div key={lineIdx} className="text-xs text-slate-700 leading-relaxed mb-1 font-medium">
            {renderInline(line)}
          </div>
        );
      }
      if (line.trim() === "") {
        return <div key={lineIdx} className="h-1.5" />;
      }
      return (
        <p key={lineIdx} className="text-xs text-slate-700 leading-relaxed mb-1">
          {renderInline(line)}
        </p>
      );
    });
  };

  const renderInline = (text: string) => {
    // Regex matches [label](url), **bold**, or `code`
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
              onClick={() => setIsOpen(false)}
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
        return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={i} className="bg-slate-100 px-1 py-0.5 rounded text-[11px] font-mono text-slate-800">
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2">
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open PermitGraph AI Co-Pilot"
            className="flex items-center space-x-2.5 bg-brand-700 hover:bg-brand-800 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 group focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
              <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z" />
              </svg>
              Regulatory Co-Pilot
            </span>
          </button>
        </div>
      )}

      {/* Chat Window Panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-2rem)] h-[620px] max-h-[calc(100vh-4rem)] bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-5 duration-200">
          
          {/* Header */}
          <div className="bg-brand-800 text-white px-4 py-3.5 flex items-center justify-between border-b border-brand-900 shadow-sm shrink-0">
            <div className="flex items-center space-x-2.5">
              <div className="p-1.5 bg-brand-700 rounded-lg">
                <svg className="w-5 h-5 text-emerald-300" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7h1a1 1 0 0 1 1 1v3a1 1 0 0 1-1 1h-1v1a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-1H2a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1h1a7 7 0 0 1 7-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 0 1 2-2M7.5 13A2.5 2.5 0 0 0 5 15.5 2.5 2.5 0 0 0 7.5 18a2.5 2.5 0 0 0 2.5-2.5A2.5 2.5 0 0 0 7.5 13m9 0a2.5 2.5 0 0 0-2.5 2.5 2.5 2.5 0 0 0 2.5 2.5 2.5 2.5 0 0 0 2.5-2.5 2.5 2.5 0 0 0-2.5-2.5z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold tracking-tight">PermitGraph Co-Pilot</h3>
                <div className="flex items-center space-x-1.5 text-[11px] text-brand-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>
                    {activeProvider === "gemini"
                      ? "Gemini 2.5 Flash"
                      : activeProvider === "ollama"
                      ? `Ollama (${activeModel || "local"})`
                      : activeProvider === "permitgraph-rules"
                      ? "Rules Engine (Grounded)"
                      : "MAITRI & MIDC AI Assistant"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <button
                onClick={handleClear}
                title="Clear conversation"
                className="p-1.5 rounded-lg text-brand-200 hover:text-white hover:bg-brand-700/60 transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="p-1.5 rounded-lg text-brand-200 hover:text-white hover:bg-brand-700/60 transition"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
            {messages.map((msg) => {
              const isUser = msg.role === "user";
              return (
                <div
                  key={msg.id}
                  className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm text-xs ${
                      isUser
                        ? "bg-brand-700 text-white rounded-br-none"
                        : "bg-white text-slate-800 border border-slate-200/80 rounded-bl-none"
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      <div className="prose-xs">{renderFormattedContent(msg.content)}</div>
                    )}

                    {/* Citations / Links */}
                    {!isUser && msg.citations && msg.citations.length > 0 && (
                      <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap gap-1">
                        <span className="text-[10px] font-semibold text-slate-400 block w-full mb-0.5">
                          Referenced in PermitGraph:
                        </span>
                        {msg.citations.map((c) => (
                          <Link
                            key={c.id}
                            to={c.url}
                            onClick={() => setIsOpen(false)}
                            className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-brand-50 text-brand-700 hover:bg-brand-100 border border-brand-200 transition"
                          >
                            📄 {c.title}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-1 px-1">
                    {msg.timestamp}
                    {msg.provider && msg.provider !== "system" && (
                      <span className="ml-1 text-[9px] text-slate-400">
                        • {msg.provider === "gemini" ? "Gemini" : msg.provider === "ollama" ? "Ollama" : "Rules"}
                      </span>
                    )}
                  </span>
                </div>
              );
            })}

            {loading && (
              <div className="flex items-center space-x-2 bg-white border border-slate-200 px-3.5 py-2.5 rounded-2xl rounded-bl-none shadow-sm max-w-[65%]">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 rounded-full bg-brand-600 animate-bounce"></div>
                  <div className="w-2 h-2 rounded-full bg-brand-600 animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-2 h-2 rounded-full bg-brand-600 animate-bounce [animation-delay:0.4s]"></div>
                </div>
                <span className="text-xs text-slate-500 font-medium">Analyzing statutes...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Suggestion Chips */}
          {suggestions.length > 0 && (
            <div className="p-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  disabled={loading}
                  onClick={() => handleSend(sug)}
                  className="shrink-0 text-[11px] bg-slate-100 hover:bg-brand-50 hover:text-brand-700 text-slate-600 px-2.5 py-1 rounded-full border border-slate-200 hover:border-brand-300 transition text-left"
                >
                  💡 {sug}
                </button>
              ))}
            </div>
          )}

          {/* Input Form */}
          <div className="p-2.5 bg-white border-t border-slate-200 shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center space-x-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="Ask about approvals, MAITRI rules, CTE..."
                disabled={loading}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 focus:bg-white text-slate-800 placeholder-slate-400 transition"
              />
              <button
                type="submit"
                disabled={!inputValue.trim() || loading}
                aria-label="Send query"
                className="bg-brand-700 hover:bg-brand-800 disabled:bg-slate-300 text-white p-2 rounded-xl transition shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>
            </form>
            <p className="text-[9px] text-center text-slate-400 mt-1">
              Grounded in Maharashtra statutes. Not official legal advice.
            </p>
          </div>
        </div>
      )}
    </>
  );
}
