import { useState, useEffect, useMemo, useTransition } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../lib/api";
import type { RegulatorySearchResponse, RegulatorySearchResult, SearchEntityType } from "../lib/types";

const POPULAR_SUGGESTIONS = [
  { labelEn: "MAITRI Single Window", labelMr: "एकल खिडकी अर्ज (MAITRI)", query: "MAITRI Single Window" },
  { labelEn: "Joint Inspection (§16)", labelMr: "संयुक्त तपासणी (कलम १६)", query: "संयुक्त तपासणी" },
  { labelEn: "Consent to Establish (MPCB)", labelMr: "प्रदूषण नियंत्रण संमती (MPCB)", query: "Consent to Establish" },
  { labelEn: "Factory License (DISH)", labelMr: "कारखाना परवाना (DISH)", query: "कारखाना परवाना" },
  { labelEn: "MIDC Plot Allotment", labelMr: "एमआयडीसी जमीन वाटप", query: "MIDC Plot Allotment" },
  { labelEn: "Online Wizard Module (§20)", labelMr: "ऑनलाइन विझार्ड मॉड्यूल", query: "Online Wizard Module" },
  { labelEn: "Water & Air Act Clearances", labelMr: "जल व वायू प्रदूषण संमती", query: "Water Act Air Act" },
  { labelEn: "Contract Labour Registration", labelMr: "कंत्राटी कामगार नोंदणी", query: "Contract Labour" },
];

const ENTITY_CONFIG: Record<
  SearchEntityType,
  { labelEn: string; labelMr: string; icon: string; badgeClass: string }
> = {
  act: {
    labelEn: "Acts & Statutes",
    labelMr: "अधिनियम",
    icon: "🏛️",
    badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  section: {
    labelEn: "Statutory Sections",
    labelMr: "कलमे",
    icon: "📜",
    badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
  },
  rule: {
    labelEn: "Rules-as-Code",
    labelMr: "नियम-संहिता",
    icon: "⚙️",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  approval: {
    labelEn: "Approvals & Permits",
    labelMr: "मंजुऱ्या व परवाने",
    icon: "📋",
    badgeClass: "bg-amber-50 text-amber-700 border-amber-200",
  },
  source_document: {
    labelEn: "Source Gazettes",
    labelMr: "मूळ राजपत्र",
    icon: "📄",
    badgeClass: "bg-purple-50 text-purple-700 border-purple-200",
  },
};

export default function SearchRegulationsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get("q") || "";

  const [query, setQuery] = useState(initialQuery);
  const [activeLang, setActiveLang] = useState<"all" | "en" | "mr">("all");
  const [selectedEntity, setSelectedEntity] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchData, setSearchData] = useState<RegulatorySearchResponse | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  // Execute Search against API
  const performSearch = async (searchTerm: string, entityFilter: string, statusFilter: string) => {
    if (!searchTerm.trim()) {
      setSearchData(null);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set("q", searchTerm.trim());
      if (entityFilter !== "all") {
        params.set("entity_types", entityFilter);
      }
      if (statusFilter !== "ALL") {
        params.set("verification_status", statusFilter);
      }

      const res = await api.get<RegulatorySearchResponse>(`/api/v1/search?${params.toString()}`);
      setSearchData(res);
    } catch (err: any) {
      setError(err?.message || "Failed to execute regulatory search.");
    } finally {
      setLoading(false);
    }
  };

  // Sync state with URL params
  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery, selectedEntity, selectedStatus);
    }
  }, []);

  const handleSearchSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    startTransition(() => {
      setSearchParams({ q: query.trim() });
      performSearch(query, selectedEntity, selectedStatus);
    });
  };

  const handleQuickTopicClick = (term: string) => {
    setQuery(term);
    setSearchParams({ q: term });
    performSearch(term, selectedEntity, selectedStatus);
  };

  const handleEntityChange = (entityKey: string) => {
    setSelectedEntity(entityKey);
    if (query.trim()) {
      performSearch(query, entityKey, selectedStatus);
    }
  };

  const handleStatusChange = (statusKey: string) => {
    setSelectedStatus(statusKey);
    if (query.trim()) {
      performSearch(query, selectedEntity, statusKey);
    }
  };

  const handleCopyCitation = (item: RegulatorySearchResult) => {
    const citationText = `${item.citation.official_reference} — ${item.citation.act_title} (${item.citation.jurisdiction}). Backed by ${item.citation.authority || "State Authority"}.`;
    navigator.clipboard.writeText(citationText);
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  // Client-side language filtering if requested
  const filteredItems = useMemo(() => {
    if (!searchData?.items) return [];
    if (activeLang === "all") return searchData.items;
    if (activeLang === "mr") {
      return searchData.items.filter(
        (i) => i.language_detected === "mr" || i.title_mr || i.tags?.includes("bilingual")
      );
    }
    return searchData.items.filter((i) => i.language_detected === "en" || !i.title_mr);
  }, [searchData, activeLang]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col gap-2 border-b border-slate-200 pb-5 md:flex-row md:items-end md:justify-between">
        <div>
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center rounded-md bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700 ring-1 ring-brand-700/10">
              Statutory Feature #8
            </span>
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
              ● Bilingual Engine Active (English / मराठी)
            </span>
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Search Across Regulations <span className="text-slate-400 font-normal">/</span>{" "}
            <span className="text-brand-700 font-serif font-semibold">अधिनियम शोध</span>
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Full-text statutory intelligence across Acts, sections, rules-as-code, approvals, and official gazettes
            with verified citations.
          </p>
        </div>

        {/* Language Filter Pill Selector */}
        <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 shadow-xs">
          <button
            onClick={() => setActiveLang("all")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              activeLang === "all"
                ? "bg-brand-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🌐 All Languages (सर्व)
          </button>
          <button
            onClick={() => setActiveLang("en")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              activeLang === "en"
                ? "bg-brand-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🇬🇧 English
          </button>
          <button
            onClick={() => setActiveLang("mr")}
            className={`rounded-md px-3 py-1 text-xs font-medium transition ${
              activeLang === "mr"
                ? "bg-brand-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            🇮🇳 मराठी (Marathi)
          </button>
        </div>
      </div>

      {/* Main Search Box */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative flex items-center">
          <span className="pointer-events-none absolute left-4 text-slate-400 text-lg">🔍</span>
          <input
            id="regulation-search-input"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search keywords, Acts, sections or terms in English or Marathi (उदा. 'कलम १६', 'MAITRI', 'प्रदूषण', 'inspection', 'कारखाना')..."
            className="w-full rounded-xl border border-slate-300 bg-slate-50/50 py-3.5 pl-12 pr-28 text-base text-slate-900 placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:outline-none focus:ring-4 focus:ring-brand-500/10 transition shadow-inner"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery("");
                setSearchData(null);
                setSearchParams({});
              }}
              className="absolute right-24 text-xs font-medium text-slate-400 hover:text-slate-600 p-1"
            >
              Clear
            </button>
          )}
          <button
            type="submit"
            disabled={loading}
            className="absolute right-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </form>

        {/* Popular Bilingual Quick Helper Chips */}
        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mr-1">
            Quick Topics (जलद विषय):
          </span>
          {POPULAR_SUGGESTIONS.map((s) => (
            <button
              key={s.query}
              type="button"
              onClick={() => handleQuickTopicClick(s.query)}
              className="inline-flex items-center rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs text-slate-700 hover:border-brand-300 hover:bg-brand-50/60 hover:text-brand-800 transition"
            >
              <span>{s.labelEn}</span>
              <span className="mx-1 text-slate-300">·</span>
              <span className="font-serif text-slate-500">{s.labelMr}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Entity Type Filter Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            onClick={() => handleEntityChange("all")}
            className={`rounded-full px-3 py-1 text-xs font-medium transition ${
              selectedEntity === "all"
                ? "bg-slate-900 text-white shadow-xs"
                : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Entities {searchData ? `(${searchData.total_matches})` : ""}
          </button>

          {(Object.keys(ENTITY_CONFIG) as SearchEntityType[]).map((key) => {
            const conf = ENTITY_CONFIG[key];
            const count = searchData?.counts_by_type?.[key] ?? 0;
            const isSelected = selectedEntity === key;
            return (
              <button
                key={key}
                onClick={() => handleEntityChange(key)}
                className={`inline-flex items-center space-x-1.5 rounded-full px-3 py-1 text-xs font-medium transition ${
                  isSelected
                    ? "bg-slate-900 text-white shadow-xs"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                <span>{conf.icon}</span>
                <span>{conf.labelEn}</span>
                {searchData && <span className="opacity-70 font-mono">({count})</span>}
              </button>
            );
          })}
        </div>

        {/* Verification Status Filter */}
        <div className="flex items-center space-x-2">
          <label htmlFor="status-filter" className="text-xs font-medium text-slate-500">
            Verification:
          </label>
          <select
            id="status-filter"
            value={selectedStatus}
            onChange={(e) => handleStatusChange(e.target.value)}
            className="rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs text-slate-700 shadow-2xs focus:border-brand-500 focus:outline-none"
          >
            <option value="ALL">All Statuses (सर्व स्थिती)</option>
            <option value="VERIFIED">✅ Verified Only (अधिकृत राजपत्र)</option>
            <option value="CANDIDATE">📝 Candidate (प्रलंबित तपासणी)</option>
            <option value="SYNTHETIC">📦 Reference Catalog</option>
          </select>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <strong>Search Error:</strong> {error}
        </div>
      )}

      {/* Result Metrics Banner */}
      {searchData && !loading && (
        <div className="rounded-xl border border-slate-200 bg-linear-to-r from-slate-50 via-white to-slate-50 p-4 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-slate-800">
              Found {filteredItems.length} result{filteredItems.length === 1 ? "" : "s"}
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">
              Query: <code className="bg-slate-100 px-1 py-0.5 rounded text-slate-700 font-mono font-medium">"{searchData.query}"</code>
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span className="text-xs text-slate-500">Execution: {searchData.execution_time_ms} ms</span>
            {searchData.detected_language === "mr" && (
              <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800 border border-amber-200">
                🇮🇳 Marathi Query Recognized (मराठी शोध)
              </span>
            )}
          </div>

          {searchData.translated_query && (
            <div className="text-xs text-brand-700 font-medium bg-brand-50 px-2.5 py-1 rounded-md border border-brand-100">
              Cross-lingual Intelligence: Also matched equivalents for <strong>"{searchData.translated_query}"</strong>
            </div>
          )}
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4 py-8">
          <div className="h-28 w-full animate-pulse rounded-xl bg-slate-100" />
          <div className="h-28 w-full animate-pulse rounded-xl bg-slate-100" />
          <div className="h-28 w-full animate-pulse rounded-xl bg-slate-100" />
        </div>
      )}

      {/* Search Results List */}
      {!loading && searchData && filteredItems.length > 0 && (
        <div className="space-y-4">
          {filteredItems.map((item) => {
            const config = ENTITY_CONFIG[item.entity_type as SearchEntityType] || {
              labelEn: item.entity_type,
              labelMr: "",
              icon: "📄",
              badgeClass: "bg-slate-100 text-slate-700",
            };
            const isCopied = copiedId === item.id;
            const isVerified = item.verification.status === "VERIFIED";

            return (
              <div
                key={item.id}
                className="group rounded-xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-brand-400 hover:shadow-md"
              >
                {/* Card Top Row: Type Pill & Verification Badge */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center space-x-1 rounded-md border px-2.5 py-0.5 text-xs font-semibold ${config.badgeClass}`}
                    >
                      <span>{config.icon}</span>
                      <span>{config.labelEn}</span>
                      {config.labelMr && <span className="opacity-75">· {config.labelMr}</span>}
                    </span>

                    {item.citation.section_number && (
                      <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-mono font-medium text-slate-700">
                        § {item.citation.section_number}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center space-x-2">
                    <span
                      className={`inline-flex items-center space-x-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        isVerified
                          ? "bg-emerald-100 text-emerald-800"
                          : item.verification.status === "CANDIDATE"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-sky-100 text-sky-800"
                      }`}
                    >
                      <span>{isVerified ? "✓" : "●"}</span>
                      <span>{item.verification.badge_label}</span>
                    </span>

                    {item.verification.confidence !== null && item.verification.confidence !== undefined && (
                      <span className="text-[11px] font-mono text-slate-400">
                        {Math.round(item.verification.confidence * 100)}% conf
                      </span>
                    )}
                  </div>
                </div>

                {/* Card Title & Marathi Translation */}
                <div className="mt-3">
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-brand-700 transition">
                    {item.title}
                  </h3>

                  {item.title_mr && (
                    <p className="mt-1 font-serif text-sm font-medium text-brand-900 bg-brand-50/70 inline-block px-2 py-0.5 rounded border border-brand-100/80">
                      {item.title_mr}
                    </p>
                  )}

                  {item.subtitle && (
                    <p className="mt-1 text-xs text-slate-500 font-medium">{item.subtitle}</p>
                  )}
                </div>

                {/* Highlighted Match Snippet */}
                {item.matched_text && (
                  <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50/80 p-3 text-xs leading-relaxed text-slate-700">
                    <span className="font-semibold text-slate-500 mr-1.5 uppercase text-[10px] tracking-wider">
                      Excerpt ({item.matched_field}):
                    </span>
                    <span
                      dangerouslySetInnerHTML={{
                        __html: item.matched_text.replace(
                          /<mark>/g,
                          '<mark class="bg-amber-200 text-amber-950 font-bold px-1 rounded">'
                        ),
                      }}
                    />
                  </div>
                )}

                {/* Statutory Citation Box */}
                <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50/40 p-3 text-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-1.5">
                        <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wide">
                          Statutory Citation:
                        </span>
                        <code className="font-mono font-semibold text-slate-800">
                          {item.citation.official_reference}
                        </code>
                      </div>
                      <p className="text-slate-600">
                        {item.citation.act_title} · Authority:{" "}
                        <span className="font-medium text-slate-700">{item.citation.authority || "Government of Maharashtra"}</span>
                      </p>
                    </div>

                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleCopyCitation(item)}
                        className="inline-flex items-center rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 transition"
                      >
                        {isCopied ? "✓ Copied!" : "📋 Copy Citation"}
                      </button>

                      {item.citation.source_url && (
                        <a
                          href={item.citation.source_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center rounded-md bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 hover:bg-brand-100 transition"
                        >
                          Source Gazette ↗
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <div className="flex flex-wrap gap-1">
                    {item.tags?.map((t) => (
                      <span
                        key={t}
                        className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono text-slate-500"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>

                  <Link
                    to={item.navigation_link}
                    className="inline-flex items-center text-xs font-bold text-brand-600 hover:text-brand-800 transition group-hover:translate-x-0.5"
                  >
                    Open Regulatory Detail →
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* No Results Found State */}
      {!loading && searchData && filteredItems.length === 0 && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <span className="text-4xl">🔍</span>
          <h3 className="mt-3 text-lg font-bold text-slate-800">No matching regulations found</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            We couldn't find matches for "{query}". Try searching with alternative terms in English or Marathi.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => handleQuickTopicClick("MAITRI Single Window")}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Search MAITRI Single Window
            </button>
            <button
              onClick={() => handleQuickTopicClick("संयुक्त तपासणी")}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Search संयुक्त तपासणी (Joint Inspection)
            </button>
            <button
              onClick={() => handleQuickTopicClick("MPCB")}
              className="rounded-md border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Search MPCB Clearances
            </button>
          </div>
        </div>
      )}

      {/* Initial Welcome & Feature Overview State */}
      {!searchData && !loading && (
        <div className="grid gap-6 md:grid-cols-3 pt-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-700 text-xl">
              🏛️
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">Multi-Index Full-Text Search</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Query simultaneously across Acts, statutory sections, rules-as-code models, approvals, and raw
              source gazettes with relevance ranking and keyword excerpts.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 text-xl">
              🇮🇳
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">Marathi & English Support</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Search natively in Marathi Devanagari script (e.g. 'कलम १६', 'एकल खिडकी', 'संमती') or in English with
              automatic cross-lingual synonym expansion.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700 text-xl">
              ⚖️
            </div>
            <h3 className="mt-3 text-sm font-bold text-slate-900">Verified Legal Citations</h3>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              Every search result is pinned with its statutory Act title, section number, governing authority, and
              verification status back to official gazettes.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
