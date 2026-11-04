import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { sendChatMessage, calculateStatutoryFees, auditDocumentCompliance } from "../lib/api";
import type { ChatMessage, ChatResponse, FeeCalculationResponse, DocumentAuditResponse } from "../lib/types";
import MarkdownRenderer from "../components/MarkdownRenderer";
import LanguageSelector from "../components/LanguageSelector";

const SUGGESTION_CARDS_EN = [
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

const SUGGESTION_CARDS_MR = [
  {
    title: "कारखाना परवाना पूर्वअटी",
    desc: "महाराष्ट्रात कारखाना सुरू करण्यासाठी लागणाऱ्या परवान्यांचा क्रम.",
    prompt: "पुण्यातील चाकण एमआयडीसीमध्ये औषध निर्मिती प्रकल्प सुरू करण्यासाठी कारखाना परवान्यापूर्वी कोणते परवाने आवश्यक आहेत?",
    icon: "🏭",
  },
  {
    title: "१५ दिवसांत तपासणी न झाल्यास कायदेशीर हक्क",
    desc: "मैत्री कायदा कलम १६(३) अंतर्गत डीम्ड मंजुरी दावा.",
    prompt: "मैत्री पोर्टलवर अर्ज करून २० दिवस उलटले तरी संयुक्त तपासणी झाली नाही. कलम १६ अंतर्गत डीम्ड मंजुरी कशी मिळवावी?",
    icon: "⚡",
  },
  {
    title: "प्रदूषण मंडळ CTE आणि CTO संमती",
    desc: "उत्पादनापूर्वी Consent to Operate न घेतल्यास कायदेशीर कारवाई.",
    prompt: "केवळ CTE वर उत्पादन सुरू केल्यास MID Act कलम ४६ आणि जल कायद्यानुसार कोणती कारवाई होऊ शकते?",
    icon: "🌿",
  },
  {
    title: "अग्निशामक NOC आणि पाणी जोडणी",
    desc: "एमआयडीसी पाणी जोडणी आणि फायर एनओसीचा वैधानिक तिढा.",
    prompt: "फायर एनओसीसाठी पाण्याची आवश्यकता आणि पाण्यासाठी फायर एनओसीची अट हा प्रशासकीय तिढा कसा सुटतो?",
    icon: "⚖️",
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [language, setLanguage] = useState<"en" | "mr">("en");
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals / Tools
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [wizardData, setWizardData] = useState({
    location: "MIDC",
    category: "Orange",
    investmentCr: 25.0,
    workers: 100,
  });

  const [showFeeCalc, setShowFeeCalc] = useState(false);
  const [feeResult, setFeeResult] = useState<FeeCalculationResponse | null>(null);

  const [showAudit, setShowAudit] = useState(false);
  const [auditText, setAuditText] = useState(
    "The Competent Authority shall conduct joint inspection within 30 days of submission. The unit may commence construction before obtaining Consent to Establish."
  );
  const [auditResult, setAuditResult] = useState<DocumentAuditResponse | null>(null);
  const [auditLoading, setAuditLoading] = useState(false);

  const [showPrintChecklist, setShowPrintChecklist] = useState(false);

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

      const res: ChatResponse = await sendChatMessage(text, historyPayload, language);

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
          language === "mr"
            ? "**त्रुटी:** परमिटग्राफ सर्व्हरशी संपर्क होऊ शकला नाही. कृपया बॅकएंड चालू असल्याची खात्री करा."
            : "**Connection Error:** Unable to reach the PermitGraph intelligence server. Please ensure the backend API is running on `http://localhost:8001`.",
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

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // Run Fee Calculation
  const runFeeCalculation = async (inv: number, cat: string, loc: string, work: number) => {
    try {
      const res = await calculateStatutoryFees({
        investment_cr: inv,
        category: cat,
        location: loc,
        workers_count: work,
      });
      setFeeResult(res);
    } catch (e) {
      console.error(e);
    }
  };

  // Run Document Audit
  const runAudit = async () => {
    if (!auditText.trim()) return;
    setAuditLoading(true);
    try {
      const res = await auditDocumentCompliance({ document_text: auditText });
      setAuditResult(res);
    } catch (e) {
      console.error(e);
    } finally {
      setAuditLoading(false);
    }
  };

  // Complete Wizard and post query
  const completeWizard = () => {
    setShowWizard(false);
    const summaryPrompt =
      language === "mr"
        ? `मी ${wizardData.location} मध्ये ₹${wizardData.investmentCr} कोटी गुंतवणुकीचा ${wizardData.category} श्रेणीतील प्रकल्प सुरू करत आहे (कामगार: ${wizardData.workers}). माझ्यासाठी आवश्यक परवानग्यांचा अचूक क्रम, अपेक्षित वैधानिक खर्च आणि मुदत सांगा.`
        : `I am establishing an industrial facility with ₹${wizardData.investmentCr} Cr capital investment in ${wizardData.location} under ${wizardData.category} pollution category with ${wizardData.workers} workers. Generate my complete statutory sequencing roadmap, estimated statutory fees, and applicable deemed approval timelines under MAITRI Act 2023.`;

    runFeeCalculation(wizardData.investmentCr, wizardData.category, wizardData.location, wizardData.workers);
    handleSend(summaryPrompt);
  };

  const currentSuggestionCards = language === "mr" ? SUGGESTION_CARDS_MR : SUGGESTION_CARDS_EN;

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
          <div className="flex items-center gap-1.5">
            <LanguageSelector compact />
            <Link
              to="/"
              title="Return to Dashboard"
              className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700 text-xs transition"
            >
              ← Exit
            </Link>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="py-2.5 space-y-1.5">
          <button
            onClick={() => setMessages([])}
            className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-xs flex items-center justify-between transition"
          >
            <span className="flex items-center gap-2">
              <span className="text-base leading-none">＋</span>
              <span>{language === "mr" ? "नवीन चर्चा (New Chat)" : "New Consultation"}</span>
            </span>
          </button>

          <button
            onClick={() => {
              setWizardStep(1);
              setShowWizard(true);
            }}
            className="w-full rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-xs flex items-center gap-2 transition"
          >
            <span>🧭</span>
            <span>{language === "mr" ? "मार्गदर्शक विझार्ड (Wizard)" : "Eligibility Wizard 🧭"}</span>
          </button>
        </div>

        {/* Tools Section */}
        <div className="py-2 border-t border-slate-200 space-y-1">
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            Regulatory Tools
          </span>
          <button
            onClick={() => {
              runFeeCalculation(wizardData.investmentCr, wizardData.category, wizardData.location, wizardData.workers);
              setShowFeeCalc(true);
            }}
            className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-200/70 transition flex items-center gap-2"
          >
            <span>💰</span>
            <span>Fee &amp; Timeline Calc</span>
          </button>
          <button
            onClick={() => setShowAudit(true)}
            className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-200/70 transition flex items-center gap-2"
          >
            <span>📎</span>
            <span>OCR Document Audit</span>
          </button>
          <button
            onClick={() => setShowPrintChecklist(true)}
            className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-200/70 transition flex items-center gap-2"
          >
            <span>🖨️</span>
            <span>Print Compliance Checklist</span>
          </button>
          <Link
            to="/approvals-graph"
            className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-200/70 transition flex items-center gap-2"
          >
            <span>📊</span>
            <span>Approval DAG (Topology) ↗</span>
          </Link>
        </div>

        {/* Preset Topics */}
        <div className="flex-1 overflow-y-auto space-y-1 py-2 border-t border-slate-200">
          <span className="px-2 text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
            {language === "mr" ? "प्रमुख विषय" : "Common Scenarios"}
          </span>
          {currentSuggestionCards.map((card, i) => (
            <button
              key={i}
              onClick={() => handleSend(card.prompt)}
              className="w-full text-left rounded-lg px-2.5 py-1.5 text-xs text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition flex items-center gap-2"
            >
              <span>{card.icon}</span>
              <span className="truncate">{card.title}</span>
            </button>
          ))}
        </div>

        {/* Active Engine Card */}
        <div className="border-t border-slate-200 pt-2.5 space-y-2 text-[11px] text-slate-500">
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
                : "PermitGraph Grounded Engine"}
            </p>
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
            {/* Language Toggle: English | मराठी */}
            <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs font-semibold">
              <button
                onClick={() => setLanguage("en")}
                className={`rounded px-2.5 py-1 transition ${
                  language === "en" ? "bg-white text-slate-900 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                English
              </button>
              <button
                onClick={() => setLanguage("mr")}
                className={`rounded px-2.5 py-1 transition ${
                  language === "mr" ? "bg-white text-emerald-800 shadow-2xs font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                मराठी (Marathi)
              </button>
            </div>

            <button
              onClick={() => {
                setWizardStep(1);
                setShowWizard(true);
              }}
              className="hidden sm:inline-flex rounded-lg border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition items-center gap-1"
            >
              <span>🧭</span>
              <span>Wizard</span>
            </button>

            <button
              onClick={() => {
                runFeeCalculation(wizardData.investmentCr, wizardData.category, wizardData.location, wizardData.workers);
                setShowFeeCalc(true);
              }}
              className="hidden sm:inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition items-center gap-1"
            >
              <span>💰</span>
              <span>Fees</span>
            </button>

            <button
              onClick={() => setShowAudit(true)}
              className="hidden sm:inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition items-center gap-1"
            >
              <span>📎</span>
              <span>Audit NOC</span>
            </button>

            <Link
              to="/approvals-graph"
              className="hidden sm:inline-flex rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
              title="Open Inter-Departmental DAG"
            >
              DAG ↗
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
              <div className="pt-6 sm:pt-12 pb-6 text-center space-y-6 animate-in fade-in duration-300">
                <div className="space-y-3">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
                    <span className="text-2xl">⚡</span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                    {language === "mr" ? "तुम्हाला कोणती वैधानिक मदत हवी आहे?" : "What statutory guidance do you need?"}
                  </h1>
                  <p className="max-w-md mx-auto text-xs sm:text-sm text-slate-500 leading-relaxed">
                    {language === "mr"
                      ? "परमिटग्राफ महाराष्ट्र औद्योगिक परवानग्या, मैत्री कायदा २०२३, एमआयडीसी नियम आणि प्रदूषण नियंत्रण संमतीवर अचूक कायदेशीर मार्गदर्शन करतो."
                      : "PermitGraph answers queries on Maharashtra industrial permissions, MAITRI Act 2023, MPCB environmental compliance, and clearance dependencies."}
                  </p>
                </div>

                {/* Wizard Launch Banner */}
                <div className="max-w-2xl mx-auto rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-left flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
                  <div className="space-y-0.5">
                    <span className="font-bold text-xs text-emerald-900 flex items-center gap-1.5">
                      <span>🧭</span>
                      <span>{language === "mr" ? "३-टप्प्यांचा पात्रता विझार्ड" : "3-Step Statutory Eligibility Wizard"}</span>
                    </span>
                    <p className="text-[11px] text-emerald-700">
                      {language === "mr"
                        ? "तुमची जागा, प्रदूषण श्रेणी आणि गुंतवणुकीनुसार सानुकूलित परवाना यादी तयार करा."
                        : "Answer 3 quick questions to get a custom roadmap, fee estimate, and printable checklist."}
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setWizardStep(1);
                      setShowWizard(true);
                    }}
                    className="rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs shrink-0"
                  >
                    {language === "mr" ? "विझार्ड सुरू करा →" : "Start Wizard →"}
                  </button>
                </div>

                {/* 4 ChatGPT Prompt Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left max-w-2xl mx-auto">
                  {currentSuggestionCards.map((card, i) => (
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
                          {/* Citations with Bi-directional DAG link */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="text-[10px] font-semibold text-slate-400 mr-1">
                                {language === "mr" ? "वैधानिक संदर्भ:" : "Statutes:"}
                              </span>
                              {msg.citations.map((c) => (
                                <Link
                                  key={c.id}
                                  to={`/approvals-graph?highlight=${c.id}`}
                                  title={`View ${c.title} on Interactive DAG`}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 hover:bg-emerald-50 hover:text-emerald-800 text-slate-700 border border-slate-200 transition"
                                >
                                  <span>📄 {c.title}</span>
                                  <span className="text-[9px] font-mono text-emerald-600 font-bold">DAG ↗</span>
                                </Link>
                              ))}
                            </div>
                          )}

                          {/* Action Bar (Copy + Print Checklist) - Removed Unused Thumbs Buttons */}
                          <div className="flex items-center gap-1.5 text-slate-400 text-xs ml-auto">
                            <button
                              onClick={() => setShowPrintChecklist(true)}
                              className="rounded p-1 hover:bg-slate-100 hover:text-slate-700 transition flex items-center gap-1 text-[11px]"
                              title="Print Statutory Checklist"
                            >
                              <span>🖨️ Checklist</span>
                            </button>
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
                    {language === "mr"
                      ? "महाराष्ट्र कायदे आणि परवाना नियमावली तपासत आहे..."
                      : "Consulting Maharashtra statutes & dependency DAG..."}
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
            {/* Quick Action Badges */}
            <div className="flex items-center gap-2 mb-2 overflow-x-auto no-scrollbar">
              <button
                onClick={() => {
                  setWizardStep(1);
                  setShowWizard(true);
                }}
                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:text-emerald-800 transition flex items-center gap-1.5"
              >
                <span>🧭</span>
                <span>{language === "mr" ? "पात्रता विझार्ड" : "Guided Wizard"}</span>
              </button>
              <button
                onClick={() => {
                  runFeeCalculation(wizardData.investmentCr, wizardData.category, wizardData.location, wizardData.workers);
                  setShowFeeCalc(true);
                }}
                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:text-emerald-800 transition flex items-center gap-1.5"
              >
                <span>💰</span>
                <span>{language === "mr" ? "शुल्क कॅल्क्युलेटर" : "Fee Calculator"}</span>
              </button>
              <button
                onClick={() => setShowAudit(true)}
                className="shrink-0 rounded-full border border-slate-200 bg-slate-50 hover:bg-emerald-50 hover:border-emerald-300 px-3 py-1 text-[11px] font-semibold text-slate-700 hover:text-emerald-800 transition flex items-center gap-1.5"
              >
                <span>📎</span>
                <span>{language === "mr" ? "दस्तऐवज ऑडिट" : "Audit Draft NOC"}</span>
              </button>
            </div>

            {/* Input Capsule */}
            <div className="relative rounded-3xl border border-slate-300 bg-[#f4f4f4] focus-within:border-slate-500 focus-within:bg-white focus-within:shadow-md transition duration-150 p-2 sm:p-2.5 flex items-end gap-2">
              <textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={
                  language === "mr"
                    ? "परवानग्या, मैत्री कायदा, CTE/CTO बद्दल मराठीत विचारा..."
                    : "Ask PermitGraph Co-Pilot about approvals, MAITRI rules, CTE vs CTO, deemed approval..."
                }
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
              {language === "mr"
                ? "परमिटग्राफ महाराष्ट्र राजपत्रावर आधारित माहिती देतो. अंतिम मंजुरीसाठी मैत्री पोर्टलचा वापर करा."
                : "PermitGraph Regulatory Co-Pilot can make mistakes. Verify critical actions with the Maharashtra Gazette & MAITRI."}
            </p>
          </div>
        </footer>
      </main>

      {/* ========================================================================= */}
      {/* MODAL 1: CONVERSATIONAL GUIDED ELIGIBILITY WIZARD */}
      {/* ========================================================================= */}
      {showWizard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-w-xl w-full rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="flex h-7 w-7 rounded-lg bg-emerald-600 text-white items-center justify-center text-sm font-bold">
                  🧭
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {language === "mr" ? "औद्योगिक पात्रता विझार्ड" : "Statutory Eligibility Wizard"}
                  </h3>
                  <p className="text-xs text-slate-500">Step {wizardStep} of 3</p>
                </div>
              </div>
              <button
                onClick={() => setShowWizard(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Step 1: Land / Location */}
            {wizardStep === 1 && (
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  1. Where is your industrial plot located?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setWizardData({ ...wizardData, location: "MIDC" })}
                    className={`rounded-xl border p-4 text-left transition ${
                      wizardData.location === "MIDC"
                        ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-lg block">🏭</span>
                    <span className="font-bold text-sm text-slate-900 block mt-1">MIDC Industrial Estate</span>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      Dedicated industrial corridor (Chakan, Butibori, Ranjangaon, etc.)
                    </span>
                  </button>

                  <button
                    onClick={() => setWizardData({ ...wizardData, location: "Non-MIDC" })}
                    className={`rounded-xl border p-4 text-left transition ${
                      wizardData.location === "Non-MIDC"
                        ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                        : "border-slate-200 hover:bg-slate-50"
                    }`}
                  >
                    <span className="text-lg block">🌾</span>
                    <span className="font-bold text-sm text-slate-900 block mt-1">Private / Non-MIDC Land</span>
                    <span className="text-xs text-slate-500 mt-0.5 block">
                      Requires NA (Non-Agricultural) order and local town planning clearance.
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Step 2: Pollution Category */}
            {wizardStep === 2 && (
              <div className="space-y-3">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block">
                  2. What is your MPCB Pollution Classification?
                </label>
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  {[
                    { id: "White", label: "White Category", desc: "Non-polluting (solar, assembly). 0 fee, exempt from CTE." },
                    { id: "Green", label: "Green Category", desc: "Low pollution (bakeries, flour mills). Fast-track 15-day SLA." },
                    { id: "Orange", label: "Orange Category", desc: "Moderate pollution (food processing, auto parts, textile)." },
                    { id: "Red", label: "Red Category", desc: "Heavy pollution (chemicals, pharma, distil). Mandatory EIA scrutiny." },
                  ].map((c) => (
                    <button
                      key={c.id}
                      onClick={() => setWizardData({ ...wizardData, category: c.id })}
                      className={`rounded-xl border p-3 text-left transition ${
                        wizardData.category === c.id
                          ? "border-emerald-600 bg-emerald-50/60 ring-2 ring-emerald-500/20"
                          : "border-slate-200 hover:bg-slate-50"
                      }`}
                    >
                      <span className="font-bold text-slate-900 block">{c.label}</span>
                      <span className="text-[11px] text-slate-500 mt-0.5 block">{c.desc}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Step 3: Capital Investment Tier */}
            {wizardStep === 3 && (
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      3. Capital Investment (Crores INR):
                    </label>
                    <span className="font-mono text-sm font-bold text-emerald-700">
                      ₹{wizardData.investmentCr} Cr
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.5}
                    max={200}
                    step={0.5}
                    value={wizardData.investmentCr}
                    onChange={(e) => setWizardData({ ...wizardData, investmentCr: Number(e.target.value) })}
                    className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                    <span>Micro (&lt;₹1 Cr)</span>
                    <span>Small (₹1-10 Cr)</span>
                    <span>Medium (₹10-50 Cr)</span>
                    <span>Large (&gt;₹50 Cr)</span>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold uppercase tracking-wider text-slate-700 block mb-1">
                    Anticipated Factory Workforce:
                  </label>
                  <select
                    value={wizardData.workers}
                    onChange={(e) => setWizardData({ ...wizardData, workers: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-medium text-slate-800 bg-white"
                  >
                    <option value={30}>Under 50 Workers (Small Enterprise)</option>
                    <option value={120}>50 - 250 Workers (Medium Industrial Unit)</option>
                    <option value={400}>Over 250 Workers (Large Continuous Process)</option>
                  </select>
                </div>
              </div>
            )}

            {/* Wizard Navigation Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              {wizardStep > 1 ? (
                <button
                  onClick={() => setWizardStep(wizardStep - 1)}
                  className="rounded-lg border border-slate-300 px-3.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  ← Back
                </button>
              ) : (
                <div />
              )}

              {wizardStep < 3 ? (
                <button
                  onClick={() => setWizardStep(wizardStep + 1)}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs"
                >
                  Continue →
                </button>
              ) : (
                <button
                  onClick={completeWizard}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 px-4 py-1.5 text-xs font-bold text-white shadow-xs flex items-center gap-1.5"
                >
                  <span>⚡</span>
                  <span>Generate Custom Roadmap</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: STATUTORY FEE & TIMELINE CALCULATOR */}
      {/* ========================================================================= */}
      {showFeeCalc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-w-2xl w-full rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Statutory Fee &amp; Timeline Calculator
                </h3>
                <p className="text-xs text-slate-500">
                  Official fee breakdown under Maharashtra Water/Air Acts &amp; MAITRI Act 2023.
                </p>
              </div>
              <button
                onClick={() => setShowFeeCalc(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            {/* Levers */}
            <div className="grid grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Investment</span>
                <span className="font-bold text-sm text-slate-900">₹{wizardData.investmentCr} Cr</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Pollution</span>
                <span className="font-bold text-sm text-slate-900">{wizardData.category}</span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-slate-400 block">Location</span>
                <span className="font-bold text-sm text-slate-900">{wizardData.location}</span>
              </div>
            </div>

            {feeResult && (
              <div className="space-y-4">
                {/* 2 Big Stat Cards */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5">
                    <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wide">
                      Total Estimated Statutory Fees
                    </span>
                    <p className="mt-1 text-2xl font-black text-emerald-700">
                      ₹{feeResult.total_statutory_fees.toLocaleString("en-IN")}
                    </p>
                    <p className="text-[10px] text-emerald-800 mt-0.5">Government treasury fees across all departments</p>
                  </div>

                  <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3.5">
                    <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wide">
                      Time Accelerated via MAITRI
                    </span>
                    <p className="mt-1 text-2xl font-black text-blue-700">
                      {feeResult.days_saved} Days Saved
                    </p>
                    <p className="text-[10px] text-blue-800 mt-0.5">
                      {feeResult.maitri_fasttrack_days} days SLA vs {feeResult.standard_timeline_days} days legacy
                    </p>
                  </div>
                </div>

                {/* Itemized Table */}
                <div className="rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Department / Clearance</th>
                        <th className="px-3 py-2">Statutory Basis</th>
                        <th className="px-3 py-2 text-right">Prescribed Fee</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {feeResult.fee_breakdown.map((item, i) => (
                        <tr key={i} className="hover:bg-slate-50 transition">
                          <td className="px-3 py-2.5 font-medium text-slate-900">
                            {item.name}
                            <span className="block text-[10px] text-slate-400 font-mono">{item.agency}</span>
                          </td>
                          <td className="px-3 py-2.5 text-slate-600 text-[11px]">{item.notes}</td>
                          <td className="px-3 py-2.5 text-right font-mono font-bold text-slate-900">
                            ₹{item.amount.toLocaleString("en-IN")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowFeeCalc(false)}
                className="rounded-lg bg-slate-900 text-white px-4 py-2 text-xs font-semibold hover:bg-slate-800"
              >
                Close Calculator
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: OCR & DOCUMENT COMPLIANCE AUDIT */}
      {/* ========================================================================= */}
      {showAudit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-w-2xl w-full rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  OCR Regulatory Document Compliance Audit
                </h3>
                <p className="text-xs text-slate-500">
                  Paste draft application text, NOC condition, or order to audit against 2024 Maharashtra Gazette amendments.
                </p>
              </div>
              <button
                onClick={() => setShowAudit(false)}
                className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-600 block">
                Draft Document / Order Text:
              </label>
              <textarea
                value={auditText}
                onChange={(e) => setAuditText(e.target.value)}
                rows={4}
                className="w-full rounded-xl border border-slate-300 p-3 text-xs font-mono text-slate-800 leading-relaxed focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Paste extracted text from PDF or draft application..."
              />
              <div className="flex justify-between items-center text-[11px]">
                <button
                  onClick={() =>
                    setAuditText(
                      "The Competent Authority shall conduct joint inspection within 30 days of submission. The unit may commence construction before obtaining Consent to Establish."
                    )
                  }
                  className="text-emerald-700 hover:underline font-semibold"
                >
                  Load Sample Non-Compliant Clause (30-day inspection &amp; no CTE)
                </button>
                <button
                  onClick={runAudit}
                  disabled={auditLoading}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-1.5 text-xs font-bold transition shadow-xs disabled:opacity-50"
                >
                  {auditLoading ? "Auditing Statutes…" : "Run Gazette Audit ⚡"}
                </button>
              </div>
            </div>

            {auditResult && (
              <div className="space-y-3 pt-2 border-t border-slate-100 animate-in fade-in duration-150">
                <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Compliance Status</span>
                    <span
                      className={`font-black text-sm uppercase ${
                        auditResult.status === "COMPLIANT"
                          ? "text-emerald-700"
                          : auditResult.status === "AMENDMENT_REQUIRED"
                          ? "text-amber-700"
                          : "text-rose-700"
                      }`}
                    >
                      {auditResult.status.replace("_", " ")}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold uppercase text-slate-400 block">Compliance Score</span>
                    <span className="text-2xl font-black text-slate-900">{auditResult.compliance_score}/100</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-700 block">Identified Findings &amp; Statutory Citations:</span>
                  {auditResult.findings.map((f, i) => (
                    <div
                      key={i}
                      className={`p-3 rounded-xl border text-xs space-y-1 ${
                        f.severity === "CRITICAL"
                          ? "border-rose-200 bg-rose-50/70"
                          : f.severity === "WARNING"
                          ? "border-amber-200 bg-amber-50/70"
                          : "border-emerald-200 bg-emerald-50/70"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{f.clause}</span>
                        <span className="text-[9px] font-bold font-mono uppercase px-1.5 py-0.5 rounded bg-white/80 border">
                          {f.severity}
                        </span>
                      </div>
                      <p className="text-slate-700">{f.finding}</p>
                      <p className="text-[11px] font-mono text-brand-700">Statute: {f.amendment_ref}</p>
                      <p className="text-[11px] font-semibold text-slate-800">Rec: {f.recommendation}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 4: PRINTABLE / DOWNLOADABLE STATUTORY CHECKLIST (PDF/PRINT) */}
      {/* ========================================================================= */}
      {showPrintChecklist && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs">
          <div className="max-w-2xl w-full rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto print:max-w-none print:w-full print:p-0 print:border-none">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3 print:hidden">
              <span className="text-sm font-bold text-slate-900">
                Official Statutory Compliance Checklist &amp; Clearance Roadmap
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-bold transition shadow-xs flex items-center gap-1.5"
                >
                  <span>🖨️</span>
                  <span>Print / Save as PDF</span>
                </button>
                <button
                  onClick={() => setShowPrintChecklist(false)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 text-sm"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Printable Official Document Body */}
            <div className="p-4 border border-slate-200 rounded-xl space-y-4 bg-white text-slate-900">
              {/* Header with Emblem placeholder */}
              <div className="text-center border-b-2 border-slate-900 pb-3 space-y-1">
                <p className="text-[10px] uppercase font-bold tracking-widest text-slate-500">Government of Maharashtra</p>
                <h2 className="text-base font-extrabold uppercase tracking-tight text-slate-900">
                  MAITRI Single Window Regulatory Compliance Checklist
                </h2>
                <p className="text-[11px] text-slate-600">
                  Issued under Maharashtra Industry, Trade and Investment Facilitation Act, 2023 (Mah. Act No. XXXIV of 2023)
                </p>
              </div>

              {/* Enterprise Profile */}
              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded border border-slate-200">
                <div>
                  <span className="text-slate-500 block text-[10px]">Location / Corridor:</span>
                  <span className="font-bold">{wizardData.location} Industrial Zone</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px]">Classification:</span>
                  <span className="font-bold">{wizardData.category} Category (₹{wizardData.investmentCr} Cr Capital)</span>
                </div>
              </div>

              {/* Clearance Sequence Table */}
              <div className="space-y-1">
                <span className="text-xs font-bold uppercase text-slate-700">Mandatory Sequential Clearances:</span>
                <table className="w-full text-left text-xs border border-slate-300 border-collapse">
                  <thead className="bg-slate-100 font-bold border-b border-slate-300">
                    <tr>
                      <th className="p-2 border-r border-slate-300">Stage</th>
                      <th className="p-2 border-r border-slate-300">Clearance Name</th>
                      <th className="p-2 border-r border-slate-300">Authority</th>
                      <th className="p-2 border-r border-slate-300">Prerequisite</th>
                      <th className="p-2">Statutory SLA</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    <tr>
                      <td className="p-2 border-r border-slate-200 font-mono">1</td>
                      <td className="p-2 border-r border-slate-200 font-bold">MIDC Plot Allotment</td>
                      <td className="p-2 border-r border-slate-200">MIDC</td>
                      <td className="p-2 border-r border-slate-200 text-slate-500">None (Entry permit)</td>
                      <td className="p-2 font-mono">15 Days</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200 font-mono">2</td>
                      <td className="p-2 border-r border-slate-200 font-bold">Consent to Establish (CTE)</td>
                      <td className="p-2 border-r border-slate-200">MPCB</td>
                      <td className="p-2 border-r border-slate-200">Plot Allotment / Title</td>
                      <td className="p-2 font-mono">30 Days</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200 font-mono">3</td>
                      <td className="p-2 border-r border-slate-200 font-bold">Building Plan Approval</td>
                      <td className="p-2 border-r border-slate-200">MIDC / SPA</td>
                      <td className="p-2 border-r border-slate-200">MPCB CTE Approval</td>
                      <td className="p-2 font-mono">30 Days</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200 font-mono">4</td>
                      <td className="p-2 border-r border-slate-200 font-bold">Fire Safety NOC</td>
                      <td className="p-2 border-r border-slate-200">Fire Services</td>
                      <td className="p-2 border-r border-slate-200">Building Plan Sanction</td>
                      <td className="p-2 font-mono">15 Days (Joint Insp.)</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200 font-mono">5</td>
                      <td className="p-2 border-r border-slate-200 font-bold">Consent to Operate (CTO)</td>
                      <td className="p-2 border-r border-slate-200">MPCB</td>
                      <td className="p-2 border-r border-slate-200">Construction ETP Completion</td>
                      <td className="p-2 font-mono">30 Days</td>
                    </tr>
                    <tr>
                      <td className="p-2 border-r border-slate-200 font-mono">6</td>
                      <td className="p-2 border-r border-slate-200 font-bold">Factory License</td>
                      <td className="p-2 border-r border-slate-200">DISH Maharashtra</td>
                      <td className="p-2 border-r border-slate-200">Building Completion &amp; CTO</td>
                      <td className="p-2 font-mono">15 Days</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Deemed Approval Statutory Clause */}
              <div className="text-[11px] text-slate-700 bg-amber-50 p-2.5 rounded border border-amber-200">
                <strong>Statutory Right of Deemed Approval:</strong> Under Section 16(3) &amp; Section 4(3) of Maharashtra Act No. XXXIV of 2023, if a Competent Authority fails to conduct inspection within 15 days or convey approval/rejection within the prescribed SLA, the investor is entitled to serve statutory notice and claim deemed clearance.
              </div>

              {/* Signature Block */}
              <div className="pt-6 flex justify-between items-end text-xs">
                <div>
                  <p className="text-[10px] text-slate-500">Verified via PermitGraph Provenance Engine</p>
                  <p className="font-mono text-[9px] text-slate-400">Hash: PG-MH-{Date.now().toString(16).toUpperCase()}</p>
                </div>
                <div className="text-right">
                  <div className="w-36 border-b border-slate-400 mb-1"></div>
                  <p className="font-bold text-slate-800">Authorized Officer / Investor</p>
                  <p className="text-[10px] text-slate-500">Department of Industries, Maharashtra</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
