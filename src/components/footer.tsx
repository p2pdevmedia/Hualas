'use client';

export default function Footer() {
  return (
    <footer className="flex flex-col items-center justify-center px-4 py-6 bg-slate-800 text-white text-center">
      <p className="text-2xl">💚</p>
      <p className="mt-2">
        ¡Seguinos en Instagram!
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
        Club Social y Deportivo Hualas Patagónico.
        <br />
        ⛰️San Martín de los Andes, Neuquén, Patagonia Argentina. 🇦🇷
      </p>
    </footer>
  );
}
