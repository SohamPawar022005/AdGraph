import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { sendChatMessage } from "../lib/api";
import type { ChatMessage, ChatResponse } from "../lib/types";
import MarkdownRenderer from "./MarkdownRenderer";

const INITIAL_SUGGESTIONS = [
  "What are the prerequisites for Factory License?",
  "Explain deemed approvals under MAITRI Act 2023",
  "Can I start manufacturing on CTE without CTO?",
  "What happens if joint inspection exceeds 15 days?",
];

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome-1",
      role: "assistant",
      content:
        "Hello! I am your **PermitGraph Regulatory Co-Pilot**.\n\n" +
        "I provide statutory intelligence for Maharashtra industrial clearances, the **MAITRI Act 2023**, and the **MID Act 1961**.\n\n" +
        "Ask a regulatory question below or pick a prompt to begin:",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      provider: "system",
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>(INITIAL_SUGGESTIONS);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

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
        provider: res.provider,
        model: res.model,
        citations: res.citations,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.suggestions && res.suggestions.length > 0) {
        setSuggestions(res.suggestions);
      }
    } catch {
      const errorMsg: ChatMessage = {
        id: "msg-" + (Date.now() + 1),
        role: "assistant",
        content:
          "**Connection Error:** Unable to connect to PermitGraph API service. Please verify backend status.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        provider: "error",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClear = () => {
    setMessages([
      {
        id: "welcome-1",
        role: "assistant",
        content:
          "Hello! I am your **PermitGraph Regulatory Co-Pilot**.\n\n" +
          "Ask a question below or choose a suggested topic to get started:",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        provider: "system",
      },
    ]);
  };

  return (
    <>
      {/* Floating Trigger Button */}
      {!isOpen && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center space-x-2">
          <button
            onClick={() => setIsOpen(true)}
            aria-label="Open PermitGraph AI Co-Pilot"
            className="flex items-center space-x-2.5 bg-slate-900 hover:bg-emerald-700 text-white px-4 py-3 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5 group focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
          >
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-sm font-semibold tracking-wide flex items-center gap-1.5">
              <span>⚡</span>
              <span>Regulatory Co-Pilot</span>
            </span>
          </button>
        </div>
      )}

      {/* ChatGPT-style Floating / Expanded Modal */}
      {isOpen && (
        <div
          className={`fixed z-50 bg-white rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in fade-in duration-200 ${
            isExpanded
              ? "inset-4 sm:inset-10"
              : "bottom-6 right-6 w-[440px] max-w-[calc(100vw-2rem)] h-[640px] max-h-[calc(100vh-4rem)]"
          }`}
        >
          {/* Header */}
          <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
            <div className="flex items-center space-x-2.5">
              <div className="flex h-7 w-7 rounded-lg bg-gradient-to-tr from-emerald-600 to-teal-500 text-white items-center justify-center font-bold text-xs shadow-xs">
                ⚡
              </div>
              <div>
                <h3 className="text-xs sm:text-sm font-bold text-slate-900 tracking-tight flex items-center gap-1.5">
                  <span>PermitGraph Co-Pilot</span>
                  <span className="rounded bg-emerald-100 text-emerald-800 text-[9px] px-1.5 py-0.2 font-mono font-bold">
                    RAG
                  </span>
                </h3>
                <p className="text-[10px] text-slate-500 font-mono">
                  {activeProvider === "gemini"
                    ? `Gemini (${activeModel})`
                    : activeProvider === "ollama"
                    ? `Ollama (${activeModel || "llama3.2"})`
                    : "Verified Rules Engine"}
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-1">
              <Link
                to="/chat"
                onClick={() => setIsOpen(false)}
                title="Open Dedicated ChatGPT Page"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs transition"
              >
                ↗ Full Page
              </Link>
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                title={isExpanded ? "Collapse view" : "Expand view"}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 text-xs transition"
              >
                {isExpanded ? "🗗" : "🗖"}
              </button>
              <button
                onClick={handleClear}
                title="Clear conversation"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
              >
                🗑️
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Minimize chat"
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition text-sm"
              >
                ✕
              </button>
            </div>
          </div>

          {/* ChatGPT-style Message Feed */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-white">
            <div className={isExpanded ? "max-w-3xl mx-auto space-y-5" : "space-y-4"}>
              {messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 sm:gap-3 ${isUser ? "justify-end" : "justify-start"}`}
                  >
                    {!isUser && (
                      <div className="flex h-7 w-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white items-center justify-center font-bold text-xs shadow-xs shrink-0 mt-0.5">
                        ⚡
                      </div>
                    )}

                    <div
                      className={`relative group ${
                        isUser
                          ? "rounded-3xl bg-[#f4f4f4] px-4 py-2.5 text-xs sm:text-sm text-slate-900 max-w-[85%] border border-slate-200/60 shadow-xs leading-relaxed"
                          : "flex-1 min-w-0 text-slate-800 text-xs sm:text-sm leading-relaxed"
                      }`}
                    >
                      {/* Assistant Top Metadata */}
                      {!isUser && (
                        <div className="flex items-center justify-between mb-1 pb-1 border-b border-slate-100 text-[10px] text-slate-400">
                          <span className="font-bold text-slate-700">PermitGraph Co-Pilot</span>
                          <span>{msg.timestamp}</span>
                        </div>
                      )}

                      {/* Content Render */}
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose-xs">
                          <MarkdownRenderer
                            content={msg.content}
                            onLinkClick={() => setIsOpen(false)}
                          />
                        </div>
                      )}

                      {/* Assistant Citations & Actions */}
                      {!isUser && (
                        <div className="mt-2.5 pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-1.5">
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {msg.citations.map((c) => (
                                <Link
                                  key={c.id}
                                  to={`/approvals-graph?highlight=${c.id}`}
                                  onClick={() => setIsOpen(false)}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 transition"
                                  title={`Inspect ${c.title} on Approval DAG`}
                                >
                                  <span>📄 {c.title}</span>
                                  <span className="text-[9px] font-mono text-emerald-600 font-bold">DAG ↗</span>
                                </Link>
                              ))}
                            </div>
                          )}

                          <div className="flex items-center gap-1 text-slate-400 text-xs ml-auto">
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.content)}
                              className="rounded p-1 hover:bg-slate-100 hover:text-slate-700 transition flex items-center gap-1 text-[10px]"
                              title="Copy response"
                            >
                              {copiedId === msg.id ? (
                                <span className="text-emerald-600 font-bold">✓ Copied</span>
                              ) : (
                                <span>📋 Copy</span>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {loading && (
                <div className="flex gap-2.5 items-center">
                  <div className="flex h-7 w-7 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white items-center justify-center font-bold text-xs shadow-xs shrink-0 animate-pulse">
                    ⚡
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-xs flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce"></div>
                      <div className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]"></div>
                      <div className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]"></div>
                    </div>
                    <span className="text-xs text-slate-500 font-medium">Analyzing statutes...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {/* Quick Suggestion Chips */}
          {suggestions.length > 0 && (
            <div className="p-2 bg-slate-50/80 border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar shrink-0">
              {suggestions.map((sug, i) => (
                <button
                  key={i}
                  disabled={loading}
                  onClick={() => handleSend(sug)}
                  className="shrink-0 text-[11px] bg-white hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 px-2.5 py-1 rounded-full border border-slate-200 hover:border-emerald-300 transition text-left shadow-2xs"
                >
                  💡 {sug}
                </button>
              ))}
            </div>
          )}

          {/* ChatGPT-style Input Capsule */}
          <div className="p-3 bg-white border-t border-slate-200 shrink-0">
            <div className={isExpanded ? "max-w-3xl mx-auto" : ""}>
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="relative rounded-3xl border border-slate-300 bg-[#f4f4f4] focus-within:border-slate-500 focus-within:bg-white focus-within:shadow-md transition duration-150 p-1.5 sm:p-2 flex items-center gap-2"
              >
                <input
                  ref={inputRef}
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="Ask about approvals, MAITRI rules, CTE vs CTO..."
                  disabled={loading}
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!inputValue.trim() || loading}
                  aria-label="Send query"
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-slate-900 hover:bg-emerald-600 disabled:bg-slate-300 text-white flex items-center justify-center shadow-xs transition shrink-0 cursor-pointer disabled:cursor-not-allowed"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                  </svg>
                </button>
              </form>
              <p className="text-[9px] text-center text-slate-400 mt-1.5">
                PermitGraph Co-Pilot is grounded in Maharashtra statutes. Verify critical filings on MAITRI.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
