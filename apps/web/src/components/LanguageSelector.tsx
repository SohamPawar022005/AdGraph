import { useState, useEffect, useRef } from "react";
import {
  SUPPORTED_LANGUAGES,
  getSavedLanguage,
  initGoogleTranslate,
  changeLanguage,
  type LanguageOption,
} from "../lib/googleTranslate";

interface LanguageSelectorProps {
  compact?: boolean;
  fullWidth?: boolean;
  dropUp?: boolean;
}

export default function LanguageSelector({
  compact = false,
  fullWidth = false,
  dropUp = false,
}: LanguageSelectorProps) {
  const [selectedCode, setSelectedCode] = useState<string>("en");
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initGoogleTranslate();
    setSelectedCode(getSavedLanguage());

    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const currentLang =
    SUPPORTED_LANGUAGES.find((l) => l.code === selectedCode) || SUPPORTED_LANGUAGES[0];

  const handleSelect = (lang: LanguageOption) => {
    setSelectedCode(lang.code);
    setIsOpen(false);
    changeLanguage(lang.code);
  };

  return (
    <div
      className={`relative notranslate ${fullWidth ? "w-full" : "inline-block text-left"}`}
      ref={dropdownRef}
      translate="no"
    >
      {/* Dropdown Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center rounded-lg border border-slate-200 bg-white shadow-xs hover:bg-slate-50 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-1 transition text-slate-700 ${
          fullWidth ? "w-full justify-between px-3 py-2 text-xs" : ""
        } ${compact ? "px-2 py-1.5 text-xs justify-center" : "gap-2 px-3 py-1.5 text-xs"}`}
        title="Select website language / भाषा निवडा"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2 truncate">
          {/* Globe Icon */}
          <svg
            className="w-3.5 h-3.5 text-brand-600 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9"
            />
          </svg>

          <span className="font-medium text-slate-800 flex items-center gap-1.5 truncate">
            <span>{currentLang.flag}</span>
            {!compact && <span className="truncate">{currentLang.nativeName}</span>}
          </span>
        </div>

        {/* Dropdown Chevron Arrow */}
        {!compact && (
          <svg
            className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 shrink-0 ${
              isOpen ? "rotate-180 text-brand-600" : ""
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className={`absolute left-0 w-60 rounded-xl border border-slate-200 bg-white shadow-2xl z-50 py-1.5 animate-in fade-in zoom-in-95 duration-150 ${
            dropUp ? "bottom-full mb-1.5" : "top-full mt-1.5"
          }`}
        >
          <div className="px-3 py-1.5 border-b border-slate-100 text-[11px] font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
            <span>Language / भाषा</span>
            <span className="text-[10px] text-brand-600 font-normal">मराठी / हिन्दी</span>
          </div>

          <div className="max-h-60 overflow-y-auto py-1">
            {SUPPORTED_LANGUAGES.map((lang) => {
              const isSelected = lang.code === selectedCode;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => handleSelect(lang)}
                  className={`w-full text-left px-3 py-1.5 text-xs flex items-center justify-between transition ${
                    isSelected
                      ? "bg-brand-50 text-brand-700 font-semibold"
                      : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="text-sm shrink-0">{lang.flag}</span>
                    <span className="truncate">{lang.nativeName}</span>
                    <span className="text-[11px] text-slate-400 truncate">({lang.name})</span>
                  </div>

                  {isSelected && (
                    <svg
                      className="w-4 h-4 text-brand-600 shrink-0"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2.5"
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </button>
              );
            })}
          </div>

          <div className="px-3 py-1.5 border-t border-slate-100 bg-slate-50/70 text-[10px] text-slate-500 rounded-b-xl flex items-center justify-between">
            <span>Free Google Translate</span>
            <span className="text-emerald-600 font-medium">Active</span>
          </div>
        </div>
      )}
    </div>
  );
}
