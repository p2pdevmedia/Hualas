export default function ContactPage() {
  return (
    <div className="flex min-h-[65vh] flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm space-y-6 text-center">
        <h1 className="text-2xl font-bold tracking-tight">¡Estamos en contacto!</h1>

        <div className="space-y-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Instagram</h2>
          <a
            href="https://www.instagram.com/hualas_patagonico"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline underline-offset-4"
          >
            @hualas_patagonico
          </a>
        </div>

        <div className="space-y-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Información general</h2>
          <a
            href="mailto:Info@clubhualas.com.ar"
            className="text-primary hover:text-primary/80 underline underline-offset-4"
          >
            Info@clubhualas.com.ar
          </a>
        </div>

        <div className="space-y-1">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tesorería</h2>
          <a
            href="mailto:tesoreria@clubhualas.com.ar"
            className="text-primary hover:text-primary/80 underline underline-offset-4"
          >
            tesoreria@clubhualas.com.ar
          </a>
        </div>
      </div>
    </div>
  );
}
