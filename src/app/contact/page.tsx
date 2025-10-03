export default function ContactPage() {
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 text-center">
      <div className="space-y-4">
        <h1 className="text-3xl font-semibold text-slate-900">
          ¡Estamos en contacto!
        </h1>
        <p className="text-sm text-slate-500">
          Elegí el canal que prefieras y conversemos sobre próximas actividades,
          inscripciones o consultas administrativas.
        </p>
      </div>
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
          <span className="text-2xl">📸</span>
          <h2 className="text-sm font-semibold text-slate-800">Instagram</h2>
          <a
            href="https://www.instagram.com/hualas_patagonico"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            @hualas_patagonico
          </a>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
          <span className="text-2xl">✉️</span>
          <h2 className="text-sm font-semibold text-slate-800">
            Información general
          </h2>
          <a
            href="mailto:Info@clubhualas.com.ar"
            className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            Info@clubhualas.com.ar
          </a>
        </div>
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-white/60 bg-white/70 p-6 shadow-lg shadow-slate-900/5 backdrop-blur">
          <span className="text-2xl">💳</span>
          <h2 className="text-sm font-semibold text-slate-800">Tesorería</h2>
          <a
            href="mailto:tesoreria@clubhualas.com.ar"
            className="text-sm font-medium text-emerald-600 transition hover:text-emerald-700"
          >
            tesoreria@clubhualas.com.ar
          </a>
        </div>
      </div>
    </div>
  );
}
