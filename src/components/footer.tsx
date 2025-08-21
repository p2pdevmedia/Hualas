'use client';

import { useLanguage } from '@/lib/language-context';

export default function Footer() {
  const { t } = useLanguage();
  return (
    <footer className="flex flex-col items-center justify-center px-4 py-6 bg-slate-800 text-white text-center">
      <p className="text-2xl">💚</p>
      <p className="mt-2">
        {t('followUs')}
        <br />
        <a
          href="https://www.instagram.com/hualas_patagonico/"
          target="_blank"
          rel="noopener noreferrer"
        >
          @hualas_patagonico
        </a>
      </p>
      <p className="mt-2">
        {t('clubName')}
        <br />
        {t('clubLocation')}
      </p>
    </footer>
  );
}

