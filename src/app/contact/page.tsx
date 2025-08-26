export default function ContactPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 space-y-4 text-center">
      <h1 className="text-2xl font-bold">¡Estamos en contacto!</h1>
      <div>
        <h2 className="font-semibold">Instagram</h2>
        <p>
          <a
            href="https://www.instagram.com/hualas_patagonico"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 underline"
          >
            @hualas_patagonico
          </a>
        </p>
      </div>
      <div>
        <h2 className="font-semibold">Información general</h2>
        <p>
          <a
            href="mailto:Info@clubhualas.com.ar"
            className="text-blue-500 underline"
          >
            Info@clubhualas.com.ar
          </a>
        </p>
      </div>
      <div>
        <h2 className="font-semibold">Tesorería</h2>
        <p>
          <a
            href="mailto:tesoreria@clubhualas.com.ar"
            className="text-blue-500 underline"
          >
            tesoreria@clubhualas.com.ar
          </a>
        </p>
      </div>
    </div>
  );
}
