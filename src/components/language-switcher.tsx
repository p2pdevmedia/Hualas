'use client';

import { languages, useLanguage, Language } from '@/lib/language-context';

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();

  return (
    <select
      value={language}
      onChange={(e) => setLanguage(e.target.value as Language)}
      className="bg-slate-800 text-white border-none focus:outline-none"
    >
      {Object.entries(languages).map(([code, { label, flag }]) => (
        <option key={code} value={code}>
          {flag} {label}
        </option>
      ))}
    </select>
  );
}

