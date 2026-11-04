import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { sendChatMessage } from "../lib/api";
import type { ChatMessage, ChatResponse } from "../lib/types";
import MarkdownRenderer from "../components/MarkdownRenderer";

const SUGGESTION_CARDS = [
  {
    title: "Factory License Prerequisites",
    desc: "Trace the mandatory sequential clearance sequence in Maharashtra.",
    prompt: "I want to start a pharmaceutical manufacturing plant in Chakan MIDC, Pune. What is the strict sequential prerequisite chain to obtain a Factory License?",
    icon: "🏭",
  },
  {
    title: "MAITRI 2024 SLA Breach",
    desc: "Draft a Deemed Approval demand notice under Section 16(3).",
    prompt: "I submitted my joint inspection request under MAITRI 20 days ago and the authority failed to inspect within the statutory 15-day SLA. How do I claim deemed approval?",
    icon: "⚡",
  },
  {
    title: "MPCB CTE vs CTO Clearance",
    desc: "Explain the difference between CTE and CTO for Orange/Red industries.",
    prompt: "Can a unit start manufacturing with Consent to Establish (CTE) before obtaining Consent to Operate (CTO)? What are the legal penalties under MID Act Section 46?",
    icon: "🌿",
  },
  {
    title: "Conflicting Department NOCs",
    desc: "Resolve inter-departmental deadlocks like Fire NOC vs Water Line.",
    prompt: "MIDC requires Fire NOC before permanent water connection, but Fire Dept requires water pressure for hydrant testing. How is this statutory deadlock resolved?",
    icon: "⚖️",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<{ [id: string]: "up" | "down" }>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
        .slice(-8)
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
    } catch {
      const errorMsg: ChatMessage = {
        id: "msg-" + (Date.now() + 1),
        role: "assistant",
        content:
          "**Connection Error:** Unable to reach the PermitGraph intelligence server. Please ensure the backend API is running on `http://localhost:8001`.",
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        provider: "error",
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  };

  const handleCopyMessage = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleFeedback = (id: string, type: "up" | "down") => {
    setFeedbackGiven((prev) => ({ ...prev, [id]: type }));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen w-full bg-white overflow-hidden text-slate-800">
      {/* ChatGPT-style Left Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r border-slate-200 bg-[#f9f9f9] p-3 shrink-0">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <Link to="/" className="flex items-center gap-2">
            <span className="flex h-7 w-7 rounded-lg bg-emerald-600 text-white items-center justify-center font-bold text-sm shadow-xs">
              ⚡
            </span>
            <span className="font-bold text-slate-900 tracking-tight">PermitGraph</span>
          </Link>
          <Link
            to="/"
            title="Return to Dashboard"
            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 text-xs transition"
          >
            ← Exit
          </Link>
        </div>

        {/* New Chat Button */}
        <div className="py-3">
          <button
            onClick={() => setMessages([])}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs flex items-center justify-between transition"
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">＋</span>
              <span>New Consultation</span>
            </span>
            <span className="text-[10px] font-mono text-slate-400">Ctrl+K</span>
          </button>
        </div>

        {/* Preset Topics */}
        <div className="flex-1 overflow-y-auto space-y-1 py-2">
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Common Scenarios
          </span>
          {SUGGESTION_CARDS.map((card, i) => (
            <button
              key={i}
              onClick={() => handleSend(card.prompt)}
              className="w-full text-left rounded-lg px-2.5 py-2 text-xs text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition flex items-center gap-2"
            >
              <span>{card.icon}</span>
              <span className="truncate">{card.title}</span>
            </button>
          ))}
        </div>

        {/* Active Engine Card */}
        <div className="border-t border-slate-200 pt-3 space-y-2 text-[11px] text-slate-500">
          <div className="rounded-xl border border-slate-200 bg-white p-2.5 shadow-xs space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-700">Inference Engine:</span>
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <p className="font-mono text-[10px] text-brand-700">
              {activeProvider === "gemini"
                ? `Gemini API (${activeModel})`
                : activeProvider === "ollama"
                ? `Ollama (${activeModel || "llama3.2"})`
                : activeProvider === "permitgraph-rules"
                ? "PermitGraph Grounded Engine"
                : "Hybrid (Gemini / Ollama / Rules)"}
            </p>
          </div>
          <div className="flex items-center justify-between px-1 text-[10px] text-slate-400">
            <span>Problem Statement 26130</span>
            <span>Maharashtra SIH</span>
          </div>
        </div>
      </aside>

      {/* Main ChatGPT Chat Window */}
      <main className="flex-1 flex flex-col h-full bg-white relative">
        {/* Top Header */}
        <header className="h-14 border-b border-slate-200/80 px-4 sm:px-6 flex items-center justify-between shrink-0 bg-white">
          <div className="flex items-center gap-3">
            <Link to="/" className="md:hidden text-xs text-slate-500 hover:text-slate-800">
              ← Dashboard
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-900 text-sm">Regulatory Co-Pilot</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 border border-emerald-200">
                Grounded RAG
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/approvals-graph"
              className="hidden sm:inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Approval DAG ↗
            </Link>
            <Link
              to="/policy-sandbox"
              className="hidden sm:inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
            >
              Policy Sandbox ⚡
            </Link>
            <button
              onClick={() => setMessages([])}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 text-xs transition"
              title="Clear conversation"
            >
              🗑️
            </button>
          </div>
        </header>

        {/* Message Feed Area */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.length === 0 ? (
              /* ChatGPT Initial Welcome Screen */
              <div className="pt-8 sm:pt-16 pb-6 text-center space-y-8 animate-in fade-in duration-300">
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    What statutory guidance do you need?
                  </h1>
                  <p className="max-w-md mx-auto text-xs sm:text-sm text-slate-500 leading-relaxed">
                    PermitGraph answers queries on Maharashtra industrial permissions, MAITRI Act 2023, MPCB environmental compliance, and clearance dependencies.
                  </p>
                </div>

                {/* 4 ChatGPT Prompt Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-2xl mx-auto">
                  {SUGGESTION_CARDS.map((card, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(card.prompt)}
                      className="group rounded-2xl border border-slate-200 bg-white p-3.5 hover:border-emerald-500 hover:bg-emerald-50/30 shadow-xs transition duration-150 text-left"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{card.icon}</span>
                        <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-700">
                          {card.title}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                        {card.desc}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              /* Message List in ChatGPT Style */
              messages.map((msg) => {
                const isUser = msg.role === "user";
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 sm:gap-4 ${isUser ? "justify-end" : "justify-start"} animate-in fade-in duration-200`}
                  >
                    {!isUser && (
                      <div className="flex h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white items-center justify-center font-bold text-xs shadow-xs shrink-0 mt-0.5">
                        ⚡
                      </div>
                    )}

                    <div
                      className={`relative group ${
                        isUser
                          ? "rounded-3xl bg-[#f4f4f4] px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm text-slate-900 max-w-[85%] border border-slate-200/60 shadow-xs leading-relaxed"
                          : "flex-1 min-w-0 text-slate-800 text-xs sm:text-sm leading-relaxed"
                      }`}
                    >
                      {/* Assistant Header info */}
                      {!isUser && (
                        <div className="flex items-center justify-between mb-1.5 pb-1 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-xs text-slate-900">
                              PermitGraph Co-Pilot
                            </span>
                            {msg.provider && msg.provider !== "system" && (
                              <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[9px] text-slate-500 uppercase">
                                {msg.provider === "gemini"
                                  ? msg.model || "Gemini Flash"
                                  : msg.provider === "ollama"
                                  ? msg.model || "Ollama Local"
                                  : "Verified Rules"}
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-slate-400">{msg.timestamp}</span>
                        </div>
                      )}

                      {/* Message Content */}
                      {isUser ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div className="prose-xs">
                          <MarkdownRenderer content={msg.content} />
                        </div>
                      )}

                      {/* Assistant Citations & Action Bar */}
                      {!isUser && (
                        <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                          {/* Citations */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-slate-400 mr-1">
                                Statutes:
                              </span>
                              {msg.citations.map((c) => (
                                <Link
                                  key={c.id}
                                  to={c.url}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 transition"
                                >
                                  📄 {c.title}
                                </Link>
                              ))}
                            </div>
                          )}

                          {/* ChatGPT-style Action Bar */}
                          <div className="flex items-center gap-1 text-slate-400 text-xs ml-auto">
                            <button
                              onClick={() => handleCopyMessage(msg.id, msg.content)}
                              className="rounded p-1 hover:bg-slate-100 hover:text-slate-700 transition flex items-center gap-1 text-[11px]"
                              title="Copy response to clipboard"
                            >
                              {copiedId === msg.id ? (
                                <span className="text-emerald-600 font-bold">✓ Copied</span>
                              ) : (
                                <span>📋 Copy</span>
                              )}
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.id, "up")}
                              className={`rounded p-1 hover:bg-slate-100 transition ${
                                feedbackGiven[msg.id] === "up" ? "text-emerald-600" : "hover:text-slate-700"
                              }`}
                              title="Helpful response"
                            >
                              👍
                            </button>
                            <button
                              onClick={() => handleFeedback(msg.id, "down")}
                              className={`rounded p-1 hover:bg-slate-100 transition ${
                                feedbackGiven[msg.id] === "down" ? "text-rose-600" : "hover:text-slate-700"
                              }`}
                              title="Unhelpful response"
                            >
                              👎
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            {/* Loading / Thinking State */}
            {loading && (
              <div className="flex gap-3 sm:gap-4 items-start">
                <div className="flex h-8 w-8 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 text-white items-center justify-center font-bold text-xs shadow-xs shrink-0 animate-pulse">
                  ⚡
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-xs flex items-center gap-2.5">
                  <div className="flex space-x-1">
                    <div className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce"></div>
                    <div className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.2s]"></div>
                    <div className="h-2 w-2 rounded-full bg-emerald-600 animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <span className="text-xs text-slate-500 font-medium">
                    Consulting Maharashtra statutes &amp; dependency DAG...
                  </span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Sticky ChatGPT Input Footer */}
        <footer className="p-4 bg-white border-t border-slate-100 shrink-0">
          <div className="max-w-3xl mx-auto">
            {/* Input Capsule */}
            <div className="relative rounded-3xl border border-slate-300 bg-[#f4f4f4] focus-within:border-slate-500 focus-within:bg-white focus-within:shadow-md transition duration-150 p-2 sm:p-2.5 flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask PermitGraph Co-Pilot about approvals, MAITRI rules, CTE vs CTO, deemed approval..."
                disabled={loading}
                rows={1}
                className="flex-1 max-h-32 min-h-[38px] resize-none bg-transparent px-3 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none leading-relaxed"
              />

              <button
                onClick={() => handleSend()}
                disabled={!inputValue.trim() || loading}
                aria-label="Send query"
                className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-slate-900 hover:bg-emerald-600 disabled:bg-slate-300 text-white flex items-center justify-center shadow-xs transition duration-150 shrink-0 cursor-pointer disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </div>

            {/* Disclaimer */}
            <p className="mt-2 text-[10px] text-center text-slate-400">
              PermitGraph Regulatory Co-Pilot can make mistakes. Verify critical actions with the Maharashtra Gazette &amp; MAITRI.
            </p>
          </div>
        </footer>
      </main>
    </div>
  );
}
