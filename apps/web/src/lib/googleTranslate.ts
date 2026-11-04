declare global {
  interface Window {
    google?: any;
    googleTranslateElementInit?: () => void;
  }
}

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧" },
  { code: "mr", name: "Marathi", nativeName: "मराठी", flag: "🇮🇳" },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳" },
  { code: "gu", name: "Gujarati", nativeName: "ગુજરાતી", flag: "🇮🇳" },
  { code: "kn", name: "Kannada", nativeName: "ಕನ್ನಡ", flag: "🇮🇳" },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳" },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳" },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇮🇳" },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", flag: "🇮🇳" },
  { code: "ur", name: "Urdu", nativeName: "اردو", flag: "🇮🇳" },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪" },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷" },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸" },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵" },
];

const SCRIPT_ID = "google-translate-script";
const COOKIE_NAME = "googtrans";

export function getSavedLanguage(): string {
  const local = localStorage.getItem("permitgraph_lang");
  if (local) return local;

  // Check cookie
  const match = document.cookie.match(new RegExp("(^| )" + COOKIE_NAME + "=([^;]+)"));
  if (match) {
    const parts = decodeURIComponent(match[2]).split("/");
    const code = parts[parts.length - 1];
    if (code) return code;
  }
  return "en";
}

export function initGoogleTranslate(): void {
  // Sync cookie with saved language prior to Google script initialization
  const saved = getSavedLanguage();
  const host = window.location.hostname;
  if (saved && saved !== "en") {
    const cookieVal = `/auto/${saved}`;
    document.cookie = `${COOKIE_NAME}=${cookieVal}; path=/;`;
    document.cookie = `${COOKIE_NAME}=${cookieVal}; path=/; domain=${host};`;
  }

  if (document.getElementById(SCRIPT_ID)) return;

  window.googleTranslateElementInit = () => {
    if (window.google?.translate?.TranslateElement) {
      new window.google.translate.TranslateElement(
        {
          pageLanguage: "en",
          includedLanguages: SUPPORTED_LANGUAGES.map((l) => l.code).join(","),
          autoDisplay: false,
          layout: window.google.translate.TranslateElement.InlineLayout?.SIMPLE || 0,
        },
        "google_translate_element"
      );
    }
  };

  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.type = "text/javascript";
  script.async = true;
  script.src = "//translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
  document.body.appendChild(script);
}

export function changeLanguage(langCode: string): void {
  const host = window.location.hostname;
  localStorage.setItem("permitgraph_lang", langCode);

  if (langCode === "en") {
    // Clear cookies across all potential domains
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${host};`;
    if (host !== "localhost" && host.includes(".")) {
      const rootDomain = host.substring(host.indexOf("."));
      document.cookie = `${COOKIE_NAME}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${rootDomain};`;
    }

    const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
    if (combo) {
      combo.value = "";
      combo.dispatchEvent(new Event("change"));
    }
    window.location.reload();
    return;
  }

  // Non-English language: set cookie
  const cookieVal = `/auto/${langCode}`;
  document.cookie = `${COOKIE_NAME}=${cookieVal}; path=/;`;
  document.cookie = `${COOKIE_NAME}=${cookieVal}; path=/; domain=${host};`;
  if (host !== "localhost" && host.includes(".")) {
    const rootDomain = host.substring(host.indexOf("."));
    document.cookie = `${COOKIE_NAME}=${cookieVal}; path=/; domain=${rootDomain};`;
  }

  // Attempt dynamic trigger via combo box
  const combo = document.querySelector(".goog-te-combo") as HTMLSelectElement | null;
  if (combo) {
    combo.value = langCode;
    combo.dispatchEvent(new Event("change"));
  } else {
    window.location.reload();
  }
}
