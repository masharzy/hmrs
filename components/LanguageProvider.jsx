"use client";
import { createContext, useContext, useEffect, useState } from "react";

const LanguageContext = createContext({ language: "bn", toggleLanguage: () => {} });
export function LanguageProvider({ children }) {
  const [language, setLanguage] = useState("bn");
  useEffect(() => {
    try {
      const saved = localStorage.getItem("hmrs-language");
      if (saved === "en" || saved === "bn") setLanguage(saved);
    } catch {}
  }, []);
  function toggleLanguage() {
    setLanguage(current => {
      const next = current === "bn" ? "en" : "bn";
      try { localStorage.setItem("hmrs-language", next); } catch {}
      return next;
    });
  }
  return <LanguageContext.Provider value={{ language, toggleLanguage }}>{children}</LanguageContext.Provider>;
}
export function useLanguage() { return useContext(LanguageContext); }
